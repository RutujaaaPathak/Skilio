from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.evaluation_service import EvaluationService
from app.schemas.evaluation import (
    AISuggestRequest,
    AISuggestResponse,
    EvaluationDashboardResponse,
    EvaluationQueueResponse,
    FinalReviewReportResponse,
    FinalReviewResponse,
    PublishResultRequest,
    PublishResultResponse,
    SaveEvaluationRequest,
    SaveEvaluationResponse,
    StudentSubmissionResponse,
)

router = APIRouter(prefix="/teacher/exams/{exam_id}/evaluation", tags=["Evaluation"])


@router.get("/dashboard", response_model=EvaluationDashboardResponse)
def get_evaluation_dashboard(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can access evaluation")
    return EvaluationService.get_dashboard(db, exam_id, current_user.id)


@router.get("/queue", response_model=EvaluationQueueResponse)
def get_evaluation_queue(
    exam_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    status: str = Query("all"),
    sort_by: str = Query("name"),
    sort_dir: str = Query("asc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can access evaluation")
    return EvaluationService.get_evaluation_queue(
        db, exam_id, current_user.id, page, per_page, search, status, sort_by, sort_dir,
    )


@router.get("/submission/{student_id}", response_model=StudentSubmissionResponse)
def get_student_submission(
    exam_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can access evaluation")
    return EvaluationService.get_student_submission(db, exam_id, student_id, current_user.id)


@router.put("/save", response_model=SaveEvaluationResponse)
def save_evaluation(
    exam_id: int,
    data: SaveEvaluationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can access evaluation")
    return EvaluationService.save_evaluation(db, exam_id, current_user.id, data.model_dump())


@router.post("/ai-suggest", response_model=AISuggestResponse)
def request_ai_suggestion(
    exam_id: int,
    data: AISuggestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can access evaluation")
    return EvaluationService.request_ai_suggestion(
        db, exam_id, current_user.id, data.student_id, data.question_id,
    )


@router.get("/review", response_model=FinalReviewResponse)
def get_final_review(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can access evaluation")
    return EvaluationService.get_final_review(db, exam_id, current_user.id)


@router.get("/report", response_model=FinalReviewReportResponse)
def get_full_report(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can access evaluation")
    return EvaluationService.get_full_report(db, exam_id, current_user.id)


@router.post("/publish", response_model=PublishResultResponse)
def publish_results(
    exam_id: int,
    data: PublishResultRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can access evaluation")
    return EvaluationService.publish_results(db, exam_id, current_user.id, data.confirm)
