import unittest
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from fastapi import status

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.exam import Exam, ExamAssignment, ExamSession
from app.models.proctor_event import ProctorEvent
from app.core.security import create_access_token
from app.services.proctor_service import ProctorService

# Use a temporary file-based SQLite database for reliable cross-connection testing
DB_FILE = "./test_skilio.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE}"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestProctorEvents(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Clean up any leftover database file
        if os.path.exists(DB_FILE):
            try:
                os.remove(DB_FILE)
            except OSError:
                pass
        Base.metadata.create_all(bind=engine)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        if os.path.exists(DB_FILE):
            try:
                os.remove(DB_FILE)
            except OSError:
                pass

    def setUp(self):
        # Bind a session to local setup
        self.db = TestingSessionLocal()

        # Seed users
        self.teacher = User(
            name="Teacher Jane",
            email="jane@example.com",
            hashed_password="fakehashpwd",
            role="teacher",
            is_active=True,
        )
        self.student_1 = User(
            name="Student Alice",
            email="alice@example.com",
            hashed_password="fakehashpwd",
            role="student",
            is_active=True,
        )
        self.student_2 = User(
            name="Student Bob",
            email="bob@example.com",
            hashed_password="fakehashpwd",
            role="student",
            is_active=True,
        )
        self.db.add_all([self.teacher, self.student_1, self.student_2])
        self.db.commit()

        # Generate tokens
        self.token_student_1 = create_access_token(data={"sub": str(self.student_1.id)})
        self.token_student_2 = create_access_token(data={"sub": str(self.student_2.id)})
        self.headers_student_1 = {"Authorization": f"Bearer {self.token_student_1}"}
        self.headers_student_2 = {"Authorization": f"Bearer {self.token_student_2}"}

        # Seed exam
        self.exam = Exam(
            teacher_id=self.teacher.id,
            title="AI Security 101",
            subject="Computer Science",
            duration_minutes=60,
            total_marks=100,
            start_time=datetime.now(timezone.utc) - timedelta(hours=1),
            end_time=datetime.now(timezone.utc) + timedelta(hours=2),
            status="active",
        )
        self.db.add(self.exam)
        self.db.commit()

        # Seed assignments
        self.assign_1 = ExamAssignment(
            exam_id=self.exam.id,
            student_id=self.student_1.id,
            assigned_by=self.teacher.id,
            status="started",
        )
        self.assign_2 = ExamAssignment(
            exam_id=self.exam.id,
            student_id=self.student_2.id,
            assigned_by=self.teacher.id,
            status="started",
        )
        self.db.add_all([self.assign_1, self.assign_2])
        self.db.commit()

        # Seed exam sessions
        self.session_1 = ExamSession(
            exam_id=self.exam.id,
            student_id=self.student_1.id,
            assignment_id=self.assign_1.id,
            session_token="session-token-alice-123",
            status="started",
        )
        self.session_2 = ExamSession(
            exam_id=self.exam.id,
            student_id=self.student_2.id,
            assignment_id=self.assign_2.id,
            session_token="session-token-bob-456",
            status="started",
        )
        self.db.add_all([self.session_1, self.session_2])
        self.db.commit()

    def tearDown(self):
        # Clean up database tables between tests
        self.db.close()
        # Drop and recreate tables to keep tests fully isolated
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    def test_create_event_success(self):
        # Log a valid event type
        payload = {
            "session_token": "session-token-alice-123",
            "event_type": "multiple_faces_detected",
            "confidence_score": 0.95,
            "screenshot_url": "http://s3.amazonaws.com/screenshots/sc1.jpg",
            "metadata": {"faces_count": 2},
        }
        response = client.post(
            "/api/proctor/face-event",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        
        # Verify event details
        event_data = data["event"]
        self.assertEqual(event_data["event_type"], "multiple_faces_detected")
        self.assertEqual(event_data["confidence_score"], 0.95)
        self.assertEqual(event_data["screenshot_url"], "http://s3.amazonaws.com/screenshots/sc1.jpg")
        self.assertEqual(event_data["severity"], "critical")
        self.assertEqual(event_data["metadata"]["faces_count"], 2)

        # Verify risk score calculated from first event
        # Weight critical (40.0) * confidence (0.95) = 38.0
        self.assertEqual(data["session_risk_score"], 38.0)

    def test_create_event_invalid_session_token(self):
        payload = {
            "session_token": "invalid-session-token",
            "event_type": "no_face_detected",
            "confidence_score": 0.8,
        }
        response = client.post(
            "/api/proctor/face-event",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["detail"], "Exam session not found")

    def test_create_event_mismatching_student(self):
        # Alice tries to log an event for Bob's session token
        payload = {
            "session_token": "session-token-bob-456",
            "event_type": "no_face_detected",
            "confidence_score": 0.8,
        }
        response = client.post(
            "/api/proctor/face-event",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.json()["detail"],
            "Exam session does not belong to the authenticated student",
        )

    def test_validation_invalid_event_type(self):
        payload = {
            "session_token": "session-token-alice-123",
            "event_type": "looking_at_another_window",  # Not in supported list
            "confidence_score": 0.8,
        }
        response = client.post(
            "/api/proctor/face-event",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

    def test_validation_invalid_confidence_score(self):
        # confidence score > 1.0
        payload = {
            "session_token": "session-token-alice-123",
            "event_type": "no_face_detected",
            "confidence_score": 1.5,
        }
        response = client.post(
            "/api/proctor/face-event",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

        # confidence score < 0.0
        payload["confidence_score"] = -0.1
        response = client.post(
            "/api/proctor/face-event",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

    def test_severity_mapping(self):
        test_cases = [
            ("multiple_faces_detected", "critical"),
            ("face_mismatch", "critical"),
            ("no_face_detected", "high"),
            ("camera_blocked", "high"),
            ("suspicious_movement", "medium"),
            ("student_verified", "low"),
        ]
        for event_type, expected_severity in test_cases:
            payload = {
                "session_token": "session-token-alice-123",
                "event_type": event_type,
                "confidence_score": 1.0,
            }
            response = client.post(
                "/api/proctor/face-event",
                json=payload,
                headers=self.headers_student_1,
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.json()["event"]["severity"], expected_severity)

    def test_risk_score_calculation(self):
        session_id = self.session_1.id

        # Risk score starts at 0.0
        score = ProctorService.calculate_risk_score(self.db, session_id)
        self.assertEqual(score, 0.0)

        # Log high severity event (weight 25) with confidence 0.8
        # Expected: 25.0 * 0.8 = 20.0
        ev1 = ProctorEvent(
            exam_session_id=session_id,
            exam_id=self.exam.id,
            student_id=self.student_1.id,
            event_type="no_face_detected",
            confidence_score=0.8,
            severity="high",
        )
        self.db.add(ev1)
        self.db.commit()
        score = ProctorService.calculate_risk_score(self.db, session_id)
        self.assertEqual(score, 20.0)

        # Log verification event (student_verified)
        # Expected to be ignored in risk score (remains 20.0)
        ev2 = ProctorEvent(
            exam_session_id=session_id,
            exam_id=self.exam.id,
            student_id=self.student_1.id,
            event_type="student_verified",
            confidence_score=1.0,
            severity="low",
        )
        self.db.add(ev2)
        self.db.commit()
        score = ProctorService.calculate_risk_score(self.db, session_id)
        self.assertEqual(score, 20.0)

        # Log critical severity event (weight 40) with confidence 0.9
        # Expected: 20.0 + 40.0 * 0.9 = 20.0 + 36.0 = 56.0
        ev3 = ProctorEvent(
            exam_session_id=session_id,
            exam_id=self.exam.id,
            student_id=self.student_1.id,
            event_type="face_mismatch",
            confidence_score=0.9,
            severity="critical",
        )
        self.db.add(ev3)
        self.db.commit()
        score = ProctorService.calculate_risk_score(self.db, session_id)
        self.assertEqual(score, 56.0)

        # Log critical severity event (weight 40) with confidence 1.0
        # Expected score: 56.0 + 40.0 = 96.0
        ev4 = ProctorEvent(
            exam_session_id=session_id,
            exam_id=self.exam.id,
            student_id=self.student_1.id,
            event_type="multiple_faces_detected",
            confidence_score=1.0,
            severity="critical",
        )
        self.db.add(ev4)
        self.db.commit()
        score = ProctorService.calculate_risk_score(self.db, session_id)
        self.assertEqual(score, 96.0)

        # Log another event to push risk above 100
        # Expected score: 96.0 + 10.0 * 0.8 = 104.0, capped at 100.0
        ev5 = ProctorEvent(
            exam_session_id=session_id,
            exam_id=self.exam.id,
            student_id=self.student_1.id,
            event_type="suspicious_movement",
            confidence_score=0.8,
            severity="medium",
        )
        self.db.add(ev5)
        self.db.commit()
        score = ProctorService.calculate_risk_score(self.db, session_id)
        self.assertEqual(score, 100.0)

    def test_new_event_types_severity(self):
        test_cases = [
            ("phone_detected", "critical"),
            ("looking_away", "medium"),
            ("tab_switch", "medium"),
            ("fullscreen_exit", "high"),
            ("devtools_opened", "critical"),
            ("copy_paste", "high"),
            ("right_click", "low"),
            ("multiple_faces", "critical"),
            ("no_face", "high"),
        ]
        for event_type, expected_severity in test_cases:
            payload = {
                "session_token": "session-token-alice-123",
                "event_type": event_type,
                "confidence_score": 1.0,
            }
            response = client.post(
                "/api/proctor/face-event",
                json=payload,
                headers=self.headers_student_1,
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.json()["event"]["severity"], expected_severity)


    def test_analyze_frame_mock_phone(self):
        payload = {
            "session_token": "session-token-alice-123",
            "screenshot_url": "data:image/jpeg;base64,MOCK_PHONE_TEST_STRING_XXX",
        }
        response = client.post(
            "/api/proctor/analyze-frame",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["phone_detected"])
        self.assertFalse(data["looking_away"])
        self.assertFalse(data["multiple_faces"])
        self.assertFalse(data["no_face"])
        self.assertFalse(data["camera_blocked"])
        # Risk score should update: phone_detected is critical (weight 40) * confidence (0.95) = 38.0
        self.assertEqual(data["session_risk_score"], 38.0)

    def test_analyze_frame_mock_multiple_violations(self):
        payload = {
            "session_token": "session-token-alice-123",
            "screenshot_url": "data:image/jpeg;base64,MOCK_PHONE_MOCK_LOOKING_MOCK_MULTIPLE",
        }
        response = client.post(
            "/api/proctor/analyze-frame",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["phone_detected"])
        self.assertTrue(data["looking_away"])
        self.assertTrue(data["multiple_faces"])
        
        # Risk score calculations:
        # phone_detected: 40 * 0.95 = 38.0
        # looking_away: 10 * 0.85 = 8.5
        # multiple_faces_detected: 40 * 0.90 = 36.0
        # Total = 82.5
        self.assertEqual(data["session_risk_score"], 82.5)

    def test_analyze_frame_invalid_token(self):
        payload = {
            "session_token": "invalid-token",
            "screenshot_url": "data:image/jpeg;base64,NORMAL",
        }
        response = client.post(
            "/api/proctor/analyze-frame",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_proctor_event_success(self):
        payload = {
            "session_token": "session-token-alice-123",
            "event_type": "tab_switch",
            "description": "Visibility change hidden",
            "metadata": {"custom_meta": "xyz"},
        }
        response = client.post(
            "/api/proctor/events",
            json=payload,
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        
        # Verify response matches ProctorEventResponseWithRisk schema
        self.assertIn("event", data)
        self.assertIn("session_risk_score", data)
        event_data = data["event"]
        self.assertEqual(event_data["event_type"], "tab_switch")
        self.assertEqual(event_data["description"], "Visibility change hidden")
        self.assertEqual(event_data["severity"], "medium")
        self.assertEqual(event_data["metadata"]["custom_meta"], "xyz")
        self.assertEqual(event_data["exam_id"], self.exam.id)
        self.assertEqual(event_data["student_id"], self.student_1.id)

    def test_teacher_get_proctor_events_success(self):
        # Insert a proctor event first
        ev = ProctorEvent(
            exam_session_id=self.session_1.id,
            exam_id=self.exam.id,
            student_id=self.student_1.id,
            event_type="copy_paste",
            severity="high",
            description="Blocked Clipboard shortcut",
            metadata_={"test": "abc"},
        )
        self.db.add(ev)
        self.db.commit()

        # Call the teacher endpoint
        token_teacher = create_access_token(data={"sub": str(self.teacher.id)})
        headers_teacher = {"Authorization": f"Bearer {token_teacher}"}

        response = client.get(
            f"/api/teacher/exams/{self.exam.id}/proctor-events",
            headers=headers_teacher,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["event_type"], "copy_paste")
        self.assertEqual(data[0]["description"], "Blocked Clipboard shortcut")
        self.assertEqual(data[0]["severity"], "high")

    def test_teacher_get_student_proctor_events_success(self):
        # Insert proctor events for student 1 and student 2
        ev1 = ProctorEvent(
            exam_session_id=self.session_1.id,
            exam_id=self.exam.id,
            student_id=self.student_1.id,
            event_type="copy_paste",
            severity="high",
        )
        ev2 = ProctorEvent(
            exam_session_id=self.session_2.id,
            exam_id=self.exam.id,
            student_id=self.student_2.id,
            event_type="tab_switch",
            severity="medium",
        )
        self.db.add_all([ev1, ev2])
        self.db.commit()

        token_teacher = create_access_token(data={"sub": str(self.teacher.id)})
        headers_teacher = {"Authorization": f"Bearer {token_teacher}"}

        # Query only student 1 events
        response = client.get(
            f"/api/teacher/exams/{self.exam.id}/students/{self.student_1.id}/proctor-events",
            headers=headers_teacher,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["student_id"], self.student_1.id)
        self.assertEqual(data[0]["event_type"], "copy_paste")

    def test_teacher_get_proctor_events_forbidden_for_student(self):
        # Student trying to call teacher endpoint
        response = client.get(
            f"/api/teacher/exams/{self.exam.id}/proctor-events",
            headers=self.headers_student_1,
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_get_proctor_events_not_found(self):
        token_teacher = create_access_token(data={"sub": str(self.teacher.id)})
        headers_teacher = {"Authorization": f"Bearer {token_teacher}"}

        # Query non-existent exam
        response = client.get(
            "/api/teacher/exams/9999/proctor-events",
            headers=headers_teacher,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["detail"], "Exam not found")

        # Query non-existent student
        response = client.get(
            f"/api/teacher/exams/{self.exam.id}/students/9999/proctor-events",
            headers=headers_teacher,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["detail"], "Student not found")


if __name__ == "__main__":
    unittest.main()


