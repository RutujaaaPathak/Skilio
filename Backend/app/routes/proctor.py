from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_student, require_teacher_or_admin
from app.database import get_db
from app.models.user import User
from app.schemas.proctor import ProctorEventCreate, ProctorEventResponse
from app.services.proctor_service import ProctorService

student_router = APIRouter(prefix="/proctor", tags=["Proctor"])
teacher_router = APIRouter(prefix="/teacher", tags=["Teacher Proctor"])


@student_router.post("/events", response_model=ProctorEventResponse, status_code=201)
def log_proctor_event(
    body: ProctorEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Log a proctor event during an exam.

    Automatically calculates severity based on event_type:
      - tab_switch → medium
      - fullscreen_exit → high
      - copy_paste → high
      - multiple_faces → critical
      - no_face → high
      - window_blur → medium
      - right_click → low
    """
    return ProctorService.log_event(db=db, data=body, student=current_user)


@teacher_router.get(
    "/exams/{exam_id}/proctor-events",
    response_model=list[ProctorEventResponse],
)
def get_exam_proctor_events(
    exam_id: int,
    severity: str | None = Query(None, description="Filter by severity: low, medium, high, critical"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """Get all proctor events for an exam (teacher/admin only)."""
    return ProctorService.get_exam_events(db=db, exam_id=exam_id, user=current_user, severity_filter=severity)


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
    """Get proctor events for a specific student in an exam (teacher/admin only)."""
    return ProctorService.get_student_events(db=db, exam_id=exam_id, student_id=student_id, user=current_user)
