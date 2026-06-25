from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher_or_admin
from app.database import get_db
from app.models.user import User
from app.models.exam import Exam
from app.models.proctor_event import ProctorEvent
from app.schemas.proctor import (
    ProctorEventCreate,
    ProctorEventResponse,
    ProctorEventResponseWithRisk,
    ProctorFrameAnalysisCreate,
    ProctorFrameAnalysisResponse,
    ProctorRiskReportResponse,
)
from app.services.proctor_service import ProctorService
from app.services.risk_service import ProctorRiskService

router = APIRouter(prefix="/proctor", tags=["Proctoring"])
teacher_router = APIRouter(prefix="/teacher", tags=["Teacher Proctoring"])


@router.post(
    "/events",
    response_model=ProctorEventResponseWithRisk,
    status_code=201,
)
def create_proctor_event(
    body: ProctorEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = ProctorService.create_event(db, body, current_user)
    risk_score = ProctorService.calculate_risk_score(db, event.exam_session_id)
    return {
        "event": event,
        "session_risk_score": risk_score,
    }


@router.post(
    "/face-event",
    response_model=ProctorEventResponseWithRisk,
    status_code=201,
)
def create_face_event(
    body: ProctorEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Log the event
    event = ProctorService.create_event(db, body, current_user)

    # Calculate the updated session risk score
    risk_score = ProctorService.calculate_risk_score(db, event.exam_session_id)

    return {
        "event": event,
        "session_risk_score": risk_score,
    }


@router.post(
    "/analyze-frame",
    response_model=ProctorFrameAnalysisResponse,
    status_code=200,
)
def analyze_frame(
    body: ProctorFrameAnalysisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Call the frame analysis service
    result = ProctorService.analyze_screenshot_frame(
        db=db,
        session_token=body.session_token,
        screenshot_url=body.screenshot_url,
        user=current_user,
    )
    return result


def _event_to_dict(event: ProctorEvent, db: Session) -> dict:
    student = db.query(User).filter(User.id == event.student_id).first()
    return {
        "id": event.id,
        "exam_session_id": event.exam_session_id,
        "exam_id": event.exam_id,
        "student_id": event.student_id,
        "student_name": student.name if student else "",
        "student_email": student.email if student else "",
        "event_type": event.event_type,
        "confidence_score": event.confidence_score,
        "screenshot_url": event.screenshot_url,
        "severity": event.severity,
        "description": event.description,
        "metadata": event.metadata_,
        "created_at": event.created_at,
    }


@teacher_router.get(
    "/exams/{exam_id}/proctor-events",
    response_model=list[ProctorEventResponse],
)
def get_exam_proctor_events(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if current_user.role != "admin" and exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view events for your own exams")
        
    events = db.query(ProctorEvent).filter(ProctorEvent.exam_id == exam_id).order_by(ProctorEvent.created_at.desc()).all()
    return [_event_to_dict(e, db) for e in events]


@teacher_router.get(
    "/exams/{exam_id}/students/{student_id}/proctor-events",
    response_model=list[ProctorEventResponse],
)
def get_student_proctor_events(
    exam_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if current_user.role != "admin" and exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view events for your own exams")
        
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    events = db.query(ProctorEvent).filter(
        ProctorEvent.exam_id == exam_id,
        ProctorEvent.student_id == student_id,
    ).order_by(ProctorEvent.created_at.desc()).all()
    return [_event_to_dict(e, db) for e in events]


@teacher_router.get(
    "/exams/{exam_id}/risk-reports",
    response_model=list[ProctorRiskReportResponse],
)
def get_exam_risk_reports(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ProctorRiskService.get_exam_risk_reports(db, exam_id, current_user)


@teacher_router.get(
    "/exams/{exam_id}/students/{student_id}/risk-report",
    response_model=ProctorRiskReportResponse,
)
def get_student_risk_report(
    exam_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ProctorRiskService.get_risk_report(db, exam_id, student_id, current_user)


