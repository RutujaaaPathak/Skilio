from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher_or_admin
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.exam import StudentExamResponse
from app.services.exam_service import ExamService

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=list[UserResponse])
def list_students(
    batch: str | None = Query(None),
    year: str | None = Query(None),
    branch: str | None = Query(None),
    division: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    q = db.query(User).filter(User.role == "student")
    if batch:
        q = q.filter(User.batch == batch)
    if year:
        q = q.filter(User.year == year)
    if branch:
        q = q.filter(User.branch == branch)
    if division:
        q = q.filter(User.division == division)
    return q.order_by(User.name).all()


@router.get("/my-exams", response_model=list[StudentExamResponse])
def get_my_exams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExamService.get_my_exams(db, current_user)
