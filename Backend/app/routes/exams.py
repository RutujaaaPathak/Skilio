from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher_or_admin
from app.database import get_db
from app.models.user import User
from app.schemas.exam import (
    ConflictCheckResponse, ExamAssignCreate, ExamAssignmentResponse, ExamCancelRequest,
    ExamCreate, ExamQuestionBulkCreate, ExamQuestionResponse, ExamRescheduleRequest,
    ExamResponse, ExamUpdate, StudentConflictCheckResponse,
)
from app.services.exam_service import ExamService

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.post("", response_model=ExamResponse, status_code=201)
def create_exam(
    body: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ExamService.create(db, body, current_user)


@router.get("", response_model=list[ExamResponse])
def list_exams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExamService.get_all(db, current_user)


@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExamService.get_by_id(db, exam_id, current_user)


@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(
    exam_id: int,
    body: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ExamService.update(db, exam_id, body, current_user)


@router.delete("/{exam_id}", status_code=204)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    ExamService.delete(db, exam_id, current_user)


@router.post("/{exam_id}/cancel", response_model=ExamResponse)
def cancel_exam(
    exam_id: int,
    body: ExamCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ExamService.cancel(db, exam_id, body.reason, current_user)


@router.post("/{exam_id}/reschedule", response_model=ExamResponse)
def reschedule_exam(
    exam_id: int,
    body: ExamRescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ExamService.reschedule(db, exam_id, body, current_user)


@router.get("/conflicts/check", response_model=ConflictCheckResponse)
def check_exam_conflicts(
    start_time: datetime,
    end_time: datetime,
    exclude_exam_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ExamService.check_conflicts(db, current_user.id, start_time, end_time, exclude_exam_id)


@router.get("/{exam_id}/student-conflicts", response_model=StudentConflictCheckResponse)
def check_student_conflicts(
    exam_id: int,
    student_ids: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    ids = [int(x.strip()) for x in student_ids.split(",") if x.strip()]
    exam = ExamService.get_by_id(db, exam_id, current_user)
    all_conflicts = []
    for sid in ids:
        all_conflicts.extend(ExamService.check_student_conflicts(db, sid, exam.start_time, exam.end_time))
    return {"has_conflict": len(all_conflicts) > 0, "conflicts": all_conflicts}


@router.post("/{exam_id}/questions", response_model=list[ExamQuestionResponse], status_code=201)
def add_exam_questions(
    exam_id: int,
    body: ExamQuestionBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ExamService.add_questions(db, exam_id, body, current_user)


@router.get("/{exam_id}/questions", response_model=list[ExamQuestionResponse])
def get_exam_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExamService.get_questions(db, exam_id, current_user)


@router.post("/{exam_id}/assign", response_model=list[ExamAssignmentResponse], status_code=201)
def assign_students(
    exam_id: int,
    body: ExamAssignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ExamService.assign_students(db, exam_id, body.student_ids, current_user)


@router.get("/{exam_id}/assigned-students", response_model=list[ExamAssignmentResponse])
def get_assigned_students(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ExamService.get_assigned_students(db, exam_id, current_user)


@router.delete("/assignments/{assignment_id}", status_code=204)
def remove_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    ExamService.remove_assignment(db, assignment_id, current_user)
