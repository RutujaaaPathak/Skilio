from typing import Optional

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher_or_admin
from app.database import get_db
from app.models.user import User
from app.schemas.question import AIGenerateRequest, AIGenerateResponse, BulkDuplicateRequest, BulkUpdateRequest, DuplicateCheckRequest, DuplicateCheckResponse, GenerateEquivalentRequest, PaginatedQuestionResponse, QuestionAnalytics, QuestionBulkCreate, QuestionCreate, QuestionResponse, QuestionUpdate, SuggestResponse, VersionEntry
from app.services.question_service import QuestionService


class BulkDeleteRequest(BaseModel):
    question_ids: list[int]


router = APIRouter(prefix="/questions", tags=["Questions"])


@router.post("", response_model=QuestionResponse, status_code=201)
def create_question(
    body: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return QuestionService.create(db, body, current_user)


@router.get("", response_model=PaginatedQuestionResponse)
def list_questions(
    subject: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    question_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return QuestionService.get_all(db, current_user, subject, topic, difficulty, question_type, search, page, page_size)


@router.get("/analytics", response_model=QuestionAnalytics)
def question_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return QuestionService.get_analytics(db, current_user)


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return QuestionService.get_by_id(db, question_id, current_user)


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    body: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return QuestionService.update(db, question_id, body, current_user)


@router.delete("/{question_id}", status_code=204)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    QuestionService.delete(db, question_id, current_user)


@router.post("/{question_id}/duplicate", response_model=QuestionResponse, status_code=201)
def duplicate_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return QuestionService.duplicate(db, question_id, current_user)


@router.post("/bulk", response_model=list[QuestionResponse], status_code=201)
def bulk_create_questions(
    body: QuestionBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return QuestionService.create_bulk(db, body.questions, current_user)


@router.post("/bulk-delete")
def bulk_delete_questions(
    body: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return QuestionService.bulk_delete(db, body.question_ids, current_user)


@router.post("/generate", response_model=AIGenerateResponse)
def generate_questions(
    body: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    questions = QuestionService.generate_with_ai(body, db)
    return {"questions": questions}


@router.post("/generate-equivalent", response_model=AIGenerateResponse)
def generate_equivalent_questions(
    body: GenerateEquivalentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    if body.question_id:
        questions = QuestionService.generate_equivalent(db, body.question_id, current_user, body.count)
    else:
        data = {k: v for k, v in body.model_dump(exclude={"question_id", "count"}).items() if v is not None}
        questions = QuestionService.generate_equivalent_from_data(data, body.count)
    return {"questions": questions}


@router.post("/check-duplicates", response_model=DuplicateCheckResponse)
def check_duplicate_questions(
    body: DuplicateCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return QuestionService.check_duplicates(db, current_user, body.question_texts)


@router.get("/export/csv")
def export_questions_csv(
    subject: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    question_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    csv_content = QuestionService.export_csv(db, current_user, subject, topic, difficulty, question_type, search)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=questions.csv"},
    )


@router.get("/export/pdf")
def export_questions_pdf(
    subject: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    question_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pdf_bytes = QuestionService.export_pdf(db, current_user, subject, topic, difficulty, question_type, search)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=questions.pdf"},
    )


@router.get("/export/json")
def export_questions_json(
    subject: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    question_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    json_content = QuestionService.export_json(db, current_user, subject, topic, difficulty, question_type, search)
    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=questions.json"},
    )


@router.post("/import/pdf")
def import_pdf_preview(
    file: UploadFile = File(...),
    current_user: User = Depends(require_teacher_or_admin),
):
    result = QuestionService.parse_pdf_file(file, current_user)
    return result


@router.post("/import/excel")
def import_excel_preview(
    file: UploadFile = File(...),
    current_user: User = Depends(require_teacher_or_admin),
):
    result = QuestionService.parse_excel_file(file, current_user)
    return result


@router.post("/{question_id}/suggest", response_model=SuggestResponse)
def suggest_improvements(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return QuestionService.suggest_improvements(db, question_id, current_user)


@router.post("/bulk-update")
def bulk_update_questions(
    body: BulkUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    update_data = body.model_dump(exclude={"question_ids"}, exclude_none=True)
    return QuestionService.bulk_update(db, body.question_ids, update_data, current_user)


@router.post("/bulk-duplicate")
def bulk_duplicate_questions(
    body: BulkDuplicateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return QuestionService.bulk_duplicate(db, body.question_ids, current_user)


@router.get("/{question_id}/versions", response_model=list[VersionEntry])
def get_question_versions(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return QuestionService.get_versions(db, question_id, current_user)