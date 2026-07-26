from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal
from app.models.audit_log import AuditLog
from app.models.exam import Exam, ExamSession
from app.models.notification import Notification

scheduler = AsyncIOScheduler()


def transition_exam_statuses():
    """Background job: advance scheduled→active, active→completed + auto-submit."""
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        changes = []

        for exam in db.query(Exam).filter(Exam.status == "scheduled").all():
            st = exam.start_time
            if st.tzinfo:
                st = st.astimezone(timezone.utc).replace(tzinfo=None)
            if st <= now:
                exam.status = "active"
                changes.append((exam, "scheduled", "active"))

        for exam in db.query(Exam).filter(Exam.status == "active").all():
            effective_end = exam.end_time + timedelta(minutes=exam.grace_period_minutes or 0)
            if effective_end.tzinfo:
                effective_end = effective_end.astimezone(timezone.utc).replace(tzinfo=None)
            if effective_end <= now:
                exam.status = "completed"
                changes.append((exam, "active", "completed"))
                for s in db.query(ExamSession).filter(
                    ExamSession.exam_id == exam.id,
                    ExamSession.status.in_(["downloaded", "started"]),
                ).all():
                    s.status = "submitted"
                    s.submitted_at = now
                    s.assignment.status = "submitted"
                    s.assignment.submitted_at = now

        if changes:
            for exam, old_status, new_status in changes:
                db.add(AuditLog(
                    user_id=exam.teacher_id,
                    action=f"exam_{new_status}",
                    details=f"Auto-transition: exam '{exam.title}' (id={exam.id}) changed from {old_status} to {new_status}",
                ))
                db.add(Notification(
                    user_id=exam.teacher_id,
                    title=f"Exam {new_status}: {exam.title}",
                    message=f"Your exam '{exam.title}' has automatically transitioned from '{old_status}' to '{new_status}'.",
                    category="exam",
                ))
            db.commit()
    finally:
        db.close()


def start():
    """Add and start the background job."""
    scheduler.add_job(
        transition_exam_statuses,
        "interval",
        seconds=30,
        id="transition_exam_statuses",
        replace_existing=True,
    )
    scheduler.start()


def shutdown():
    if scheduler.running:
        scheduler.shutdown(wait=False)
