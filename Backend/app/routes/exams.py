from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher_or_admin
from app.database import get_db
from app.models.user import User
from app.schemas.exam import ExamAssignCreate, ExamAssignmentResponse, ExamCreate, ExamQuestionBulkCreate, ExamQuestionResponse, ExamResponse, ExamUpdate
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
