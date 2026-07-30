import json
import random
import re
import secrets
from datetime import datetime, timedelta, timezone

# pyrefly: ignore [missing-import]
from fastapi import HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.exam import Exam, ExamAssignment, ExamQuestion, ExamSession, StudentAnswer
from app.models.user import User
from app.schemas.exam import AnswerSyncRequest, ExamCreate, ExamQuestionBulkCreate, ExamRescheduleRequest, ExamUpdate


def _words_match(student_answer: str, correct_answer: str) -> bool:
    student_words = re.findall(r"[a-zA-Z0-9]+", student_answer.lower())
    correct_words = re.findall(r"[a-zA-Z0-9]+", correct_answer.lower())
    return student_words == correct_words


class ExamService:
    @staticmethod
    def _log_audit(db: Session, user_id: int, action: str, details: str | None = None):
        db.add(AuditLog(user_id=user_id, action=action, details=details))
        db.flush()

    @staticmethod
    def _transition_statuses(db: Session):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for exam in db.query(Exam).filter(Exam.status == "scheduled").all():
            st = exam.start_time
            if st.tzinfo:
                st = st.astimezone(timezone.utc).replace(tzinfo=None)
            if st <= now:
                exam.status = "active"
        for exam in db.query(Exam).filter(Exam.status == "active").all():
            effective_end = exam.end_time + timedelta(minutes=exam.grace_period_minutes or 0)
            if effective_end.tzinfo:
                effective_end = effective_end.astimezone(timezone.utc).replace(tzinfo=None)
            if effective_end <= now:
                exam.status = "completed"
                # Auto-submit all open sessions
                for s in db.query(ExamSession).filter(
                    ExamSession.exam_id == exam.id,
                    ExamSession.status.in_(["downloaded", "started"]),
                ).all():
                    s.status = "submitted"
                    s.submitted_at = now
                    s.assignment.status = "submitted"
                    s.assignment.submitted_at = now
                # Also mark assignments with no session as submitted
                for a in db.query(ExamAssignment).filter(
                    ExamAssignment.exam_id == exam.id,
                    ExamAssignment.status == "assigned",
                ).all():
                    a.status = "submitted"
                    a.submitted_at = now
        # Catch stale "assigned" assignments on already-completed exams
        for a in db.query(ExamAssignment).filter(
            ExamAssignment.status == "assigned",
            ExamAssignment.exam_id.in_(
                db.query(Exam.id).filter(Exam.status == "completed")
            ),
        ).all():
            a.status = "submitted"
            a.submitted_at = now
        db.commit()

    @staticmethod
    def create(db: Session, data: ExamCreate, teacher: User) -> Exam:
        if data.end_time <= data.start_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be after start_time")
        existing = db.query(Exam).filter(Exam.teacher_id == teacher.id, Exam.title == data.title).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"An exam with the title '{data.title}' already exists")
        if data.status == "scheduled" and data.start_time <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot schedule an exam with a past start time")
        if data.grace_period_minutes < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="grace_period_minutes cannot be negative")
        if data.late_entry_cutoff_minutes < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="late_entry_cutoff_minutes cannot be negative")
        exam = Exam(
            teacher_id=teacher.id,
            title=data.title,
            subject=data.subject,
            description=data.description,
            duration_minutes=data.duration_minutes,
            total_marks=data.total_marks,
            start_time=data.start_time,
            end_time=data.end_time,
            timezone=data.timezone,
            grace_period_minutes=data.grace_period_minutes,
            allow_late_entry=data.allow_late_entry,
            late_entry_cutoff_minutes=data.late_entry_cutoff_minutes,
            is_offline_enabled=data.is_offline_enabled,
            tab_switch_limit=data.tab_switch_limit,
            camera_required=data.camera_required,
            voice_verification_enabled=data.voice_verification_enabled,
            adaptive_difficulty_enabled=data.adaptive_difficulty_enabled,
            zero_knowledge_generation_enabled=data.zero_knowledge_generation_enabled,
            exam_type=data.exam_type,
            difficulty_level=data.difficulty_level,
            passing_marks=data.passing_marks,
            status=data.status,
        )
        db.add(exam)
        db.flush()
        ExamService._log_audit(db, teacher.id, "exam_created", f"Created exam '{data.title}' (id={exam.id})")
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
        if user.role == "admin":
            return exam
        if user.role == "teacher":
            if exam.teacher_id != user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this exam")
            return exam
        # Student — check if assigned
        assignment = (
            db.query(ExamAssignment)
            .filter(
                ExamAssignment.exam_id == exam_id,
                ExamAssignment.student_id == user.id,
            )
            .first()
        )
        if not assignment:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to this exam")
        return exam

    @staticmethod
    def update(db: Session, exam_id: int, data: ExamUpdate, user: User) -> Exam:
        exam = ExamService.get_by_id(db, exam_id, user)

        if exam.status == "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify a completed exam")

        update_data = data.model_dump(exclude_unset=True)

        if exam.status == "active" and any(f != "status" for f in update_data):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only status changes are allowed for an active exam")

        if "title" in update_data and update_data["title"] != exam.title:
            conflict = db.query(Exam).filter(Exam.teacher_id == exam.teacher_id, Exam.title == update_data["title"], Exam.id != exam.id).first()
            if conflict:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"An exam with the title '{update_data['title']}' already exists")

        if "status" in update_data:
            new_status = update_data["status"]
            valid_transitions = {
                "draft": {"draft", "scheduled"},
                "scheduled": {"draft", "scheduled"},
                "active": {"completed"},
                "completed": set(),
                "cancelled": set(),
            }
            if new_status not in valid_transitions.get(exam.status, set()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot transition status from '{exam.status}' to '{new_status}'"
                )

            if new_status == "scheduled" and exam.status != "scheduled":
                question_count = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).count()
                if question_count == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot publish an exam with no questions. Add at least one question first."
                    )

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
    def cancel(db: Session, exam_id: int, reason: str, user: User) -> Exam:
        exam = ExamService.get_by_id(db, exam_id, user)
        if exam.status == "cancelled":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exam is already cancelled")
        if exam.status == "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a completed exam")
        exam.status = "cancelled"
        exam.cancellation_reason = reason
        ExamService._log_audit(db, user.id, "exam_cancelled", f"Cancelled exam '{exam.title}' (id={exam.id}): {reason}")
        db.commit()
        db.refresh(exam)
        return exam

    @staticmethod
    def reschedule(db: Session, exam_id: int, data: ExamRescheduleRequest, user: User) -> Exam:
        exam = ExamService.get_by_id(db, exam_id, user)
        if exam.status != "scheduled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reschedule an exam with status '{exam.status}'. Only scheduled exams can be rescheduled."
            )
        if data.new_start_time <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New start time must be in the future")
        if exam.original_start_time is None:
            exam.original_start_time = exam.start_time
        old_start = exam.start_time
        exam.start_time = data.new_start_time
        exam.end_time = data.new_end_time
        exam.reschedule_reason = data.reason
        ExamService._log_audit(
            db, user.id, "exam_rescheduled",
            f"Rescheduled exam '{exam.title}' (id={exam.id}): old_start={old_start.isoformat()}, new_start={data.new_start_time.isoformat()}, reason={data.reason}"
        )
        db.commit()
        db.refresh(exam)
        return exam

    @staticmethod
    def _find_conflicts(
        db: Session,
        teacher_id: int,
        start_time: datetime,
        end_time: datetime,
        exclude_exam_id: int | None = None,
    ) -> list[Exam]:
        query = db.query(Exam).filter(
            Exam.teacher_id == teacher_id,
            Exam.status.in_(["scheduled", "active"]),
            Exam.start_time < end_time,
            Exam.end_time > start_time,
        )
        if exclude_exam_id is not None:
            query = query.filter(Exam.id != exclude_exam_id)
        return query.order_by(Exam.start_time).all()

    @staticmethod
    def check_conflicts(
        db: Session,
        teacher_id: int,
        start_time: datetime,
        end_time: datetime,
        exclude_exam_id: int | None = None,
    ) -> dict:
        conflicting = ExamService._find_conflicts(db, teacher_id, start_time, end_time, exclude_exam_id)
        return {
            "has_conflict": len(conflicting) > 0,
            "conflicts": conflicting,
        }

    @staticmethod
    def check_student_conflicts(
        db: Session, student_id: int, start_time: datetime, end_time: datetime
    ) -> list[dict]:
        assignments = db.query(ExamAssignment).filter(
            ExamAssignment.student_id == student_id,
        ).all()
        conflicts = []
        for a in assignments:
            e = a.exam
            if e.status not in ("scheduled", "active"):
                continue
            if e.start_time < end_time and e.end_time > start_time:
                conflicts.append({
                    "student_id": student_id,
                    "exam_id": e.id,
                    "exam_title": e.title,
                    "exam_start_time": e.start_time,
                    "exam_end_time": e.end_time,
                })
        return conflicts

    @staticmethod
    def add_questions(db: Session, exam_id: int, data: ExamQuestionBulkCreate, user: User) -> list[ExamQuestion]:
        exam = ExamService.get_by_id(db, exam_id, user)
        if exam.status in ("active", "completed"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot modify questions on a {exam.status} exam")
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
        if exam.status == "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign students to a completed exam")
        if exam.status == "cancelled":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign students to a cancelled exam")
        # Check student conflicts
        conflict_students = []
        for sid in student_ids:
            if ExamService.check_student_conflicts(db, sid, exam.start_time, exam.end_time):
                conflict_students.append(sid)
        if conflict_students:
            conflict_names = db.query(User).filter(User.id.in_(conflict_students)).all()
            names = ", ".join(u.display_name or u.username or f"id={u.id}" for u in conflict_names)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot assign. The following students already have an exam during this time slot: {names}"
            )
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
    def get_my_results(db: Session, user: User) -> list[dict]:
        ExamService._transition_statuses(db)
        assignments = (
            db.query(ExamAssignment)
            .filter(
                ExamAssignment.student_id == user.id,
                ExamAssignment.status == "submitted",
            )
            .order_by(ExamAssignment.submitted_at.desc())
            .all()
        )
        results = []
        for a in assignments:
            try:
                submission = ExamService.get_my_submission(db, a.exam_id, user)
            except HTTPException:
                continue
            exam = a.exam
            results.append({
                "exam_id": a.exam_id,
                "exam_title": exam.title if exam else "",
                "exam_subject": exam.subject if exam else "",
                "total_marks": exam.total_marks if exam else 0,
                "submitted_at": a.submitted_at,
                "score_percentage": submission.get("score_percentage"),
                "correct_count": submission.get("correct_count"),
                "total_questions": submission.get("total_questions"),
                "integrity_percentage": submission.get("integrity_percentage"),
            })
        return results

    @staticmethod
    def get_core_analytics(db: Session, user: User) -> dict:
        ExamService._transition_statuses(db)
        assignments = (
            db.query(ExamAssignment)
            .filter(
                ExamAssignment.student_id == user.id,
                ExamAssignment.status == "submitted",
            )
            .all()
        )
        if not assignments:
            return {
                "overall_average_score": None,
                "highest_score": None,
                "lowest_score": None,
                "pass_percentage": None,
                "total_exams_completed": 0,
                "total_exams_attempted": 0,
                "total_time_spent_seconds": 0,
                "average_time_per_exam_seconds": 0,
            }

        scores = []
        passed = 0
        total_exams = len(assignments)
        total_time = 0

        for a in assignments:
            try:
                submission = ExamService.get_my_submission(db, a.exam_id, user)
            except HTTPException:
                continue
            sp = submission.get("score_percentage")
            if sp is None:
                continue
            scores.append(sp)

            exam = a.exam
            pass_mark = (exam.passing_marks if exam.passing_marks else max(1, int(exam.total_marks * 0.4)))
            earned = (sp / 100.0) * exam.total_marks
            if earned >= pass_mark:
                passed += 1

        if not scores:
            return {
                "overall_average_score": None,
                "highest_score": None,
                "lowest_score": None,
                "pass_percentage": None,
                "total_exams_completed": total_exams,
                "total_exams_attempted": len(scores),
                "total_time_spent_seconds": 0,
                "average_time_per_exam_seconds": 0,
            }

        sessions_with_time = (
            db.query(ExamSession)
            .filter(
                ExamSession.student_id == user.id,
                ExamSession.status == "submitted",
            )
            .all()
        )
        session_ids = [s.id for s in sessions_with_time]
        if session_ids:
            time_result = db.query(
                sa_func.coalesce(sa_func.sum(StudentAnswer.time_spent_seconds), 0)
            ).filter(
                StudentAnswer.exam_session_id.in_(session_ids),
            ).scalar()
            total_time += time_result

        avg_score = round(sum(scores) / len(scores), 2)
        high = round(max(scores), 2)
        low = round(min(scores), 2)
        pass_pct = round((passed / len(scores)) * 100, 2)
        avg_time = round(total_time / len(scores)) if scores else 0

        return {
            "overall_average_score": avg_score,
            "highest_score": high,
            "lowest_score": low,
            "pass_percentage": pass_pct,
            "total_exams_completed": total_exams,
            "total_exams_attempted": len(scores),
            "total_time_spent_seconds": total_time,
            "average_time_per_exam_seconds": avg_time,
        }

    @staticmethod
    def get_weekly_progress(db: Session, user: User) -> dict:
        ExamService._transition_statuses(db)
        import calendar
        assignments = (
            db.query(ExamAssignment)
            .filter(
                ExamAssignment.student_id == user.id,
                ExamAssignment.status == "submitted",
                ExamAssignment.submitted_at.isnot(None),
            )
            .order_by(ExamAssignment.submitted_at.asc())
            .all()
        )
        if not assignments:
            return {"weekly_progress": [], "has_data": False}

        week_map = {}
        for a in assignments:
            try:
                submission = ExamService.get_my_submission(db, a.exam_id, user)
            except HTTPException:
                continue
            sp = submission.get("score_percentage")
            if sp is None:
                continue
            submitted = a.submitted_at
            if submitted.tzinfo:
                submitted = submitted.astimezone(timezone.utc).replace(tzinfo=None)
            iso_year, iso_week, iso_day = submitted.isocalendar()
            week_start = datetime.fromisocalendar(iso_year, iso_week, 1)
            week_end = datetime.fromisocalendar(iso_year, iso_week, 7)
            key = f"{iso_year}-W{iso_week:02d}"
            if key not in week_map:
                week_map[key] = {"scores": [], "week_start": week_start, "week_end": week_end}
            week_map[key]["scores"].append(sp)

        weekly_progress = []
        for key in sorted(week_map.keys()):
            entry = week_map[key]
            scores = entry["scores"]
            weekly_progress.append({
                "week_start": entry["week_start"].strftime("%Y-%m-%d"),
                "week_end": entry["week_end"].strftime("%Y-%m-%d"),
                "average_score": round(sum(scores) / len(scores), 2) if scores else None,
                "exams_count": len(scores),
            })

        return {"weekly_progress": weekly_progress, "has_data": True}

    @staticmethod
    def get_learning_streak(db: Session, user: User) -> dict:
        ExamService._transition_statuses(db)
        assignment_dates = (
            db.query(ExamAssignment.submitted_at)
            .filter(
                ExamAssignment.student_id == user.id,
                ExamAssignment.status == "submitted",
                ExamAssignment.submitted_at.isnot(None),
            )
            .all()
        )
        if not assignment_dates:
            return {"current_streak": 0, "longest_streak": 0, "has_data": False}

        unique_days = set()
        for (d,) in assignment_dates:
            if d.tzinfo:
                d = d.astimezone(timezone.utc).replace(tzinfo=None)
            unique_days.add(d.date())

        sorted_days = sorted(unique_days)
        if not sorted_days:
            return {"current_streak": 0, "longest_streak": 0, "has_data": False}

        from datetime import timedelta as td
        longest = 1
        current_run = 1
        for i in range(1, len(sorted_days)):
            if (sorted_days[i] - sorted_days[i - 1]).days == 1:
                current_run += 1
                longest = max(longest, current_run)
            else:
                current_run = 1

        today = datetime.now(timezone.utc).date()
        yesterday = today - td(days=1)
        if sorted_days[-1] in (today, yesterday):
            current_streak = 1
            for i in range(len(sorted_days) - 2, -1, -1):
                if (sorted_days[i + 1] - sorted_days[i]).days == 1:
                    current_streak += 1
                else:
                    break
        else:
            current_streak = 0

        return {"current_streak": current_streak, "longest_streak": longest, "has_data": True}

    @staticmethod
    def get_topic_mastery(db: Session, user: User) -> dict:
        ExamService._transition_statuses(db)
        assignments = (
            db.query(ExamAssignment)
            .filter(
                ExamAssignment.student_id == user.id,
                ExamAssignment.status == "submitted",
            )
            .all()
        )
        if not assignments:
            return {"topics": [], "has_data": False}

        from app.models.question import Question

        topic_stats = {}
        for a in assignments:
            session = db.query(ExamSession).filter(
                ExamSession.exam_id == a.exam_id,
                ExamSession.student_id == user.id,
                ExamSession.assignment_id == a.id,
            ).order_by(ExamSession.downloaded_at.desc()).first()
            if not session:
                continue

            answers = db.query(StudentAnswer).filter(
                StudentAnswer.exam_session_id == session.id,
            ).all()

            exam_questions = db.query(ExamQuestion).filter(
                ExamQuestion.exam_id == a.exam_id,
            ).all()
            eq_map = {eq.question_id: eq for eq in exam_questions}

            for ans in answers:
                eq = eq_map.get(ans.question_id)
                if not eq or not eq.question:
                    continue
                question = eq.question
                topic = question.topic
                subject = question.subject

                if topic not in topic_stats:
                    topic_stats[topic] = {
                        "topic": topic,
                        "subject": subject,
                        "total_questions": 0,
                        "correct_count": 0,
                    }

                topic_stats[topic]["total_questions"] += 1
                is_correct = False
                if question.question_type == "mcq":
                    if ans.answer_text and ans.answer_text.strip().lower() == question.correct_answer.strip().lower():
                        is_correct = True
                else:
                    if ans.answer_text and _words_match(ans.answer_text, question.correct_answer):
                        is_correct = True
                if is_correct:
                    topic_stats[topic]["correct_count"] += 1

        topics = []
        for t in sorted(topic_stats.keys()):
            s = topic_stats[t]
            avg = round((s["correct_count"] / s["total_questions"]) * 100, 2) if s["total_questions"] > 0 else None
            status = "unknown"
            if avg is not None:
                if avg >= 75:
                    status = "strong"
                elif avg >= 40:
                    status = "average"
                else:
                    status = "weak"
            topics.append({
                "topic": s["topic"],
                "subject": s["subject"],
                "average_score": avg,
                "total_questions": s["total_questions"],
                "correct_count": s["correct_count"],
                "status": status,
            })

        return {"topics": topics, "has_data": len(topics) > 0}

    # ── Ranking ──
    @staticmethod
    def _student_avg_score(db: Session, student: User) -> float | None:
        assignments = (
            db.query(ExamAssignment)
            .filter(
                ExamAssignment.student_id == student.id,
                ExamAssignment.status == "submitted",
            )
            .all()
        )
        if not assignments:
            return None

        scores = []
        for a in assignments:
            session = (
                db.query(ExamSession)
                .filter(
                    ExamSession.exam_id == a.exam_id,
                    ExamSession.student_id == student.id,
                    ExamSession.assignment_id == a.id,
                )
                .order_by(ExamSession.downloaded_at.desc())
                .first()
            )
            if not session:
                continue

            exam_questions = (
                db.query(ExamQuestion).filter(ExamQuestion.exam_id == a.exam_id).all()
            )
            eq_map = {eq.question_id: eq for eq in exam_questions}
            answers = (
                db.query(StudentAnswer)
                .filter(StudentAnswer.exam_session_id == session.id)
                .all()
            )
            if not answers or not exam_questions:
                continue

            total_marks = sum(eq.marks for eq in exam_questions)
            earned = 0
            total_q = len(exam_questions)
            correct_q = 0

            for ans in answers:
                eq = eq_map.get(ans.question_id)
                if not eq or not eq.question:
                    continue
                q = eq.question
                is_correct = False
                if q.question_type == "mcq":
                    if ans.answer_text and ans.answer_text.strip().lower() == q.correct_answer.strip().lower():
                        is_correct = True
                else:
                    if ans.answer_text and _words_match(ans.answer_text, q.correct_answer):
                        is_correct = True
                if is_correct:
                    correct_q += 1
                    earned += eq.marks

            if total_marks > 0:
                scores.append(round((earned / total_marks * 100), 2))
            elif total_q > 0:
                scores.append(round((correct_q / total_q * 100), 2))

        return round(sum(scores) / len(scores), 2) if scores else None

    @staticmethod
    def get_ranking(db: Session, user: User) -> dict:
        ExamService._transition_statuses(db)

        my_score = ExamService._student_avg_score(db, user)
        if my_score is None:
            return {
                "institution_rank": None,
                "department_rank": None,
                "batch_rank": None,
                "overall_rank": None,
                "has_data": False,
            }

        all_students = db.query(User).filter(User.role == "student").all()
        student_scores: dict[int, float] = {}
        for s in all_students:
            sc = ExamService._student_avg_score(db, s)
            if sc is not None:
                student_scores[s.id] = sc

        def _compute_rank(
            candidate_ids: set[int], label: str
        ) -> dict | None:
            filtered = {
                sid: sc for sid, sc in student_scores.items() if sid in candidate_ids
            }
            if not filtered or user.id not in filtered:
                return None
            sorted_ids = sorted(filtered, key=lambda sid: (-filtered[sid], sid))
            rank = sorted_ids.index(user.id) + 1
            return {
                "rank": rank,
                "total_students": len(sorted_ids),
                "average_score": my_score,
                "label": label,
            }

        same_institution = {s.id for s in all_students if s.institution_id == user.institution_id}
        same_department = {s.id for s in all_students if s.department_id == user.department_id}
        same_batch = {s.id for s in all_students if s.batch and s.batch == user.batch}

        inst_label = (
            user.institution.name if user.institution and hasattr(user.institution, "name") and user.institution.name
            else f"Institution #{user.institution_id}" if user.institution_id
            else "Institution"
        )

        return {
            "institution_rank": _compute_rank(same_institution, inst_label) if user.institution_id else None,
            "department_rank": _compute_rank(same_department, user.department.name if user.department else "Department") if user.department_id else None,
            "batch_rank": _compute_rank(same_batch, f"Batch {user.batch}") if user.batch else None,
            "overall_rank": _compute_rank(
                {s.id for s in all_students if s.id in student_scores}, "Overall"
            ),
            "has_data": True,
        }

    # ── Integrity Breakdown ──
    @staticmethod
    def get_integrity_breakdown(db: Session, user: User) -> dict:
        from app.models.proctor_event import ProctorEvent
        from app.models.risk_report import ProctorRiskReport

        ExamService._transition_statuses(db)

        reports = (
            db.query(ProctorRiskReport)
            .filter(ProctorRiskReport.student_id == user.id)
            .all()
        )
        if not reports:
            return {
                "overall_integrity": None,
                "integrity_by_exam": [],
                "event_breakdown": [],
                "has_data": False,
            }

        integrity_by_exam = []
        total_integrity_sum = 0.0
        total_weight = 0

        for r in reports:
            exam = db.query(Exam).filter(Exam.id == r.exam_id).first()
            integrity_pct = max(0.0, 100.0 - r.risk_score * 20.0)
            integrity_pct = round(min(integrity_pct, 100.0), 2)
            total_integrity_sum += integrity_pct
            total_weight += 1
            integrity_by_exam.append({
                "exam_id": r.exam_id,
                "exam_title": exam.title if exam else f"Exam #{r.exam_id}",
                "integrity_percentage": integrity_pct,
                "total_events": r.total_events,
            })

        overall_integrity = round(total_integrity_sum / total_weight, 2) if total_weight > 0 else None

        events = (
            db.query(
                ProctorEvent.event_type,
                ProctorEvent.severity,
                sa_func.count(ProctorEvent.id).label("cnt"),
            )
            .filter(ProctorEvent.student_id == user.id)
            .group_by(ProctorEvent.event_type, ProctorEvent.severity)
            .all()
        )
        event_breakdown = [
            {"event_type": e.event_type, "count": e.cnt, "severity": e.severity}
            for e in events
        ]

        return {
            "overall_integrity": overall_integrity,
            "integrity_by_exam": integrity_by_exam,
            "event_breakdown": event_breakdown,
            "has_data": True,
        }

    # ── Offline Package ──
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

        now = datetime.now(timezone.utc)
        if exam.status == "active" and not exam.allow_late_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Late entry is not allowed for this exam. The exam has already started.",
            )
        if exam.late_entry_cutoff_minutes > 0:
            cutoff = exam.start_time + timedelta(minutes=exam.late_entry_cutoff_minutes)
            if cutoff.tzinfo:
                cutoff = cutoff.astimezone(timezone.utc)
            if now > cutoff:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The late entry window closed {exam.late_entry_cutoff_minutes} minutes after the exam start time.",
                )

        if exam.registered_device_only:
            from app.models.device import Device
            device_count = db.query(Device).filter(Device.user_id == user.id).count()
            if device_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This exam requires a registered device. Register your device first via POST /devices/register.",
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

        # Deterministic shuffle based on session_token
        rng = random.Random(session_token)

        exam_questions_list = list(exam_questions)
        if exam.randomize_questions:
            rng.shuffle(exam_questions_list)

        questions_data = []
        for eq in exam_questions_list:
            q = eq.question
            opts = q.options
            if exam.shuffle_options and q.question_type == "mcq" and opts:
                try:
                    parsed = json.loads(opts) if isinstance(opts, str) else list(opts)
                    rng.shuffle(parsed)
                    opts = json.dumps(parsed)
                except (json.JSONDecodeError, TypeError):
                    pass
            questions_data.append({
                "id": q.id,
                "subject": q.subject,
                "topic": q.topic,
                "difficulty": q.difficulty,
                "question_type": q.question_type,
                "question_text": q.question_text,
                "options": opts,
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


    # ── Answer Sync ──

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

        # ── Device binding check ──
        # If the session has been bound to a device, reject requests that either
        # lack a fingerprint or provide a different one.
        if session.device_fingerprint:
            if not body.device_fingerprint:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This session is bound to a device. Provide device_fingerprint.",
                )
            if body.device_fingerprint != session.device_fingerprint:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Device fingerprint mismatch. This session is bound to another device.",
                )
        assignment = session.assignment
        if assignment.status == "submitted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam already submitted. Only a teacher can reopen it.",
            )

        now = datetime.now(timezone.utc)
        # Check if past effective end (end_time + grace period)
        exam = session.exam
        effective_end = exam.end_time + timedelta(minutes=exam.grace_period_minutes or 0)
        if effective_end.tzinfo:
            effective_end_utc = effective_end.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            effective_end_utc = effective_end
        if effective_end_utc <= now.replace(tzinfo=None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The exam submission window has closed (including grace period). Answers can no longer be synced.",
            )

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

        # Get all exam questions to map marks and evaluate correct answers
        exam = session.exam
        exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()
        eq_map = {eq.question_id: eq for eq in exam_questions}

        total = len(exam_questions)
        answered = sum(1 for a in answers if a.answer_text or a.selected_option)

        correct_count = 0
        total_marks = 0
        earned_marks = 0

        for ans in answers:
            eq = eq_map.get(ans.question_id)
            if not eq:
                continue
            question = eq.question
            if not question:
                continue

            total_marks += eq.marks

            # Determine correctness of the student answer
            is_correct = False
            if question.question_type == "mcq":
                if ans.answer_text and ans.answer_text.strip().lower() == question.correct_answer.strip().lower():
                    is_correct = True
                elif not exam.shuffle_options and ans.selected_option and ans.selected_option.strip().lower() == question.correct_answer.strip().lower():
                    is_correct = True
                else:
                    try:
                        opts = json.loads(question.options) if question.options else []
                        if question.correct_answer.isdigit():
                            idx = int(question.correct_answer)
                            if 0 <= idx < len(opts) and ans.answer_text and ans.answer_text.strip().lower() == opts[idx].strip().lower():
                                is_correct = True
                        if not exam.shuffle_options and ans.selected_option and ans.selected_option.isdigit():
                            sel_idx = int(ans.selected_option)
                            if 0 <= sel_idx < len(opts) and opts[sel_idx].strip().lower() == question.correct_answer.strip().lower():
                                is_correct = True
                    except Exception:
                        pass
            else:
                # Text/subjective or direct text matching – compare word-by-word ignoring case
                if ans.answer_text and _words_match(ans.answer_text, question.correct_answer):
                    is_correct = True

            if is_correct:
                correct_count += 1
                earned_marks += eq.marks
            elif exam.negative_marking_enabled:
                earned_marks -= exam.negative_marks_per_question

        # If total_marks is 0, fall back to matching question counts
        if total_marks > 0:
            score_percentage = round((earned_marks / total_marks * 100), 2)
        elif total > 0:
            score_percentage = round((correct_count / total * 100), 2)
        else:
            score_percentage = 0.0
        score_percentage = max(0.0, score_percentage)

        # Calculate Integrity Score (100% - risk_score)
        from app.services.proctor_service import ProctorService
        risk_score = ProctorService.calculate_risk_score(db, session.id)
        integrity_percentage = max(0.0, 100.0 - risk_score)

        return {
            "exam_id": exam_id,
            "assignment_id": assignment.id,
            "assignment_status": assignment.status,
            "submitted_at": assignment.submitted_at,
            "answers": answers,
            "total_questions": total,
            "answered_count": answered,
            "score_percentage": score_percentage,
            "correct_count": correct_count,
            "integrity_percentage": integrity_percentage,
        }
# ── Device Binding ──

@staticmethod
def bind_device(
    db: Session,
    exam_id: int,
    user: User,
    session_token: str,
    device_fingerprint: str,
) -> dict:
    session = db.query(ExamSession).filter(
        ExamSession.session_token == session_token,
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if session.student_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session does not belong to this student",
        )

    if session.exam_id != exam_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session does not match this exam",
        )

    if session.device_fingerprint and session.device_fingerprint != device_fingerprint:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session is already bound to a different device.",
        )

    from app.models.device import Device

    device = db.query(Device).filter(
        Device.user_id == user.id,
        Device.device_fingerprint == device_fingerprint,
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device not registered. Register it first via POST /devices/register.",
        )

    session.device_fingerprint = device_fingerprint

    if session.status == "downloaded":
        session.status = "started"

    db.commit()
    db.refresh(session)

    return {
        "message": "Device bound successfully",
        "session_token": session.session_token,
        "device_fingerprint": session.device_fingerprint,
        "session_status": session.status,
    }