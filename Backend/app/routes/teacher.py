import json
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher_or_admin
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.exam import Exam, ExamAssignment, ExamQuestion, ExamSession, StudentAnswer
from app.models.proctor_event import ProctorEvent
from app.models.user import User
from app.models.risk_report import ProctorRiskReport
from app.schemas.teacher import (
    ActivityItem,
    AnalyticsData,
    CheatedSubjectItem,
    ExamPerformanceItem,
    IntegrityTrendPoint,
    PendingEvaluationsResponse,
    PerformanceSummary,
    RecentAlertItem,
    StudentRankingItem,
    SubjectPerformanceItem,
    TeacherDashboardResponse,
    TrendData,
    WeakTopicItem,
)
from app.models.question import Question

router = APIRouter(prefix="/teacher", tags=["Teacher"])


def _words_match(student_answer: str, correct_answer: str) -> bool:
    student_words = re.findall(r"[a-zA-Z0-9]+", student_answer.lower())
    correct_words = re.findall(r"[a-zA-Z0-9]+", correct_answer.lower())
    return student_words == correct_words


def _calculate_assignment_score(db: Session, assignment: ExamAssignment) -> float | None:
    session = (
        db.query(ExamSession)
        .filter(
            ExamSession.exam_id == assignment.exam_id,
            ExamSession.student_id == assignment.student_id,
            ExamSession.assignment_id == assignment.id,
        )
        .order_by(ExamSession.downloaded_at.desc())
        .first()
    )
    if not session:
        return None

    answers = (
        db.query(StudentAnswer)
        .filter(StudentAnswer.exam_session_id == session.id)
        .all()
    )
    if not answers:
        return None

    exam_questions = (
        db.query(ExamQuestion)
        .filter(ExamQuestion.exam_id == assignment.exam_id)
        .all()
    )
    eq_map = {eq.question_id: eq for eq in exam_questions}

    total_marks = 0
    earned_marks = 0

    for ans in answers:
        eq = eq_map.get(ans.question_id)
        if not eq or not eq.question:
            continue

        total_marks += eq.marks
        question = eq.question

        is_correct = False
        if question.question_type == "mcq":
            if ans.answer_text and ans.answer_text.strip().lower() == question.correct_answer.strip().lower():
                is_correct = True
            elif ans.selected_option and ans.selected_option.strip().lower() == question.correct_answer.strip().lower():
                is_correct = True
            else:
                try:
                    opts = json.loads(question.options) if question.options else []
                    if question.correct_answer.isdigit():
                        idx = int(question.correct_answer)
                        if 0 <= idx < len(opts) and ans.answer_text and ans.answer_text.strip().lower() == opts[idx].strip().lower():
                            is_correct = True
                    if ans.selected_option and ans.selected_option.isdigit():
                        sel_idx = int(ans.selected_option)
                        if 0 <= sel_idx < len(opts) and opts[sel_idx].strip().lower() == question.correct_answer.strip().lower():
                            is_correct = True
                except Exception:
                    pass
        else:
            if ans.answer_text and _words_match(ans.answer_text, question.correct_answer):
                is_correct = True

        if is_correct:
            earned_marks += eq.marks

    if total_marks > 0:
        return round((earned_marks / total_marks * 100), 2)
    if len(exam_questions) > 0:
        return round((earned_marks / len(exam_questions) * 100), 2)
    return None


