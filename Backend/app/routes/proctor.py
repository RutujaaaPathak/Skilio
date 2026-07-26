from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher_or_admin
from app.database import get_db
from app.models.user import User
from app.models.exam import Exam
from app.models.proctor_event import ProctorEvent
from app.schemas.proctor import (
    ExamSecuritySummaryResponse,
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


@router.get(
    "/session-risk",
)
def get_session_risk(
    session_token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.exam import ExamSession
    session = db.query(ExamSession).filter(ExamSession.session_token == session_token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Session does not belong to this student")
    risk_score = ProctorService.calculate_risk_score(db, session.id)
    return {"session_risk_score": risk_score, "session_status": session.status}


@router.post(
    "/events/batch",
    status_code=201,
)
def create_proctor_events_batch(
    body: List[ProctorEventCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    events = []
    for item in body:
        event = ProctorService.create_event(db, item, current_user)
        events.append(event)
    return {
        "synced": len(events),
        "session_risk_score": ProctorService.calculate_risk_score(db, events[0].exam_session_id) if events else 0.0,
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


@teacher_router.get(
    "/exams/{exam_id}/security-summary",
    response_model=ExamSecuritySummaryResponse,
)
def get_exam_security_summary(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if current_user.role != "admin" and exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own exams")

    from app.models.proctor_event import ProctorEvent
    from app.models.risk_report import ProctorRiskReport

    total_events = db.query(func.count(ProctorEvent.id)).filter(ProctorEvent.exam_id == exam_id).scalar() or 0
    critical_count = db.query(func.count(ProctorEvent.id)).filter(ProctorEvent.exam_id == exam_id, ProctorEvent.severity == "critical").scalar() or 0
    high_count = db.query(func.count(ProctorEvent.id)).filter(ProctorEvent.exam_id == exam_id, ProctorEvent.severity == "high").scalar() or 0
    medium_count = db.query(func.count(ProctorEvent.id)).filter(ProctorEvent.exam_id == exam_id, ProctorEvent.severity == "medium").scalar() or 0
    low_count = db.query(func.count(ProctorEvent.id)).filter(ProctorEvent.exam_id == exam_id, ProctorEvent.severity == "low").scalar() or 0

    flagged_students = db.query(func.count(func.distinct(ProctorRiskReport.student_id))).filter(
        ProctorRiskReport.exam_id == exam_id,
        ProctorRiskReport.risk_level.in_(["high", "critical"]),
    ).scalar() or 0

    risk_dist = {"clean": 0, "low": 0, "medium": 0, "high": 0, "critical": 0}
    rows = db.query(ProctorRiskReport.risk_level, func.count(ProctorRiskReport.id)).filter(
        ProctorRiskReport.exam_id == exam_id,
    ).group_by(ProctorRiskReport.risk_level).all()
    for level, cnt in rows:
        if level in risk_dist:
            risk_dist[level] = cnt

    return ExamSecuritySummaryResponse(
        exam_id=exam.id,
        title=exam.title,
        subject=exam.subject,
        status=exam.status,
        security_config={
            "fullscreen_required": exam.fullscreen_required,
            "microphone_required": exam.microphone_required,
            "camera_required": exam.camera_required,
            "voice_verification_enabled": exam.voice_verification_enabled,
            "ai_monitoring_level": exam.ai_monitoring_level,
            "face_detection_enabled": exam.face_detection_enabled,
            "multiple_person_detection_enabled": exam.multiple_person_detection_enabled,
            "phone_detection_enabled": exam.phone_detection_enabled,
            "voice_monitoring_enabled": exam.voice_monitoring_enabled,
            "screen_monitoring_enabled": exam.screen_monitoring_enabled,
            "registered_device_only": exam.registered_device_only,
            "randomize_questions": exam.randomize_questions,
            "shuffle_options": exam.shuffle_options,
            "negative_marking_enabled": exam.negative_marking_enabled,
            "negative_marks_per_question": exam.negative_marks_per_question,
            "tab_switch_limit": exam.tab_switch_limit,
            "is_offline_enabled": exam.is_offline_enabled,
            "grace_period_minutes": exam.grace_period_minutes,
            "allow_late_entry": exam.allow_late_entry,
            "late_entry_cutoff_minutes": exam.late_entry_cutoff_minutes,
        },
        proctoring_summary={
            "total_events": total_events,
            "critical_count": critical_count,
            "high_count": high_count,
            "medium_count": medium_count,
            "low_count": low_count,
            "flagged_students": flagged_students,
            "risk_distribution": risk_dist,
        },
    )
