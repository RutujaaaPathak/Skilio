import json

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.exam import Exam, ExamAssignment, ExamSession
from app.models.proctor import ProctorEvent
from app.models.user import User
from app.schemas.proctor import SEVERITY_MAP, ProctorEventCreate

SEVERITY_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}


class ProctorService:

    @staticmethod
    def log_event(
        db: Session,
        data: ProctorEventCreate,
        student: User,
    ) -> ProctorEvent:
        session = db.query(ExamSession).filter(
            ExamSession.id == data.exam_session_id,
            ExamSession.student_id == student.id,
            ExamSession.exam_id == data.exam_id,
        ).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam session not found or does not belong to you",
            )

        severity = SEVERITY_MAP.get(data.event_type, "low")

        event = ProctorEvent(
            exam_session_id=data.exam_session_id,
            exam_id=data.exam_id,
            student_id=student.id,
            event_type=data.event_type,
            severity=severity,
            description=data.description,
            event_metadata=json.dumps(data.metadata) if data.metadata else None,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_exam_events(
        db: Session,
        exam_id: int,
        user: User,
        severity_filter: str | None = None,
    ) -> list[ProctorEvent]:
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        if user.role not in ("admin",) and exam.teacher_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view events for this exam")

        q = db.query(ProctorEvent).filter(ProctorEvent.exam_id == exam_id)
        if severity_filter:
            q = q.filter(ProctorEvent.severity == severity_filter)
        return q.order_by(ProctorEvent.created_at.desc()).all()

    @staticmethod
    def get_student_events(
        db: Session,
        exam_id: int,
        student_id: int,
        user: User,
    ) -> list[ProctorEvent]:
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        if user.role not in ("admin",) and exam.teacher_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

        student = db.query(User).filter(User.id == student_id, User.role == "student").first()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        assignment = db.query(ExamAssignment).filter(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.student_id == student_id,
        ).first()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student is not assigned to this exam")

        return (
            db.query(ProctorEvent)
            .filter(ProctorEvent.exam_id == exam_id, ProctorEvent.student_id == student_id)
            .order_by(ProctorEvent.created_at.desc())
            .all()
        )
