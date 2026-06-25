import json
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from openai import OpenAI

from app.core.config import settings
from app.models.exam import ExamSession
from app.models.proctor_event import ProctorEvent
from app.models.user import User
from app.schemas.proctor import ProctorEventCreate
from app.services.risk_service import ProctorRiskService

SEVERITY_MAP = {
    "multiple_faces_detected": "critical",
    "multiple_faces": "critical",
    "face_mismatch": "critical",
    "no_face_detected": "high",
    "no_face": "high",
    "camera_blocked": "high",
    "suspicious_movement": "medium",
    "student_verified": "low",
    "phone_detected": "critical",
    "looking_away": "medium",
    "tab_switch": "medium",
    "window_blur": "medium",
    "fullscreen_exit": "high",
    "devtools_opened": "critical",
    "copy_paste": "high",
    "right_click": "low",
}

SEVERITY_WEIGHTS = {
    "critical": 40.0,
    "high": 25.0,
    "medium": 10.0,
    "low": 0.0,
}


class ProctorService:
    @staticmethod
    def create_event(db: Session, data: ProctorEventCreate, user: User) -> ProctorEvent:
        # 1. Verify exam session token
        session = db.query(ExamSession).filter(
            ExamSession.session_token == data.session_token
        ).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam session not found",
            )

        # 2. Verify authorization: student must own the session
        if session.student_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Exam session does not belong to the authenticated student",
            )

        # 3. Store event with severity mapping
        severity = SEVERITY_MAP.get(data.event_type, "low")

        event = ProctorEvent(
            exam_session_id=session.id,
            exam_id=session.exam_id,
            student_id=session.student_id,
            event_type=data.event_type,
            confidence_score=data.confidence_score,
            screenshot_url=data.screenshot_url,
            severity=severity,
            description=data.description,
            metadata_=data.metadata,
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        ProctorRiskService.update_risk_report(db, session.id)

        return event

    @staticmethod
    def calculate_risk_score(db: Session, session_id: int) -> float:
        # Retrieve all proctor events for this session
        events = db.query(ProctorEvent).filter(
            ProctorEvent.exam_session_id == session_id
        ).all()

        total_risk = 0.0
        for event in events:
            # Skip student verification events
            if event.event_type == "student_verified":
                continue
            weight = SEVERITY_WEIGHTS.get(event.severity, 0.0)
            confidence = event.confidence_score if event.confidence_score is not None else 1.0
            total_risk += weight * confidence

        return min(100.0, round(total_risk, 2))

    @staticmethod
    def analyze_screenshot_frame(
        db: Session, session_token: str, screenshot_url: str, user: User
    ) -> dict:
        # 1. Verify session
        session = db.query(ExamSession).filter(
            ExamSession.session_token == session_token
        ).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam session not found",
            )

        if session.student_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Exam session does not belong to the authenticated student",
            )

        # 2. Extract mock settings from token or screenshot_url for testing
        phone_detected = "MOCK_PHONE" in screenshot_url or "mock_phone" in session_token
        looking_away = "MOCK_LOOKING" in screenshot_url or "mock_looking" in session_token
        multiple_faces = "MOCK_MULTIPLE" in screenshot_url or "mock_multiple" in session_token
        no_face = "MOCK_NO_FACE" in screenshot_url or "mock_no_face" in session_token
        camera_blocked = "MOCK_BLOCKED" in screenshot_url or "mock_blocked" in session_token
        description = "Analyzed via local mock proctoring rules."

        # 3. Call OpenAI Vision if configured
        if settings.OPENAI_API_KEY:
            system_prompt = (
                "You are an AI proctor monitoring an online exam. "
                "Analyze the student's webcam frame and identify any cheating or suspicious behavior. "
                "You MUST respond ONLY with a JSON object containing the following keys:\n"
                "- phone_detected: true/false (if the student is using, holding, or looking at a mobile phone or secondary device)\n"
                "- looking_away: true/false (if the student is clearly looking away from the screen, e.g. down at a desk, far left, or far right)\n"
                "- multiple_faces: true/false (if more than one person is visible)\n"
                "- no_face: true/false (if no human face is visible or camera is empty)\n"
                "- camera_blocked: true/false (if the camera is covered, blocked, or completely dark)\n"
                "- description: a short string describing what you observe (e.g., 'Everything normal', 'Student is holding a smartphone', or 'No face in frame')\n"
            )

            try:
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                # Ensure the screenshot URL format is valid
                img_url = screenshot_url
                if not img_url.startswith("data:image/"):
                    # Fallback if raw base64 is sent
                    img_url = f"data:image/jpeg;base64,{screenshot_url}"

                response = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    response_format={"type": "json_object"},
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": system_prompt},
                                {"type": "image_url", "image_url": {"url": img_url}},
                            ],
                        }
                    ],
                    max_tokens=150,
                )
                content = response.choices[0].message.content
                result = json.loads(content)
                phone_detected = bool(result.get("phone_detected", phone_detected))
                looking_away = bool(result.get("looking_away", looking_away))
                multiple_faces = bool(result.get("multiple_faces", multiple_faces))
                no_face = bool(result.get("no_face", no_face))
                camera_blocked = bool(result.get("camera_blocked", camera_blocked))
                description = str(result.get("description", "Analyzed via Vision AI"))
            except Exception as e:
                description = f"Error calling OpenAI Vision API: {str(e)}. (Fallback to heuristics)"

        # 4. Save detected events to database
        detected_violations = []
        if phone_detected:
            detected_violations.append(("phone_detected", 0.95))
        if looking_away:
            detected_violations.append(("looking_away", 0.85))
        if multiple_faces:
            detected_violations.append(("multiple_faces_detected", 0.90))
        if no_face:
            detected_violations.append(("no_face_detected", 0.95))
        if camera_blocked:
            detected_violations.append(("camera_blocked", 0.95))

        for event_type, confidence in detected_violations:
            event = ProctorEvent(
                exam_session_id=session.id,
                exam_id=session.exam_id,
                student_id=session.student_id,
                event_type=event_type,
                confidence_score=confidence,
                screenshot_url=screenshot_url[:1000] if screenshot_url else None,
                severity=SEVERITY_MAP.get(event_type, "medium"),
                description=description,
                metadata_={"description": description, "vision_analyzed": True},
            )
            db.add(event)

        if detected_violations:
            db.commit()
            ProctorRiskService.update_risk_report(db, session.id)

        # 5. Return latest risk score
        risk_score = ProctorService.calculate_risk_score(db, session.id)

        return {
            "phone_detected": phone_detected,
            "looking_away": looking_away,
            "multiple_faces": multiple_faces,
            "no_face": no_face,
            "camera_blocked": camera_blocked,
            "description": description,
            "session_risk_score": risk_score,
        }