@router.get("/dashboard", response_model=TeacherDashboardResponse)
def get_teacher_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    active_exams = (
        db.query(Exam)
        .filter(Exam.teacher_id == current_user.id, Exam.status == "active")
        .all()
    )

    active_exam_data = []
    for exam in active_exams:
        assigned = (
            db.query(func.count(ExamAssignment.id))
            .filter(ExamAssignment.exam_id == exam.id)
            .scalar()
            or 0
        )
        started = (
            db.query(func.count(ExamAssignment.id))
            .filter(
                ExamAssignment.exam_id == exam.id,
                ExamAssignment.status.in_(["started", "submitted"]),
            )
            .scalar()
            or 0
        )
        submitted = (
            db.query(func.count(ExamAssignment.id))
            .filter(
                ExamAssignment.exam_id == exam.id,
                ExamAssignment.status == "submitted",
            )
            .scalar()
            or 0
        )
        active_exam_data.append(
            {
                "id": exam.id,
                "title": exam.title,
                "subject": exam.subject,
                "start_time": exam.start_time,
                "end_time": exam.end_time,
                "duration_minutes": exam.duration_minutes,
                "total_assigned": assigned,
                "started_count": started,
                "submitted_count": submitted,
            }
        )

    pending = (
        db.query(func.count(ExamAssignment.id))
        .join(Exam, ExamAssignment.exam_id == Exam.id)
        .filter(
            Exam.teacher_id == current_user.id,
            ExamAssignment.status == "submitted",
        )
        .scalar()
        or 0
    )

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    alerts = (
        db.query(func.count(ProctorEvent.id), ProctorEvent.severity)
        .join(Exam, ProctorEvent.exam_id == Exam.id)
        .filter(Exam.teacher_id == current_user.id, ProctorEvent.created_at > cutoff)
        .group_by(ProctorEvent.severity)
        .all()
    )

    alert_summary = {"total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0}
    for count, severity in alerts:
        alert_summary["total"] += count
        if severity in alert_summary:
            alert_summary[severity] = count

    return {
        "active_exams": active_exam_data,
        "pending_evaluations": pending,
        "recent_alerts": alert_summary,
    }


@router.get("/evaluations/pending", response_model=PendingEvaluationsResponse)
def get_pending_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    submissions = (
        db.query(ExamAssignment)
        .join(Exam, ExamAssignment.exam_id == Exam.id)
        .join(User, ExamAssignment.student_id == User.id)
        .filter(
            Exam.teacher_id == current_user.id,
            ExamAssignment.status == "submitted",
        )
        .order_by(ExamAssignment.submitted_at.desc())
        .limit(20)
        .all()
    )

    result = []
    for s in submissions:
        result.append(
            {
                "assignment_id": s.id,
                "exam_id": s.exam_id,
                "exam_title": s.exam.title,
                "subject": s.exam.subject,
                "student_id": s.student_id,
                "student_name": s.student.name,
                "student_email": s.student.email,
                "submitted_at": s.submitted_at,
            }
        )

    return {"total": len(result), "submissions": result}


@router.get("/performance", response_model=PerformanceSummary)
def get_performance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    teacher_exam_ids = (
        db.query(Exam.id).filter(Exam.teacher_id == current_user.id).subquery()
    )

    total_students = (
        db.query(func.count(func.distinct(ExamAssignment.student_id)))
        .filter(ExamAssignment.exam_id.in_(teacher_exam_ids))
        .scalar()
        or 0
    )

    total_submissions = (
        db.query(func.count(ExamAssignment.id))
        .filter(
            ExamAssignment.exam_id.in_(teacher_exam_ids),
            ExamAssignment.status.in_(["submitted", "reviewed"]),
        )
        .scalar()
        or 0
    )

    completed = (
        db.query(ExamAssignment)
        .filter(
            ExamAssignment.exam_id.in_(teacher_exam_ids),
            ExamAssignment.status == "reviewed",
        )
        .order_by(ExamAssignment.submitted_at.desc())
        .limit(50)
        .all()
    )

    pending = (
        db.query(func.count(ExamAssignment.id))
        .filter(
            ExamAssignment.exam_id.in_(teacher_exam_ids),
            ExamAssignment.status == "submitted",
        )
        .scalar()
        or 0
    )

    scores = []
    for assignment in completed:
        score = _calculate_assignment_score(db, assignment)
        if score is not None:
            scores.append(score)

    average_score = round(sum(scores) / len(scores), 2) if scores else None
    pass_rate = (
        round(sum(1 for s in scores if s >= 40.0) / len(scores) * 100, 2)
        if scores
        else None
    )

    return {
        "total_students": total_students,
        "total_submissions": total_submissions,
        "completed_evaluations": len(completed),
        "pending_evaluations": pending,
        "average_score": average_score,
        "pass_rate": pass_rate,
    }


@router.get("/activities", response_model=list[ActivityItem])
def get_teacher_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(15)
        .all()
    )
    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@router.get("/trends", response_model=TrendData)
def get_teacher_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    completed_exams = (
        db.query(Exam)
        .filter(Exam.teacher_id == current_user.id, Exam.status == "completed")
        .order_by(Exam.end_time.desc())
        .limit(10)
        .all()
    )

    performance_trend = []
    for exam in reversed(completed_exams):
        reviewed = (
            db.query(ExamAssignment)
            .filter(
                ExamAssignment.exam_id == exam.id,
                ExamAssignment.status == "reviewed",
            )
            .all()
        )
        if reviewed:
            scores = []
            for r in reviewed:
                score = _calculate_assignment_score(db, r)
                if score is not None:
                    scores.append(score)
            avg = round(sum(scores) / len(scores), 1) if scores else 0
        else:
            avg = 0
        performance_trend.append({"label": exam.title[:18], "value": avg})

    risk_counts = (
        db.query(
            ProctorRiskReport.risk_level,
            func.count(ProctorRiskReport.id),
        )
        .join(Exam, ProctorRiskReport.exam_id == Exam.id)
        .filter(Exam.teacher_id == current_user.id)
        .group_by(ProctorRiskReport.risk_level)
        .all()
    )

    risk_levels = {"clean": 0, "low": 0, "medium": 0, "high": 0, "critical": 0}
    for level, count in risk_counts:
        risk_levels[level] = count

    risk_distribution = [
        {"label": level.capitalize(), "value": count}
        for level, count in risk_levels.items()
    ]

    return {
        "performance_trend": performance_trend,
        "risk_distribution": risk_distribution,
    }


