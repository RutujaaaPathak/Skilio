from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher_or_admin
from app.database import get_db
from app.models.class_group import ClassGroup, ClassMember, ExamClass
from app.models.user import User
from app.schemas.class_ import (
    AssignExamToClassRequest,
    ClassCreate,
    ClassDetailResponse,
    ClassMemberResponse,
    ClassResponse,
    ClassUpdate,
    JoinClassRequest,
    RegenerateCodeResponse,
)
from app.services.class_service import ClassService

router = APIRouter(prefix="/classes", tags=["Classes"])


def _enrich_class(cls, db: Session) -> dict:
    student_count = (
        db.query(func.count(ClassMember.id))
        .filter(ClassMember.class_id == cls.id, ClassMember.status == "active")
        .scalar() or 0
    )
    exam_count = (
        db.query(func.count(ExamClass.id))
        .filter(ExamClass.class_id == cls.id)
        .scalar() or 0
    )
    return {
        "id": cls.id,
        "name": cls.name,
        "code": cls.code,
        "subject": cls.subject,
        "teacher_id": cls.teacher_id,
        "semester": cls.semester,
        "academic_year": cls.academic_year,
        "description": cls.description,
        "status": cls.status,
        "student_count": student_count,
        "exam_count": exam_count,
        "created_at": cls.created_at,
        "updated_at": cls.updated_at,
    }


@router.get("", response_model=list[ClassResponse])
def get_teacher_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    classes = ClassService.get_teacher_classes(db, current_user)
    return [_enrich_class(c, db) for c in classes]


@router.post("", response_model=ClassResponse, status_code=201)
def create_class(
    body: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    cls = ClassService.create_class(db, body, current_user)
    return _enrich_class(cls, db)


@router.get("/{class_id}", response_model=ClassDetailResponse)
def get_class_detail(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    cls = ClassService.get_class_detail(db, class_id, current_user)
    enriched = _enrich_class(cls, db)
    enriched["teacher_name"] = current_user.name
    return enriched


@router.put("/{class_id}", response_model=ClassResponse)
def update_class(
    class_id: int,
    body: ClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    cls = ClassService.update_class(db, class_id, body, current_user)
    return _enrich_class(cls, db)


@router.get("/{class_id}/members", response_model=list[ClassMemberResponse])
def get_class_members(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    members = ClassService.get_class_members(db, class_id, current_user)
    return [
        {
            "id": m.id,
            "student_id": m.student_id,
            "student_name": m.student.name,
            "student_email": m.student.email,
            "joined_at": m.joined_at,
            "status": m.status,
        }
        for m in members
    ]


@router.delete("/{class_id}/members/{student_id}", status_code=204)
def remove_student(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    ClassService.remove_student(db, class_id, student_id, current_user)


@router.post("/{class_id}/regenerate-code", response_model=RegenerateCodeResponse)
def regenerate_code(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    code = ClassService.regenerate_code(db, class_id, current_user)
    return {"code": code}


@router.post("/{class_id}/assign-exam", status_code=201)
def assign_exam_to_class(
    class_id: int,
    exam_id: int = Query(...),
    assign_to_future_members: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    total = ClassService.assign_exam_to_classes(
        db, exam_id, [class_id], assign_to_future_members, current_user
    )
    return {"assigned_count": total}


@router.post("/assign-exam", status_code=201)
def assign_exam_to_classes(
    body: AssignExamToClassRequest,
    exam_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    total = ClassService.assign_exam_to_classes(
        db, exam_id, body.class_ids, body.assign_to_future_members, current_user
    )
    return {"assigned_count": total}


@router.get("/{class_id}/exams")
def get_class_exams(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ClassService.get_class_assigned_exams(db, class_id, current_user)


@router.get("/exam/{exam_id}/classes")
def get_exam_classes(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    return ClassService.get_exam_assigned_classes(db, exam_id, current_user)


@router.post("/join", status_code=201)
def join_class(
    body: JoinClassRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls = ClassService.join_class(db, body.code, current_user)
    student_count = (
        db.query(func.count(ClassMember.id))
        .filter(ClassMember.class_id == cls.id, ClassMember.status == "active")
        .scalar() or 0
    )
    return {
        "id": cls.id,
        "name": cls.name,
        "subject": cls.subject,
        "teacher_name": cls.teacher.name if cls.teacher else "",
        "student_count": student_count,
    }


@router.get("/student/classes", response_model=list[ClassDetailResponse])
def get_student_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    classes = ClassService.get_student_classes(db, current_user)
    results = []
    for cls in classes:
        student_count = (
            db.query(func.count(ClassMember.id))
            .filter(ClassMember.class_id == cls.id, ClassMember.status == "active")
            .scalar() or 0
        )
        exam_count = (
            db.query(func.count(ExamClass.id))
            .filter(ExamClass.class_id == cls.id)
            .scalar() or 0
        )
        results.append({
            "id": cls.id,
            "name": cls.name,
            "code": cls.code,
            "subject": cls.subject,
            "teacher_id": cls.teacher_id,
            "teacher_name": cls.teacher.name if cls.teacher else "",
            "semester": cls.semester,
            "academic_year": cls.academic_year,
            "description": cls.description,
            "status": cls.status,
            "student_count": student_count,
            "exam_count": exam_count,
            "created_at": cls.created_at,
            "updated_at": cls.updated_at,
        })
    return results


@router.get("/student/{class_id}", response_model=ClassDetailResponse)
def get_student_class_detail(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls = ClassService.get_student_class_detail(db, class_id, current_user)
    student_count = (
        db.query(func.count(ClassMember.id))
        .filter(ClassMember.class_id == cls.id, ClassMember.status == "active")
        .scalar() or 0
    )
    exam_count = (
        db.query(func.count(ExamClass.id))
        .filter(ExamClass.class_id == cls.id)
        .scalar() or 0
    )
    return {
        "id": cls.id,
        "name": cls.name,
        "code": cls.code,
        "subject": cls.subject,
        "teacher_id": cls.teacher_id,
        "teacher_name": cls.teacher.name if cls.teacher else "",
        "semester": cls.semester,
        "academic_year": cls.academic_year,
        "description": cls.description,
        "status": cls.status,
        "student_count": student_count,
        "exam_count": exam_count,
        "created_at": cls.created_at,
        "updated_at": cls.updated_at,
    }


@router.get("/student/{class_id}/exams")
def get_student_class_exams(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ClassService.get_student_class_exams(db, class_id, current_user)
