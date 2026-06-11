import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.exam import Exam, ExamAssignment, ExamQuestion, ExamSession, StudentAnswer
from app.models.user import User
from app.schemas.exam import AnswerSyncItem, AnswerSyncRequest, ExamCreate, ExamQuestionBulkCreate, ExamUpdate


class ExamService:
    @staticmethod
    def _transition_statuses(db: Session):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for exam in db.query(Exam).filter(Exam.status == "scheduled").all():
            st = exam.start_time
            if st.tzinfo:
                st = st.replace(tzinfo=None)
            if st <= now:
                exam.status = "active"
        for exam in db.query(Exam).filter(Exam.status == "active").all():
            et = exam.end_time
            if et.tzinfo:
                et = et.replace(tzinfo=None)
            if et <= now:
                exam.status = "completed"
        db.commit()

    @staticmethod
    def create(db: Session, data: ExamCreate, teacher: User) -> Exam:
        if data.end_time <= data.start_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be after start_time")
        exam = Exam(
            teacher_id=teacher.id,
            title=data.title,
            subject=data.subject,
            description=data.description,
            duration_minutes=data.duration_minutes,
            total_marks=data.total_marks,
            start_time=data.start_time,
            end_time=data.end_time,
            is_offline_enabled=data.is_offline_enabled,
            tab_switch_limit=data.tab_switch_limit,
            camera_required=data.camera_required,
            voice_verification_enabled=data.voice_verification_enabled,
            adaptive_difficulty_enabled=data.adaptive_difficulty_enabled,
            zero_knowledge_generation_enabled=data.zero_knowledge_generation_enabled,
            status=data.status,
        )
        db.add(exam)
        db.commit()
        db.refresh(exam)
        return exam

    @staticmethod
    def get_all(db: Session, user: User) -> list[Exam]:
        ExamService._transition_statuses(db)
        q = db.query(Exam)
        if user.role == "teacher":
            q = q.filter(Exam.teacher_id == user.id)
        return q.order_by(Exam.created_at.desc()).all()

    @staticmethod
    def get_by_id(db: Session, exam_id: int, user: User) -> Exam:
        ExamService._transition_statuses(db)
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        if user.role not in ("admin",) and exam.teacher_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this exam")
        return exam

    @staticmethod
    def update(db: Session, exam_id: int, data: ExamUpdate, user: User) -> Exam:
        exam = ExamService.get_by_id(db, exam_id, user)
        update_data = data.model_dump(exclude_unset=True)
        start = update_data.get("start_time") or exam.start_time
        end = update_data.get("end_time") or exam.end_time
        if end <= start:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be after start_time")
        for field, value in update_data.items():
            setattr(exam, field, value)
        db.commit()
        db.refresh(exam)
        return exam

    @staticmethod
    def delete(db: Session, exam_id: int, user: User) -> None:
        exam = ExamService.get_by_id(db, exam_id, user)
        db.delete(exam)
        db.commit()

    @staticmethod
    def add_questions(db: Session, exam_id: int, data: ExamQuestionBulkCreate, user: User) -> list[ExamQuestion]:
        ExamService.get_by_id(db, exam_id, user)
        existing = {eq.question_id for eq in db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()}
        links = []
        for q in data.questions:
            if q.question_id in existing:
                continue
            link = ExamQuestion(exam_id=exam_id, question_id=q.question_id, marks=q.marks, order_index=q.order_index)
            db.add(link)
            links.append(link)
        db.commit()
        for link in links:
            db.refresh(link)
        return links

    @staticmethod
    def get_questions(db: Session, exam_id: int, user: User) -> list[ExamQuestion]:
        ExamService.get_by_id(db, exam_id, user)
        return (
            db.query(ExamQuestion)
            .filter(ExamQuestion.exam_id == exam_id)
            .order_by(ExamQuestion.order_index)
            .all()
        )

    @staticmethod
    def assign_students(db: Session, exam_id: int, student_ids: list[int], user: User) -> list[ExamAssignment]:
        exam = ExamService.get_by_id(db, exam_id, user)
        if exam.status == "draft":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign students to a draft exam")
        existing_ids = {
            a.student_id
            for a in db.query(ExamAssignment).filter(
                ExamAssignment.exam_id == exam_id,
                ExamAssignment.student_id.in_(student_ids),
            ).all()
        }
        assignments = []
        for sid in student_ids:
            if sid in existing_ids:
                continue
            student = db.query(User).filter(User.id == sid, User.role == "student").first()
            if not student:
                continue
            assignment = ExamAssignment(exam_id=exam_id, student_id=sid, assigned_by=user.id)
            db.add(assignment)
            assignments.append(assignment)
        db.commit()
        for a in assignments:
            db.refresh(a)
        return assignments

    @staticmethod
    def get_assigned_students(db: Session, exam_id: int, user: User) -> list[ExamAssignment]:
        ExamService.get_by_id(db, exam_id, user)
        return db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id).order_by(ExamAssignment.assigned_at.desc()).all()

    @staticmethod
    def remove_assignment(db: Session, assignment_id: int, user: User) -> None:
        assignment = db.query(ExamAssignment).filter(ExamAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
        exam = db.query(Exam).filter(Exam.id == assignment.exam_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        if exam.teacher_id != user.id and user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        db.delete(assignment)
        db.commit()

    @staticmethod
    def get_my_exams(db: Session, user: User) -> list[ExamAssignment]:
        ExamService._transition_statuses(db)
        return (
            db.query(ExamAssignment)
            .filter(ExamAssignment.student_id == user.id)
            .order_by(ExamAssignment.assigned_at.desc())
            .all()
        )

    @staticmethod
    def get_offline_package(
        db: Session,
        exam_id: int,
        user: User,
        ip_address: str | None = None,
        device_info: str | None = None,
    ) -> dict:
        ExamService._transition_statuses(db)

        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        if exam.status not in ("scheduled", "active"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam is not available for download. Only scheduled or active exams can be downloaded.",
            )

        assignment = (
            db.query(ExamAssignment)
            .filter(
                ExamAssignment.exam_id == exam_id,
                ExamAssignment.student_id == user.id,
            )
            .first()
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this exam",
            )

        exam_questions = (
            db.query(ExamQuestion)
            .filter(ExamQuestion.exam_id == exam_id)
            .order_by(ExamQuestion.order_index)
            .all()
        )

        session_token = secrets.token_urlsafe(48)

        session = ExamSession(
            exam_id=exam_id,
            student_id=user.id,
            assignment_id=assignment.id,
            session_token=session_token,
            status="downloaded",
            ip_address=ip_address,
            device_info=device_info,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        questions_data = []
        for eq in exam_questions:
            q = eq.question
            questions_data.append({
                "id": q.id,
                "subject": q.subject,
                "topic": q.topic,
                "difficulty": q.difficulty,
                "question_type": q.question_type,
                "question_text": q.question_text,
                "options": q.options,
                "marks": eq.marks,
                "explanation": q.explanation,
                "order_index": eq.order_index,
            })

        return {
            "exam": exam,
            "questions": questions_data,
            "assignment_id": assignment.id,
            "session_token": session_token,
            "downloaded_at": session.downloaded_at,
        }

    @staticmethod
    def sync_answers(
        db: Session,
        exam_id: int,
        user: User,
        body: AnswerSyncRequest,
    ) -> dict:
        session = db.query(ExamSession).filter(
            ExamSession.session_token == body.session_token,
        ).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        if session.student_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Session does not belong to this student")
        if session.exam_id != exam_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session does not match this exam")

        assignment = session.assignment
        if assignment.status == "submitted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam already submitted. Only a teacher can reopen it.",
            )

        now = datetime.now(timezone.utc)

        if session.status == "downloaded":
            session.status = "started"

        existing = db.query(StudentAnswer).filter(
            StudentAnswer.exam_session_id == session.id,
        ).all()
        existing_map = {a.question_id: a for a in existing}

        for item in body.answers:
            if item.question_id in existing_map:
                ans = existing_map[item.question_id]
                ans.answer_text = item.answer_text
                ans.selected_option = item.selected_option
                ans.answer_type = item.answer_type
                ans.local_saved_at = item.local_saved_at
                ans.synced_at = now
                ans.sync_status = "synced"
                ans.word_count = item.word_count
                ans.edit_count = item.edit_count
                ans.time_spent_seconds = item.time_spent_seconds
            else:
                ans = StudentAnswer(
                    exam_session_id=session.id,
                    exam_id=exam_id,
                    student_id=user.id,
                    question_id=item.question_id,
                    answer_text=item.answer_text,
                    selected_option=item.selected_option,
                    answer_type=item.answer_type,
                    local_saved_at=item.local_saved_at,
                    synced_at=now,
                    sync_status="synced",
                    word_count=item.word_count,
                    edit_count=item.edit_count,
                    time_spent_seconds=item.time_spent_seconds,
                )
                db.add(ans)

        submitted_at = None
        if body.final_submission:
            session.status = "submitted"
            session.submitted_at = now
            assignment.status = "submitted"
            assignment.submitted_at = now
            submitted_at = now

        db.commit()

        return {
            "message": "Answers synced successfully",
            "synced_count": len(body.answers),
            "session_status": session.status,
            "submitted_at": submitted_at,
        }

    @staticmethod
    def get_my_submission(db: Session, exam_id: int, user: User) -> dict:
        assignment = db.query(ExamAssignment).filter(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.student_id == user.id,
        ).first()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to this exam")

        session = db.query(ExamSession).filter(
            ExamSession.exam_id == exam_id,
            ExamSession.student_id == user.id,
            ExamSession.assignment_id == assignment.id,
        ).order_by(ExamSession.downloaded_at.desc()).first()

        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No exam session found. Download the offline package first.")

        answers = db.query(StudentAnswer).filter(
            StudentAnswer.exam_session_id == session.id,
        ).order_by(StudentAnswer.id).all()

        total = db.query(ExamQuestion).filter(
            ExamQuestion.exam_id == exam_id,
        ).count()

        answered = sum(1 for a in answers if a.answer_text or a.selected_option)

        return {
            "exam_id": exam_id,
            "assignment_id": assignment.id,
            "assignment_status": assignment.status,
            "submitted_at": assignment.submitted_at,
            "answers": answers,
            "total_questions": total,
            "answered_count": answered,
        }