@router.get("/analytics", response_model=AnalyticsData)
def get_teacher_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
    subject: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
):
    teacher_id = current_user.id

    exam_filter = [Exam.teacher_id == teacher_id]
    if subject:
        exam_filter.append(Exam.subject == subject)

    total_completed = (
        db.query(func.count(Exam.id))
        .filter(*exam_filter, Exam.status == "completed")
        .scalar()
        or 0
    )

    risk_scores = (
        db.query(ProctorRiskReport.risk_score)
        .join(Exam, ProctorRiskReport.exam_id == Exam.id)
        .filter(*exam_filter)
        .all()
    )
    avg_risk = (
        sum(r[0] for r in risk_scores) / len(risk_scores)
        if risk_scores
        else None
    )
    overall_integrity_score = (
        round(max(0, 100 - avg_risk), 1) if avg_risk is not None else None
    )

    event_filter = [
        Exam.teacher_id == teacher_id,
        ProctorEvent.severity.in_(["high", "critical"]),
    ]
    if date_from:
        event_filter.append(ProctorEvent.created_at >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
    if date_to:
        event_filter.append(ProctorEvent.created_at <= datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc))

    most_cheated = (
        db.query(
            Exam.subject,
            func.count(ProctorEvent.id),
            func.sum(case((ProctorEvent.severity == "critical", 1), else_=0)).label("critical_count"),
            func.sum(case((ProctorEvent.severity == "high", 1), else_=0)).label("high_count"),
        )
        .select_from(ProctorEvent)
        .join(Exam, ProctorEvent.exam_id == Exam.id)
        .filter(*event_filter)
        .group_by(Exam.subject)
        .order_by(func.count(ProctorEvent.id).desc())
        .first()
    )
    most_cheated_subject = (
        CheatedSubjectItem(
            subject=most_cheated[0],
            total_violations=most_cheated[1],
            critical_count=most_cheated[2],
            high_count=most_cheated[3],
        )
        if most_cheated
        else None
    )

    integrity_incidents_by_subject = {}
    rows = (
        db.query(
            Exam.subject,
            func.count(ProctorEvent.id),
        )
        .select_from(ProctorEvent)
        .join(Exam, ProctorEvent.exam_id == Exam.id)
        .filter(*event_filter)
        .group_by(Exam.subject)
        .all()
    )
    for subj, cnt in rows:
        integrity_incidents_by_subject[subj] = cnt

    all_event_filter = [Exam.teacher_id == teacher_id]
    if date_from:
        all_event_filter.append(ProctorEvent.created_at >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
    if date_to:
        all_event_filter.append(ProctorEvent.created_at <= datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc))

    weekly_raw = (
        db.query(
            func.strftime("%Y-%W", ProctorEvent.created_at).label("week"),
            ProctorEvent.severity,
            func.count(ProctorEvent.id),
        )
        .select_from(ProctorEvent)
        .join(Exam, ProctorEvent.exam_id == Exam.id)
        .filter(*all_event_filter)
        .group_by("week", ProctorEvent.severity)
        .order_by("week")
        .all()
    )

    SEVERITY_POINTS = {"low": 2, "medium": 5, "high": 10, "critical": 25}
    weekly_map: dict[str, dict] = {}
    for week, severity, cnt in weekly_raw:
        if week not in weekly_map:
            weekly_map[week] = {"total_events": 0, "weighted_sum": 0}
        weekly_map[week]["total_events"] += cnt
        weekly_map[week]["weighted_sum"] += cnt * SEVERITY_POINTS.get(severity, 0)

    max_weight = max((d["weighted_sum"] for d in weekly_map.values()), default=1)
    integrity_trend = [
        IntegrityTrendPoint(
            week=week,
            score=round(max(0, 100 - (data["weighted_sum"] / max(1, max_weight) * 50)), 1),
            total_events=data["total_events"],
        )
        for week, data in sorted(weekly_map.items())[-12:]
    ]

    reviewed_filter = [Exam.teacher_id == teacher_id, ExamAssignment.status == "reviewed"]
    if subject:
        reviewed_filter.append(Exam.subject == subject)
    if date_from:
        reviewed_filter.append(ExamAssignment.submitted_at >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
    if date_to:
        reviewed_filter.append(ExamAssignment.submitted_at <= datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc))

    subject_scores: dict[str, list[float]] = {}
    subject_students: dict[str, set[int]] = {}
    subject_exams: dict[str, set[int]] = {}

    reviewed = (
        db.query(ExamAssignment)
        .join(Exam, ExamAssignment.exam_id == Exam.id)
        .filter(*reviewed_filter)
        .order_by(ExamAssignment.submitted_at.desc())
        .limit(100)
        .all()
    )

    for assignment in reviewed:
        subj = assignment.exam.subject
        if subj not in subject_exams:
            subject_exams[subj] = set()
        subject_exams[subj].add(assignment.exam_id)
        if subj not in subject_students:
            subject_students[subj] = set()
        subject_students[subj].add(assignment.student_id)

        score = _calculate_assignment_score(db, assignment)
        if score is not None:
            subject_scores.setdefault(subj, []).append(score)

    subject_performance = [
        SubjectPerformanceItem(
            subject=subj,
            average_score=round(sum(scores) / len(scores), 1) if scores else None,
            total_students=len(subject_students.get(subj, set())),
            total_exams=len(subject_exams.get(subj, set())),
            integrity_incidents=integrity_incidents_by_subject.get(subj, 0),
        )
        for subj, scores in sorted(subject_scores.items())
    ]

    topic_scores: dict[str, dict] = {}
    for assignment in reviewed:
        session = (
            db.query(ExamSession)
            .filter(
                ExamSession.exam_id == assignment.exam_id,
                ExamSession.student_id == assignment.student_id,
                ExamSession.assignment_id == assignment.id,
            )
            .order_by(ExamSession.downloaded_at.desc())
            .first()
        )
        if not session:
            continue

        answers = (
            db.query(StudentAnswer)
            .filter(StudentAnswer.exam_session_id == session.id)
            .all()
        )
        exam_questions_map = {}
        eqs = (
            db.query(ExamQuestion)
            .filter(ExamQuestion.exam_id == assignment.exam_id)
            .all()
        )
        for eq in eqs:
            exam_questions_map[eq.question_id] = eq

        for ans in answers:
            eq = exam_questions_map.get(ans.question_id)
            if not eq or not eq.question:
                continue
            question = eq.question
            topic = question.topic
            if topic not in topic_scores:
                topic_scores[topic] = {
                    "subject": question.subject,
                    "total_marks": 0,
                    "earned_marks": 0,
                    "question_count": 0,
                }

            topic_scores[topic]["total_marks"] += eq.marks
            topic_scores[topic]["question_count"] += 1

            is_correct = False
            if question.question_type == "mcq":
                if ans.answer_text and ans.answer_text.strip().lower() == question.correct_answer.strip().lower():
                    is_correct = True
                elif ans.selected_option and ans.selected_option.strip().lower() == question.correct_answer.strip().lower():
                    is_correct = True
                else:
                    try:
                        opts = json.loads(question.options) if question.options else []
                        if question.correct_answer.isdigit():
                            idx = int(question.correct_answer)
                            if 0 <= idx < len(opts) and ans.answer_text and ans.answer_text.strip().lower() == opts[idx].strip().lower():
                                is_correct = True
                        if ans.selected_option and ans.selected_option.isdigit():
                            sel_idx = int(ans.selected_option)
                            if 0 <= sel_idx < len(opts) and opts[sel_idx].strip().lower() == question.correct_answer.strip().lower():
                                is_correct = True
                    except Exception:
                        pass
            else:
                if ans.answer_text and _words_match(ans.answer_text, question.correct_answer):
                    is_correct = True

            if is_correct:
                topic_scores[topic]["earned_marks"] += eq.marks

    weak_topics = [
        WeakTopicItem(
            topic=topic,
            subject=data["subject"],
            average_score=round(data["earned_marks"] / data["total_marks"] * 100, 1) if data["total_marks"] > 0 else 0,
            total_questions=data["question_count"],
        )
        for topic, data in sorted(topic_scores.items())
        if data["total_marks"] > 0
        and (data["earned_marks"] / data["total_marks"] * 100) < 60.0
    ]

    student_scores: dict[int, list[float]] = {}
    student_exam_count: dict[int, int] = {}
    student_latest_risk: dict[int, str] = {}

    ranking_filter = [Exam.teacher_id == teacher_id, ExamAssignment.status == "reviewed"]
    if subject:
        ranking_filter.append(Exam.subject == subject)
    if date_from:
        ranking_filter.append(ExamAssignment.submitted_at >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
    if date_to:
        ranking_filter.append(ExamAssignment.submitted_at <= datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc))

    reviewed_assignments = (
        db.query(ExamAssignment)
        .join(Exam, ExamAssignment.exam_id == Exam.id)
        .filter(*ranking_filter)
        .order_by(ExamAssignment.submitted_at.desc())
        .limit(200)
        .all()
    )

    for assignment in reviewed_assignments:
        sid = assignment.student_id
        student_exam_count[sid] = student_exam_count.get(sid, 0) + 1
        score = _calculate_assignment_score(db, assignment)
        if score is not None:
            student_scores.setdefault(sid, []).append(score)

    risk_levels_for_students = (
        db.query(
            ProctorRiskReport.student_id,
            ProctorRiskReport.risk_level,
        )
        .join(Exam, ProctorRiskReport.exam_id == Exam.id)
        .filter(Exam.teacher_id == teacher_id)
        .distinct(ProctorRiskReport.student_id)
        .order_by(ProctorRiskReport.student_id, ProctorRiskReport.updated_at.desc())
        .all()
    )
    for sid, level in risk_levels_for_students:
        if sid not in student_latest_risk:
            student_latest_risk[sid] = level

    all_student_ids = set(student_scores.keys()) | set(student_exam_count.keys())
    student_ranking = []
    for sid in all_student_ids:
        scores = student_scores.get(sid, [])
        student_ranking.append(
            StudentRankingItem(
                student_id=sid,
                student_name="",
                average_score=round(sum(scores) / len(scores), 1) if scores else None,
                exams_taken=student_exam_count.get(sid, 0),
                integrity_level=student_latest_risk.get(sid),
            )
        )

    student_names_map = {}
    if all_student_ids:
        student_rows = (
            db.query(User.id, User.name)
            .filter(User.id.in_(list(all_student_ids)))
            .all()
        )
        student_names_map = {uid: name for uid, name in student_rows}

    for item in student_ranking:
        item.student_name = student_names_map.get(item.student_id, f"Student #{item.student_id}")

    student_ranking.sort(key=lambda x: (x.average_score or 0), reverse=True)

    exam_scores: dict[int, list[float]] = {}
    exam_student_count: dict[int, set[int]] = {}
    exam_info: dict[int, tuple[str, str]] = {}

    for assignment in reviewed_assignments:
        eid = assignment.exam_id
        sid = assignment.student_id
        exam_student_count.setdefault(eid, set()).add(sid)
        if eid not in exam_info:
            exam_info[eid] = (assignment.exam.title, assignment.exam.subject)
        score = _calculate_assignment_score(db, assignment)
        if score is not None:
            exam_scores.setdefault(eid, []).append(score)

    exam_performance = [
        ExamPerformanceItem(
            exam_id=eid,
            title=exam_info[eid][0],
            subject=exam_info[eid][1],
            average_score=round(sum(scores) / len(scores), 1) if scores else None,
            student_count=len(exam_student_count.get(eid, set())),
        )
        for eid, scores in sorted(exam_scores.items(), key=lambda x: sum(x[1]) / len(x[1]) if x[1] else 0, reverse=True)
    ]

    return {
        "total_exams_completed": total_completed,
        "overall_integrity_score": overall_integrity_score,
        "most_cheated_subject": most_cheated_subject,
        "weak_topics": weak_topics,
        "subject_performance": subject_performance,
        "integrity_trend": integrity_trend,
        "student_ranking": student_ranking[:50],
        "exam_performance": exam_performance,
    }


@router.get("/alerts/recent", response_model=list[RecentAlertItem])
def get_recent_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    events = (
        db.query(ProctorEvent)
        .join(Exam, ProctorEvent.exam_id == Exam.id)
        .join(User, ProctorEvent.student_id == User.id)
        .filter(Exam.teacher_id == current_user.id)
        .order_by(ProctorEvent.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": e.id,
            "exam_id": e.exam_id,
            "exam_title": e.exam.title,
            "student_id": e.student_id,
            "student_name": e.student.name,
            "event_type": e.event_type,
            "severity": e.severity,
            "description": e.description,
            "created_at": e.created_at,
        }
        for e in events
    ]
