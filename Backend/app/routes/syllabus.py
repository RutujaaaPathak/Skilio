from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher_or_admin
from app.database import get_db
from app.models.syllabus import Syllabus
from app.models.user import User
from app.schemas.syllabus import SyllabusCreate, SyllabusResponse, SyllabusSubjectResponse, SyllabusUpdate

router = APIRouter(prefix="/syllabus", tags=["Syllabus"])


def _response(s: Syllabus) -> SyllabusResponse:
    return SyllabusResponse(
        id=s.id,
        teacher_id=s.teacher_id,
        subject=s.subject,
        topic=s.topic,
        chapter=s.chapter,
        unit=s.unit,
        description=s.description,
        learning_outcomes=s.learning_outcomes,
        is_active=s.is_active,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


@router.get("", response_model=list[SyllabusResponse])
def list_syllabus(
    subject: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Syllabus).filter(Syllabus.is_active == True)
    if current_user.role == "teacher":
        q = q.filter(Syllabus.teacher_id == current_user.id)
    if subject:
        q = q.filter(Syllabus.subject.ilike(f"%{subject}%"))
    return [_response(s) for s in q.order_by(Syllabus.subject, Syllabus.chapter, Syllabus.topic).all()]


@router.get("/subjects", response_model=list[SyllabusSubjectResponse])
def list_syllabus_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func
    q = db.query(Syllabus.subject, func.count(Syllabus.id)).filter(Syllabus.is_active == True)
    if current_user.role == "teacher":
        q = q.filter(Syllabus.teacher_id == current_user.id)
    rows = q.group_by(Syllabus.subject).order_by(Syllabus.subject).all()
    return [SyllabusSubjectResponse(subject=r[0], topic_count=r[1]) for r in rows]


@router.get("/{syllabus_id}", response_model=SyllabusResponse)
def get_syllabus(
    syllabus_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Syllabus entry not found")
    if current_user.role != "admin" and s.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return _response(s)


@router.post("", response_model=SyllabusResponse, status_code=201)
def create_syllabus(
    body: SyllabusCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    s = Syllabus(
        teacher_id=current_user.id,
        subject=body.subject,
        topic=body.topic,
        chapter=body.chapter,
        unit=body.unit,
        description=body.description,
        learning_outcomes=body.learning_outcomes,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _response(s)


@router.post("/bulk", response_model=list[SyllabusResponse], status_code=201)
def bulk_create_syllabus(
    body: list[SyllabusCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    created = []
    for entry in body:
        s = Syllabus(
            teacher_id=current_user.id,
            subject=entry.subject,
            topic=entry.topic,
            chapter=entry.chapter,
            unit=entry.unit,
            description=entry.description,
            learning_outcomes=entry.learning_outcomes,
        )
        db.add(s)
        created.append(s)
    db.commit()
    for s in created:
        db.refresh(s)
    return [_response(s) for s in created]


@router.put("/{syllabus_id}", response_model=SyllabusResponse)
def update_syllabus(
    syllabus_id: int,
    body: SyllabusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    s = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Syllabus entry not found")
    if current_user.role != "admin" and s.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return _response(s)


@router.delete("/{syllabus_id}")
def delete_syllabus(
    syllabus_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    s = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Syllabus entry not found")
    if current_user.role != "admin" and s.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    s.is_active = False
    db.commit()
    return {"message": "Syllabus entry deactivated successfully"}