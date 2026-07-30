import random
import string
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.class_group import ClassGroup, ClassMember, ExamClass
from app.models.exam import Exam, ExamAssignment
from app.models.user import User
from app.schemas.class_ import ClassCreate, ClassUpdate


AMBIGUOUS = frozenset("O0I1")


def _generate_code() -> str:
    chars = [c for c in string.ascii_uppercase + string.digits if c not in AMBIGUOUS]
    return "".join(random.choices(chars, k=6))


def _unique_code(db: Session) -> str:
    for _ in range(100):
        code = _generate_code()
        exists = db.query(ClassGroup).filter(ClassGroup.code == code, ClassGroup.status == "active").first()
        if not exists:
            return code
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate unique class code")


class ClassService:

    @staticmethod
    def create_class(db: Session, data: ClassCreate, teacher: User) -> ClassGroup:
        cls = ClassGroup(
            name=data.name,
            code=_unique_code(db),
            subject=data.subject,
            teacher_id=teacher.id,
            semester=data.semester,
            academic_year=data.academic_year,
            description=data.description,
        )
        db.add(cls)
        db.commit()
        db.refresh(cls)
        return cls

    @staticmethod
    def get_teacher_classes(db: Session, teacher: User) -> list[ClassGroup]:
        return (
            db.query(ClassGroup)
            .filter(ClassGroup.teacher_id == teacher.id)
            .order_by(ClassGroup.created_at.desc())
            .all()
        )

    @staticmethod
    def get_class_by_id(db: Session, class_id: int, teacher: User) -> ClassGroup:
        cls = db.query(ClassGroup).filter(ClassGroup.id == class_id).first()
        if not cls:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
        if cls.teacher_id != teacher.id and teacher.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        return cls

    @staticmethod
    def get_class_detail(db: Session, class_id: int, teacher: User) -> ClassGroup:
        return ClassService.get_class_by_id(db, class_id, teacher)

    @staticmethod
    def update_class(db: Session, class_id: int, data: ClassUpdate, teacher: User) -> ClassGroup:
        cls = ClassService.get_class_by_id(db, class_id, teacher)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(cls, key, value)
        cls.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(cls)
        return cls

    @staticmethod
    def get_class_members(db: Session, class_id: int, teacher: User) -> list[ClassMember]:
        ClassService.get_class_by_id(db, class_id, teacher)
        return (
            db.query(ClassMember)
            .filter(ClassMember.class_id == class_id, ClassMember.status == "active")
            .order_by(ClassMember.joined_at.desc())
            .all()
        )

    @staticmethod
    def remove_student(db: Session, class_id: int, student_id: int, teacher: User) -> None:
        cls = ClassService.get_class_by_id(db, class_id, teacher)
        member = (
            db.query(ClassMember)
            .filter(
                ClassMember.class_id == class_id,
                ClassMember.student_id == student_id,
                ClassMember.status == "active",
            )
            .first()
        )
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found in this class")
        member.status = "removed"
        db.commit()

    @staticmethod
    def regenerate_code(db: Session, class_id: int, teacher: User) -> str:
        cls = ClassService.get_class_by_id(db, class_id, teacher)
        new_code = _unique_code(db)
        cls.code = new_code
        db.commit()
        db.refresh(cls)
        return cls.code

    @staticmethod
    def assign_exam_to_classes(db: Session, exam_id: int, class_ids: list[int], assign_to_future_members: bool, teacher: User) -> int:
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        if exam.teacher_id != teacher.id and teacher.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        if exam.status in ("draft", "completed", "cancelled"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign students to a {exam.status} exam",
            )

        total_assigned = 0
        for class_id in class_ids:
            cls = db.query(ClassGroup).filter(ClassGroup.id == class_id).first()
            if not cls or cls.teacher_id != teacher.id:
                continue

            existing_link = (
                db.query(ExamClass)
                .filter(ExamClass.exam_id == exam_id, ExamClass.class_id == class_id)
                .first()
            )
            if existing_link:
                continue

            link = ExamClass(
                exam_id=exam_id,
                class_id=class_id,
                assign_to_future_members=assign_to_future_members,
            )
            db.add(link)

            members = (
                db.query(ClassMember)
                .filter(ClassMember.class_id == class_id, ClassMember.status == "active")
                .all()
            )
            existing_assigned = {
                a.student_id
                for a in db.query(ExamAssignment)
                .filter(
                    ExamAssignment.exam_id == exam_id,
                    ExamAssignment.student_id.in_([m.student_id for m in members]),
                )
                .all()
            }

            for member in members:
                if member.student_id not in existing_assigned:
                    assignment = ExamAssignment(
                        exam_id=exam_id,
                        student_id=member.student_id,
                        assigned_by=teacher.id,
                    )
                    db.add(assignment)
                    total_assigned += 1

        db.commit()
        return total_assigned

    @staticmethod
    def get_class_assigned_exams(db: Session, class_id: int, teacher: User) -> list[dict]:
        ClassService.get_class_by_id(db, class_id, teacher)
        links = (
            db.query(ExamClass)
            .filter(ExamClass.class_id == class_id)
            .order_by(ExamClass.assigned_at.desc())
            .all()
        )
        results = []
        for link in links:
            exam = link.exam
            if not exam:
                continue
            total = (
                db.query(ExamAssignment)
                .filter(ExamAssignment.exam_id == exam.id)
                .count()
            )
            completed = (
                db.query(ExamAssignment)
                .filter(
                    ExamAssignment.exam_id == exam.id,
                    ExamAssignment.status.in_(["submitted", "reviewed"]),
                )
                .count()
            )
            in_progress = (
                db.query(ExamAssignment)
                .filter(
                    ExamAssignment.exam_id == exam.id,
                    ExamAssignment.status == "started",
                )
                .count()
            )
            not_started = total - completed - in_progress
            results.append({
                "exam_id": exam.id,
                "exam_title": exam.title,
                "subject": exam.subject,
                "status": exam.status,
                "total_students": total,
                "completed": completed,
                "in_progress": in_progress,
                "not_started": not_started,
            })
        return results

    @staticmethod
    def get_exam_assigned_classes(db: Session, exam_id: int, teacher: User) -> list[dict]:
        links = (
            db.query(ExamClass)
            .filter(ExamClass.exam_id == exam_id)
            .all()
        )
        results = []
        for link in links:
            cls = link.class_group
            if not cls:
                continue
            member_count = (
                db.query(ClassMember)
                .filter(ClassMember.class_id == cls.id, ClassMember.status == "active")
                .count()
            )
            results.append({
                "class_id": cls.id,
                "class_name": cls.name,
                "subject": cls.subject,
                "student_count": member_count,
            })
        return results

    @staticmethod
    def join_class(db: Session, code: str, student: User) -> ClassGroup:
        code = code.strip().upper()
        cls = db.query(ClassGroup).filter(ClassGroup.code == code).first()
        if not cls:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found. Please check the code.")
        if cls.status != "active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This class is no longer accepting students.")

        existing = (
            db.query(ClassMember)
            .filter(
                ClassMember.class_id == cls.id,
                ClassMember.student_id == student.id,
                ClassMember.status == "active",
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already a member of this class.")

        existing_removed = (
            db.query(ClassMember)
            .filter(
                ClassMember.class_id == cls.id,
                ClassMember.student_id == student.id,
                ClassMember.status == "removed",
            )
            .first()
        )
        if existing_removed:
            existing_removed.status = "active"
            db.commit()
            db.refresh(cls)
            return cls

        member = ClassMember(class_id=cls.id, student_id=student.id)
        db.add(member)

        future_links = (
            db.query(ExamClass)
            .filter(ExamClass.class_id == cls.id, ExamClass.assign_to_future_members == True)
            .all()
        )
        for link in future_links:
            exam = link.exam
            if not exam or exam.status in ("completed", "cancelled"):
                continue
            existing_a = (
                db.query(ExamAssignment)
                .filter(
                    ExamAssignment.exam_id == link.exam_id,
                    ExamAssignment.student_id == student.id,
                )
                .first()
            )
            if not existing_a:
                assignment = ExamAssignment(
                    exam_id=link.exam_id,
                    student_id=student.id,
                    assigned_by=cls.teacher_id,
                )
                db.add(assignment)

        db.commit()
        db.refresh(cls)
        return cls

    @staticmethod
    def get_student_classes(db: Session, student: User) -> list[ClassGroup]:
        member_class_ids = (
            db.query(ClassMember.class_id)
            .filter(ClassMember.student_id == student.id, ClassMember.status == "active")
            .subquery()
        )
        return (
            db.query(ClassGroup)
            .filter(
                ClassGroup.id.in_(member_class_ids),
                ClassGroup.status == "active",
            )
            .order_by(ClassGroup.created_at.desc())
            .all()
        )

    @staticmethod
    def get_student_class_detail(db: Session, class_id: int, student: User) -> ClassGroup:
        member = (
            db.query(ClassMember)
            .filter(
                ClassMember.class_id == class_id,
                ClassMember.student_id == student.id,
                ClassMember.status == "active",
            )
            .first()
        )
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found or you are not a member")
        cls = db.query(ClassGroup).filter(ClassGroup.id == class_id).first()
        if not cls or cls.status != "active":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
        return cls

    @staticmethod
    def get_student_class_exams(db: Session, class_id: int, student: User) -> list[dict]:
        ClassService.get_student_class_detail(db, class_id, student)
        links = (
            db.query(ExamClass)
            .filter(ExamClass.class_id == class_id)
            .all()
        )
        results = []
        for link in links:
            exam = link.exam
            if not exam:
                continue
            assignment = (
                db.query(ExamAssignment)
                .filter(
                    ExamAssignment.exam_id == exam.id,
                    ExamAssignment.student_id == student.id,
                )
                .first()
            )
            results.append({
                "exam_id": exam.id,
                "exam_title": exam.title,
                "subject": exam.subject,
                "status": exam.status,
                "duration_minutes": exam.duration_minutes,
                "total_marks": exam.total_marks,
                "start_time": exam.start_time,
                "end_time": exam.end_time,
                "assignment_status": assignment.status if assignment else None,
                "assigned_at": assignment.assigned_at if assignment else None,
            })
        return results
