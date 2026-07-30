import json
import math
import random
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.evaluation import AnswerEvaluation, ExamEvaluationStatus
from app.models.exam import Exam, ExamAssignment, ExamQuestion, ExamSession, StudentAnswer
from app.models.question import Question
from app.models.user import User
from app.services.proctor_service import ProctorService


def _words_match(answer_text: str, correct_text: str) -> bool:
    import re
    a_words = set(re.findall(r"[a-zA-Z0-9]+", answer_text.lower()))
    c_words = set(re.findall(r"[a-zA-Z0-9]+", correct_text.lower()))
    if not c_words:
        return False
    return len(a_words & c_words) / len(c_words) >= 0.6


class EvaluationService:

    @staticmethod
    def get_dashboard(db: Session, exam_id: int, teacher_id: int) -> dict:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == teacher_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        total_marks = exam.total_marks
        exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()
        eq_map = {eq.question_id: eq for eq in exam_questions}
        total_questions = len(exam_questions)

        assignments = db.query(ExamAssignment).filter(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.status.in_(["submitted", "reviewed"]),
        ).all()

        total_students = db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id).count()
        submitted_count = len(assignments)
        student_ids = [a.student_id for a in assignments]

        evaluations = db.query(AnswerEvaluation).filter(
            AnswerEvaluation.exam_id == exam_id,
            AnswerEvaluation.student_id.in_(student_ids) if student_ids else True,
        ).all()

        eval_by_student = {}
        flag_by_student = {}
        for ev in evaluations:
            eval_by_student.setdefault(ev.student_id, {})[ev.question_id] = ev
            if ev.flag and ev.flag != "none" and not ev.flag_resolved:
                flag_by_student[ev.student_id] = True

        evaluated_count = 0
        flagged_count = len(flag_by_student)
        total_score_sum = 0.0
        highest = 0.0
        lowest = float("inf")
        total_auto = 0
        total_manual = 0

        for a in assignments:
            session = db.query(ExamSession).filter(
                ExamSession.exam_id == exam_id,
                ExamSession.student_id == a.student_id,
                ExamSession.assignment_id == a.id,
            ).order_by(ExamSession.downloaded_at.desc()).first()

            if not session:
                continue

            answers = db.query(StudentAnswer).filter(
                StudentAnswer.exam_session_id == session.id,
            ).all()

            student_eval = eval_by_student.get(a.student_id, {})
            student_score = 0.0
            student_total = 0
            manual_count = 0
            auto_count = 0

            for ans in answers:
                eq = eq_map.get(ans.question_id)
                if not eq:
                    continue
                question = eq.question
                if not question:
                    continue

                ev = student_eval.get(ans.question_id)
                if ev and ev.marks_awarded is not None:
                    student_score += ev.marks_awarded
                    manual_count += 1
                else:
                    is_correct = EvaluationService._check_answer_correct(ans, question, eq)
                    if is_correct:
                        student_score += eq.marks
                    auto_count += 1

                student_total += eq.marks

            if student_total > 0:
                pct = round((student_score / student_total * 100), 2)
                total_score_sum += pct
                if pct > highest:
                    highest = pct
                if pct < lowest:
                    lowest = pct

            total_evaluated = manual_count + auto_count
            if total_evaluated >= total_questions and total_questions > 0:
                evaluated_count += 1

            total_auto += auto_count
            total_manual += manual_count

        if lowest == float("inf"):
            lowest = 0.0

        avg_score = round(total_score_sum / submitted_count, 2) if submitted_count > 0 else 0.0
        progress_pct = round((evaluated_count / submitted_count * 100), 2) if submitted_count > 0 else 0.0
        total_eval_items = total_auto + total_manual
        auto_pct = round((total_auto / total_eval_items * 100), 2) if total_eval_items > 0 else 100.0
        manual_pct = round((total_manual / total_eval_items * 100), 2) if total_eval_items > 0 else 0.0

        class_name = None
        if exam.class_links:
            first_class = exam.class_links[0]
            if first_class.class_group:
                class_name = first_class.class_group.name

        return {
            "exam_id": exam_id,
            "exam_title": exam.title,
            "subject": exam.subject,
            "class_name": class_name,
            "total_students": total_students,
            "submitted_count": submitted_count,
            "evaluated_count": evaluated_count,
            "pending_count": submitted_count - evaluated_count,
            "flagged_count": flagged_count,
            "avg_score": avg_score,
            "highest_score": highest,
            "lowest_score": lowest,
            "progress_pct": progress_pct,
            "auto_graded_pct": auto_pct,
            "manual_pct": manual_pct,
            "total_marks": total_marks,
        }

    @staticmethod
    def get_evaluation_queue(
        db: Session,
        exam_id: int,
        teacher_id: int,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        sort_by: str = "name",
        sort_dir: str = "asc",
    ) -> dict:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == teacher_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()
        eq_map = {eq.question_id: eq for eq in exam_questions}
        total_questions = len(exam_questions)
        total_marks = sum(eq.marks for eq in exam_questions)

        query = db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id)

        if search:
            query = query.join(User, ExamAssignment.student_id == User.id).filter(
                User.full_name.ilike(f"%{search}%") | User.student_code.ilike(f"%{search}%")
            )

        all_assignments = query.order_by(ExamAssignment.id).all()

        items = []
        for a in all_assignments:
            student = a.student
            session = db.query(ExamSession).filter(
                ExamSession.exam_id == exam_id,
                ExamSession.student_id == a.student_id,
                ExamSession.assignment_id == a.id,
            ).order_by(ExamSession.downloaded_at.desc()).first()

            submitted = a.status in ("submitted", "reviewed")
            answers = []
            if session:
                answers = db.query(StudentAnswer).filter(
                    StudentAnswer.exam_session_id == session.id,
                ).all()

            evaluations = db.query(AnswerEvaluation).filter(
                AnswerEvaluation.exam_id == exam_id,
                AnswerEvaluation.student_id == a.student_id,
            ).all()
            eval_map = {ev.question_id: ev for ev in evaluations}

            auto_score = 0.0
            manual_score = 0.0
            final_score = 0.0
            evaluated_count = 0
            has_flag = False

            for ans in answers:
                eq = eq_map.get(ans.question_id)
                if not eq:
                    continue
                question = eq.question
                if not question:
                    continue

                ev = eval_map.get(ans.question_id)
                if ev and ev.marks_awarded is not None:
                    manual_score += ev.marks_awarded
                    final_score += ev.marks_awarded
                    evaluated_count += 1
                elif submitted:
                    is_correct = EvaluationService._check_answer_correct(ans, question, eq)
                    if is_correct:
                        auto_score += eq.marks
                        final_score += eq.marks
                    evaluated_count += 1

            total_eval_marks = auto_score + manual_score
            if not has_flag:
                for ev in evaluations:
                    if ev.flag and ev.flag != "none" and not ev.flag_resolved:
                        has_flag = True
                        break

            status_val = "pending"
            if has_flag:
                status_val = "flagged"
            elif evaluated_count >= total_questions and total_questions > 0:
                status_val = "evaluated"
            elif evaluated_count > 0:
                status_val = "in_progress"
            elif submitted:
                status_val = "pending"
            else:
                status_val = "not_submitted"

            if status_filter and status_filter != "all":
                if status_filter == "pending" and status_val not in ("pending", "in_progress"):
                    continue
                elif status_filter == "evaluated" and status_val != "evaluated":
                    continue
                elif status_filter == "flagged" and status_val != "flagged":
                    continue

            flag_val = "none"
            flag_resolved = True
            for ev in evaluations:
                if ev.flag and ev.flag != "none":
                    flag_val = ev.flag
                    flag_resolved = ev.flag_resolved
                    break

            items.append({
                "student_id": a.student_id,
                "student_name": student.full_name if student else "Unknown",
                "student_code": student.student_code if student and hasattr(student, "student_code") else str(a.student_id),
                "auto_score": round(auto_score, 2) if submitted else None,
                "manual_score": round(manual_score, 2) if submitted and manual_score > 0 else None,
                "final_score": round(final_score, 2) if submitted else None,
                "total_marks": total_marks,
                "status": status_val,
                "flag": flag_val,
                "flag_resolved": flag_resolved,
                "evaluated_count": evaluated_count,
                "total_questions": total_questions,
                "submitted": submitted,
                "submitted_at": a.submitted_at,
                "integrity_percentage": EvaluationService._get_integrity(db, session) if session else 100.0,
            })

        if sort_by == "name":
            items.sort(key=lambda x: x["student_name"].lower(), reverse=(sort_dir == "desc"))
        elif sort_by == "score":
            items.sort(key=lambda x: x["final_score"] or 0, reverse=(sort_dir == "desc"))
        elif sort_by == "status":
            items.sort(key=lambda x: x["status"], reverse=(sort_dir == "desc"))

        total = len(items)
        start = (page - 1) * per_page
        paged = items[start:start + per_page]

        return {
            "items": paged,
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    @staticmethod
    def get_student_submission(db: Session, exam_id: int, student_id: int, teacher_id: int) -> dict:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == teacher_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        assignment = db.query(ExamAssignment).filter(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.student_id == student_id,
        ).first()

        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not assigned to this exam")

        session = db.query(ExamSession).filter(
            ExamSession.exam_id == exam_id,
            ExamSession.student_id == student_id,
            ExamSession.assignment_id == assignment.id,
        ).order_by(ExamSession.downloaded_at.desc()).first()

        student = db.query(User).filter(User.id == student_id).first()

        exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).order_by(ExamQuestion.order_index).all()
        eq_map = {eq.question_id: eq for eq in exam_questions}

        answers = []
        if session:
            answers = db.query(StudentAnswer).filter(
                StudentAnswer.exam_session_id == session.id,
            ).all()
        answer_map = {a.question_id: a for a in answers}

        evaluations = db.query(AnswerEvaluation).filter(
            AnswerEvaluation.exam_id == exam_id,
            AnswerEvaluation.student_id == student_id,
        ).all()
        eval_map = {ev.question_id: ev for ev in evaluations}

        questions = []
        auto_total = 0.0
        manual_total = 0.0
        evaluated_count = 0
        total_qs = len(exam_questions)

        for eq in exam_questions:
            question = eq.question
            if not question:
                continue

            ans = answer_map.get(eq.question_id)
            ev = eval_map.get(eq.question_id)

            is_correct = None
            auto_score = None
            if ans and session:
                is_correct = EvaluationService._check_answer_correct(ans, question, eq)
                auto_score = eq.marks if is_correct else 0
                auto_total += auto_score

            if ev and ev.marks_awarded is not None:
                manual_total += ev.marks_awarded
                evaluated_count += 1
            elif ans and session:
                evaluated_count += 1

            answer_item = None
            if ans:
                answer_item = {
                    "id": ans.id,
                    "question_id": ans.question_id,
                    "answer_text": ans.answer_text,
                    "selected_option": ans.selected_option,
                    "answer_type": ans.answer_type,
                    "word_count": ans.word_count,
                    "time_spent_seconds": ans.time_spent_seconds,
                }

            eval_data = None
            if ev:
                eval_data = {
                    "marks_awarded": ev.marks_awarded,
                    "feedback": ev.feedback,
                    "flag": ev.flag or "none",
                    "flag_note": ev.flag_note,
                    "flag_resolved": ev.flag_resolved,
                    "ai_suggested_marks": ev.ai_suggested_marks,
                    "ai_confidence": ev.ai_confidence,
                    "ai_reason": ev.ai_reason,
                    "ai_suggestion_applied": ev.ai_suggestion_applied,
                    "evaluated_by": ev.evaluated_by,
                    "evaluated_at": ev.evaluated_at,
                    "is_auto_graded": ev.is_auto_graded,
                }

            questions.append({
                "question_id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "marks": eq.marks,
                "order_index": eq.order_index,
                "topic": question.topic,
                "difficulty": question.difficulty,
                "blooms_level": question.blooms_level,
                "answer": answer_item,
                "evaluation": eval_data,
                "auto_score": auto_score,
                "is_correct": is_correct,
            })

        final_total = manual_total if manual_total > 0 else auto_total
        integrity = EvaluationService._get_integrity(db, session) if session else 100.0

        return {
            "student_id": student_id,
            "student_name": student.full_name if student else "Unknown",
            "student_code": student.student_code if student and hasattr(student, "student_code") else str(student_id),
            "exam_id": exam_id,
            "exam_title": exam.title,
            "subject": exam.subject,
            "total_marks": exam.total_marks,
            "questions": questions,
            "auto_total_score": round(auto_total, 2),
            "manual_total_score": round(manual_total, 2) if manual_total > 0 else None,
            "final_total_score": round(final_total, 2),
            "evaluated_count": evaluated_count,
            "total_questions": total_qs,
            "submitted": assignment.status in ("submitted", "reviewed"),
            "submitted_at": assignment.submitted_at,
            "integrity_percentage": integrity,
        }

    @staticmethod
    def save_evaluation(db: Session, exam_id: int, teacher_id: int, data: dict) -> dict:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == teacher_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        question = db.query(Question).filter(Question.id == data["question_id"]).first()
        if not question:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

        student = db.query(User).filter(User.id == data["student_id"], User.role == "student").first()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        ev = db.query(AnswerEvaluation).filter(
            AnswerEvaluation.exam_id == exam_id,
            AnswerEvaluation.student_id == data["student_id"],
            AnswerEvaluation.question_id == data["question_id"],
        ).first()

        if not ev:
            ev = AnswerEvaluation(
                exam_id=exam_id,
                student_id=data["student_id"],
                question_id=data["question_id"],
            )
            db.add(ev)

        if "marks_awarded" in data and data["marks_awarded"] is not None:
            eq = db.query(ExamQuestion).filter(
                ExamQuestion.exam_id == exam_id,
                ExamQuestion.question_id == data["question_id"],
            ).first()
            max_marks = eq.marks if eq else question.marks
            ev.marks_awarded = max(0, min(float(data["marks_awarded"]), max_marks))
        elif "marks_awarded" in data and data["marks_awarded"] is None:
            ev.marks_awarded = None

        if "feedback" in data:
            ev.feedback = data.get("feedback")

        if "flag" in data:
            ev.flag = data.get("flag", "none")

        if "flag_note" in data:
            ev.flag_note = data.get("flag_note")

        ev.evaluated_by = teacher_id
        ev.evaluated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(ev)

        return {"message": "Evaluation saved", "saved": True}

    @staticmethod
    def request_ai_suggestion(db: Session, exam_id: int, teacher_id: int, student_id: int, question_id: int) -> dict:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == teacher_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

        session = db.query(ExamSession).filter(
            ExamSession.exam_id == exam_id,
            ExamSession.student_id == student_id,
            ExamSession.assignment_id == db.query(ExamAssignment).filter(
                ExamAssignment.exam_id == exam_id,
                ExamAssignment.student_id == student_id,
            ).first().id,
        ).order_by(ExamSession.downloaded_at.desc()).first()

        eq = db.query(ExamQuestion).filter(
            ExamQuestion.exam_id == exam_id,
            ExamQuestion.question_id == question_id,
        ).first()
        max_marks = eq.marks if eq else question.marks

        answer_text = None
        if session:
            ans = db.query(StudentAnswer).filter(
                StudentAnswer.exam_session_id == session.id,
                StudentAnswer.question_id == question_id,
            ).first()
            if ans:
                answer_text = ans.answer_text or ans.selected_option

        if not answer_text:
            suggested = round(max_marks * 0.5, 1)
            return {
                "suggested_marks": suggested,
                "confidence": 30.0,
                "reason": "No student answer found for this question.",
                "raw_response": None,
            }

        try:
            from app.services.ai_service import AIService as MainAIService

            prompt = f"""You are evaluating a student's answer. Here is the context:

Question: {question.question_text}
Question Type: {question.question_type}
Maximum Marks: {max_marks}
Topic: {question.topic or 'N/A'}
Difficulty: {question.difficulty or 'N/A'}
Bloom's Level: {question.blooms_level or 'N/A'}
Expected/Model Answer: {question.correct_answer or 'N/A'}

Student's Answer:
{answer_text}

Evaluate the student's answer and respond in JSON format:
{{
  "suggested_marks": <float between 0 and {max_marks}>,
  "confidence": <float between 0 and 100>,
  "reason": "<brief explanation of the evaluation>"
}}"""

            response = MainAIService._call_ai(prompt, model="gpt-4o-mini")
            if response and "suggested_marks" in response:
                result = response
            else:
                result = EvaluationService._mock_ai_evaluation(answer_text, question, max_marks)
        except Exception:
            result = EvaluationService._mock_ai_evaluation(answer_text, question, max_marks)

        ev = db.query(AnswerEvaluation).filter(
            AnswerEvaluation.exam_id == exam_id,
            AnswerEvaluation.student_id == student_id,
            AnswerEvaluation.question_id == question_id,
        ).first()

        if not ev:
            ev = AnswerEvaluation(
                exam_id=exam_id,
                student_id=student_id,
                question_id=question_id,
            )
            db.add(ev)

        ev.ai_suggested_marks = result["suggested_marks"]
        ev.ai_confidence = result["confidence"]
        ev.ai_reason = result["reason"]
        db.commit()

        return result

    @staticmethod
    def get_final_review(db: Session, exam_id: int, teacher_id: int) -> dict:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == teacher_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()
        eq_map = {eq.question_id: eq for eq in exam_questions}
        total_questions = len(exam_questions)

        assignments = db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id).all()
        total_students = len(assignments)
        submitted_assignments = [a for a in assignments if a.status in ("submitted", "reviewed")]
        submitted_count = len(submitted_assignments)
        not_submitted = total_students - submitted_count

        student_ids = [a.student_id for a in submitted_assignments]
        all_evaluations = db.query(AnswerEvaluation).filter(
            AnswerEvaluation.exam_id == exam_id,
        ).all() if student_ids else []

        eval_by_student = {}
        flag_count = 0
        ai_assisted = 0
        for ev in all_evaluations:
            eval_by_student.setdefault(ev.student_id, {})[ev.question_id] = ev
            if ev.flag and ev.flag != "none" and not ev.flag_resolved:
                flag_count += 1
            if ev.ai_suggested_marks is not None and ev.ai_suggestion_applied:
                ai_assisted += 1

        scores = []
        evaluated_count = 0
        pending_count = 0

        for a in submitted_assignments:
            session = db.query(ExamSession).filter(
                ExamSession.exam_id == exam_id,
                ExamSession.student_id == a.student_id,
                ExamSession.assignment_id == a.id,
            ).order_by(ExamSession.downloaded_at.desc()).first()

            if not session:
                continue

            answers = db.query(StudentAnswer).filter(
                StudentAnswer.exam_session_id == session.id,
            ).all()

            student_eval = eval_by_student.get(a.student_id, {})
            student_score = 0.0
            student_total = 0
            answered_count = 0

            for ans in answers:
                eq = eq_map.get(ans.question_id)
                if not eq:
                    continue
                question = eq.question
                if not question:
                    continue

                ev = student_eval.get(ans.question_id)
                if ev and ev.marks_awarded is not None:
                    student_score += ev.marks_awarded
                else:
                    is_correct = EvaluationService._check_answer_correct(ans, question, eq)
                    if is_correct:
                        student_score += eq.marks

                student_total += eq.marks
                answered_count += 1

            if answered_count >= total_questions and total_questions > 0:
                evaluated_count += 1

            if student_total > 0:
                pct = round((student_score / student_total * 100), 2)
                scores.append(pct)
            else:
                scores.append(0.0)

        pending_count = submitted_count - evaluated_count
        avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
        highest = max(scores) if scores else 0.0
        lowest = min(scores) if scores else 0.0

        passing_marks_pct = exam.passing_marks or 40
        pass_count = sum(1 for s in scores if s >= passing_marks_pct)
        pass_rate = round((pass_count / len(scores) * 100), 2) if scores else 0.0
        fail_rate = round(100.0 - pass_rate, 2)

        eval_status = db.query(ExamEvaluationStatus).filter(
            ExamEvaluationStatus.exam_id == exam_id,
        ).first()

        results_published = eval_status.results_published if eval_status else False
        published_at = eval_status.published_at if eval_status else None

        return {
            "exam_id": exam_id,
            "exam_title": exam.title,
            "subject": exam.subject,
            "total_students": total_students,
            "submitted_count": submitted_count,
            "not_submitted_count": not_submitted,
            "evaluated_count": evaluated_count,
            "pending_count": pending_count,
            "flagged_count": flag_count,
            "avg_score": avg_score,
            "highest_score": highest,
            "lowest_score": lowest,
            "pass_rate": pass_rate,
            "fail_rate": fail_rate,
            "ai_assisted_count": ai_assisted,
            "results_published": results_published,
            "published_at": published_at,
        }

    @staticmethod
    def get_full_report(db: Session, exam_id: int, teacher_id: int) -> dict:
        summary = EvaluationService.get_final_review(db, exam_id, teacher_id)

        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).order_by(ExamQuestion.order_index).all()
        eq_map = {eq.question_id: eq for eq in exam_questions}

        assignments = db.query(ExamAssignment).filter(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.status.in_(["submitted", "reviewed"]),
        ).all()

        all_evaluations = db.query(AnswerEvaluation).filter(
            AnswerEvaluation.exam_id == exam_id,
        ).all()
        eval_by_q = {}
        for ev in all_evaluations:
            eval_by_q.setdefault(ev.question_id, []).append(ev)

        question_analytics = []
        topic_scores = {}
        difficulty_scores = {}
        blooms_scores = {}

        score_dist = {"range_0_20": 0, "range_21_40": 0, "range_41_60": 0, "range_61_80": 0, "range_81_100": 0}

        student_scores = []
        for a in assignments:
            session = db.query(ExamSession).filter(
                ExamSession.exam_id == exam_id,
                ExamSession.student_id == a.student_id,
            ).order_by(ExamSession.downloaded_at.desc()).first()

            if not session:
                continue

            answers = db.query(StudentAnswer).filter(
                StudentAnswer.exam_session_id == session.id,
            ).all()
            answer_map = {ans.question_id: ans for ans in answers}

            total_s = 0.0
            total_max = 0
            for eq in exam_questions:
                q = eq.question
                if not q:
                    continue
                total_max += eq.marks
                ans = answer_map.get(q.id)
                evs = eval_by_q.get(q.id, [])
                ev = next((e for e in evs if e.student_id == a.student_id), None)
                if ev and ev.marks_awarded is not None:
                    total_s += ev.marks_awarded
                elif ans:
                    is_correct = EvaluationService._check_answer_correct(ans, q, eq)
                    if is_correct:
                        total_s += eq.marks

            pct = round((total_s / total_max * 100), 2) if total_max > 0 else 0
            student_scores.append(pct)

            if pct <= 20:
                score_dist["range_0_20"] += 1
            elif pct <= 40:
                score_dist["range_21_40"] += 1
            elif pct <= 60:
                score_dist["range_41_60"] += 1
            elif pct <= 80:
                score_dist["range_61_80"] += 1
            else:
                score_dist["range_81_100"] += 1

        for eq in exam_questions:
            q = eq.question
            if not q:
                continue

            q_student_count = 0
            q_earned = 0.0
            q_correct = 0
            q_incorrect = 0
            q_unanswered = 0

            for a in assignments:
                session = db.query(ExamSession).filter(
                    ExamSession.exam_id == exam_id,
                    ExamSession.student_id == a.student_id,
                ).order_by(ExamSession.downloaded_at.desc()).first()

                if not session:
                    q_unanswered += 1
                    continue

                ans = db.query(StudentAnswer).filter(
                    StudentAnswer.exam_session_id == session.id,
                    StudentAnswer.question_id == q.id,
                ).first()

                if not ans or (not ans.answer_text and not ans.selected_option):
                    q_unanswered += 1
                    continue

                q_student_count += 1
                evs = eval_by_q.get(q.id, [])
                ev = next((e for e in evs if e.student_id == a.student_id), None)
                if ev and ev.marks_awarded is not None:
                    q_earned += ev.marks_awarded
                    if ev.marks_awarded >= eq.marks * 0.5:
                        q_correct += 1
                    else:
                        q_incorrect += 1
                else:
                    is_correct = EvaluationService._check_answer_correct(ans, q, eq)
                    if is_correct:
                        q_earned += eq.marks
                        q_correct += 1
                    else:
                        q_incorrect += 1

            total_q_students = q_student_count + q_unanswered
            avg_q = round(q_earned / q_student_count, 2) if q_student_count > 0 else 0.0
            correct_pct = round((q_correct / total_q_students * 100), 2) if total_q_students > 0 else 0.0
            incorrect_pct = round((q_incorrect / total_q_students * 100), 2) if total_q_students > 0 else 0.0
            unanswered_pct = round((q_unanswered / total_q_students * 100), 2) if total_q_students > 0 else 0.0

            question_analytics.append({
                "question_id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "marks": eq.marks,
                "order_index": eq.order_index,
                "topic": q.topic,
                "difficulty": q.difficulty,
                "blooms_level": q.blooms_level,
                "avg_marks": avg_q,
                "correct_pct": correct_pct,
                "incorrect_pct": incorrect_pct,
                "unanswered_pct": unanswered_pct,
                "student_count": q_student_count,
            })

            if q.topic:
                topic_scores.setdefault(q.topic, {"count": 0, "total_pct": 0.0})
                topic_scores[q.topic]["count"] += 1
                topic_scores[q.topic]["total_pct"] += correct_pct

            if q.difficulty:
                difficulty_scores.setdefault(q.difficulty, {"count": 0, "total_pct": 0.0})
                difficulty_scores[q.difficulty]["count"] += 1
                difficulty_scores[q.difficulty]["total_pct"] += correct_pct

            if q.blooms_level:
                blooms_scores.setdefault(q.blooms_level, {"count": 0, "total_pct": 0.0})
                blooms_scores[q.blooms_level]["count"] += 1
                blooms_scores[q.blooms_level]["total_pct"] += correct_pct

        topic_analytics = [
            {"topic": t, "question_count": d["count"], "avg_score": round(d["total_pct"] / d["count"], 2), "performance_pct": round(d["total_pct"] / d["count"], 2)}
            for t, d in topic_scores.items()
        ]

        difficulty_analytics = [
            {"difficulty": d, "question_count": info["count"], "avg_score": round(info["total_pct"] / info["count"], 2), "performance_pct": round(info["total_pct"] / info["count"], 2)}
            for d, info in difficulty_scores.items()
        ]

        blooms_analytics = [
            {"level": l, "question_count": info["count"], "avg_score": round(info["total_pct"] / info["count"], 2), "performance_pct": round(info["total_pct"] / info["count"], 2)}
            for l, info in blooms_scores.items()
        ]

        return {
            "summary": summary,
            "score_distribution": score_dist,
            "question_analytics": question_analytics,
            "topic_analytics": topic_analytics,
            "difficulty_analytics": difficulty_analytics,
            "blooms_analytics": blooms_analytics,
        }

    @staticmethod
    def publish_results(db: Session, exam_id: int, teacher_id: int, confirm: bool = False) -> dict:
        if not confirm:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Confirmation required to publish results")

        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == teacher_id).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

        eval_status = db.query(ExamEvaluationStatus).filter(
            ExamEvaluationStatus.exam_id == exam_id,
        ).first()

        if eval_status and eval_status.results_published:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Results already published for this exam")

        review = EvaluationService.get_final_review(db, exam_id, teacher_id)
        if review["flagged_count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot publish: {review['flagged_count']} flagged items require resolution",
            )

        if not eval_status:
            eval_status = ExamEvaluationStatus(exam_id=exam_id)
            db.add(eval_status)

        eval_status.results_published = True
        eval_status.published_at = datetime.now(timezone.utc)
        eval_status.published_by = teacher_id

        for a in db.query(ExamAssignment).filter(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.status == "submitted",
        ).all():
            a.status = "reviewed"

        db.commit()

        return {
            "message": "Results published successfully",
            "published": True,
            "published_at": eval_status.published_at,
        }

    @staticmethod
    def _check_answer_correct(ans: StudentAnswer, question: Question, eq: ExamQuestion) -> bool:
        if not ans:
            return False
        if question.question_type == "mcq":
            if ans.answer_text and ans.answer_text.strip().lower() == question.correct_answer.strip().lower():
                return True
            if ans.selected_option and ans.selected_option.strip().lower() == question.correct_answer.strip().lower():
                return True
            try:
                opts = json.loads(question.options) if question.options else []
                if question.correct_answer.isdigit():
                    idx = int(question.correct_answer)
                    if 0 <= idx < len(opts) and ans.answer_text and ans.answer_text.strip().lower() == opts[idx].strip().lower():
                        return True
                if ans.selected_option and ans.selected_option.isdigit():
                    sel_idx = int(ans.selected_option)
                    if 0 <= sel_idx < len(opts) and opts[sel_idx].strip().lower() == question.correct_answer.strip().lower():
                        return True
            except Exception:
                pass
            return False
        else:
            if ans.answer_text and _words_match(ans.answer_text, question.correct_answer):
                return True
            return False

    @staticmethod
    def _get_integrity(db: Session, session: ExamSession) -> float:
        if not session:
            return 100.0
        try:
            from app.services.proctor_service import ProctorService
            risk = ProctorService.calculate_risk_score(db, session.id)
            return max(0.0, 100.0 - risk)
        except Exception:
            return 100.0

    @staticmethod
    def _mock_ai_evaluation(answer_text: str, question: Question, max_marks: float) -> dict:
        word_count = len(answer_text.split()) if answer_text else 0
        topic_factor = 1.0
        if question.topic and question.question_text:
            topic_keywords = set(question.topic.lower().split())
            answer_keywords = set(answer_text.lower().split())
            overlap = len(topic_keywords & answer_keywords)
            topic_factor = min(1.0, overlap / max(len(topic_keywords), 1) + 0.3)

        length_factor = min(1.0, word_count / 50) if max_marks > 2 else min(1.0, word_count / 20)
        suggested = round(max_marks * topic_factor * length_factor * random.uniform(0.8, 1.0), 1)
        suggested = max(0, min(suggested, max_marks))

        confidence = round(random.uniform(60, 95), 1)

        if suggested >= max_marks * 0.8:
            reason = "The answer demonstrates a strong understanding of the concept with clear explanations."
        elif suggested >= max_marks * 0.5:
            reason = "The answer covers the basic concept adequately but lacks depth or specific details."
        else:
            reason = "The answer is incomplete or does not sufficiently address the key points of the question."

        return {
            "suggested_marks": suggested,
            "confidence": confidence,
            "reason": reason,
        }
