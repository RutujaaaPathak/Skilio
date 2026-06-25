from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.exam import Exam, ExamSession
from app.models.proctor_event import ProctorEvent
from app.models.risk_report import ProctorRiskReport
from app.models.user import User

SEVERITY_POINTS = {
    "low": 2,
    "medium": 5,
    "high": 10,
    "critical": 25,
}


def _get_risk_level(score: float) -> str:
    if score <= 10:
        return "clean"
    if score <= 30:
        return "low"
    if score <= 60:
        return "medium"
    if score <= 100:
        return "high"
    return "critical"


def _build_summary(
    total: int,
    low: int,
    medium: int,
    high: int,
    critical: int,
    score: float,
    level: str,
) -> str:
    parts = [f"Risk score {score} ({level.upper()}) based on {total} proctor event(s)."]
    details = []
    if critical:
        details.append(f"{critical} critical")
    if high:
        details.append(f"{high} high")
    if medium:
        details.append(f"{medium} medium")
    if low:
        details.append(f"{low} low")
    if details:
        parts.append(f"Breakdown: {', '.join(details)} severity event(s).")
    return " ".join(parts)


class ProctorRiskService:

    @staticmethod
    def update_risk_report(db: Session, session_id: int) -> ProctorRiskReport:
        session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam session not found",
            )

        events = db.query(ProctorEvent).filter(
            ProctorEvent.exam_session_id == session_id
        ).all()

        total_events = len(events)
        low_count = sum(1 for e in events if e.severity == "low")
        medium_count = sum(1 for e in events if e.severity == "medium")
        high_count = sum(1 for e in events if e.severity == "high")
        critical_count = sum(1 for e in events if e.severity == "critical")

        risk_score = 0.0
        for e in events:
            points = SEVERITY_POINTS.get(e.severity, 0)
            confidence = e.confidence_score if e.confidence_score is not None else 1.0
            risk_score += points * confidence

        risk_score = round(risk_score, 2)
        risk_level = _get_risk_level(risk_score)
        summary = _build_summary(total_events, low_count, medium_count, high_count, critical_count, risk_score, risk_level)

        report = db.query(ProctorRiskReport).filter(
            ProctorRiskReport.exam_session_id == session_id
        ).first()

        if report:
            report.total_events = total_events
            report.low_count = low_count
            report.medium_count = medium_count
            report.high_count = high_count
            report.critical_count = critical_count
            report.risk_score = risk_score
            report.risk_level = risk_level
            report.summary = summary
            report.updated_at = datetime.now(timezone.utc)
        else:
            report = ProctorRiskReport(
                exam_session_id=session_id,
                exam_id=session.exam_id,
                student_id=session.student_id,
                total_events=total_events,
                low_count=low_count,
                medium_count=medium_count,
                high_count=high_count,
                critical_count=critical_count,
                risk_score=risk_score,
                risk_level=risk_level,
                summary=summary,
            )
            db.add(report)

        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def _report_to_dict(report: ProctorRiskReport, db: Session) -> dict:
        student = db.query(User).filter(User.id == report.student_id).first()
        return {
            "id": report.id,
            "exam_session_id": report.exam_session_id,
            "exam_id": report.exam_id,
            "student_id": report.student_id,
            "student_name": student.name if student else "",
            "student_email": student.email if student else "",
            "total_events": report.total_events,
            "low_count": report.low_count,
            "medium_count": report.medium_count,
            "high_count": report.high_count,
            "critical_count": report.critical_count,
            "risk_score": report.risk_score,
            "risk_level": report.risk_level,
            "summary": report.summary,
            "updated_at": report.updated_at,
        }

    @staticmethod
    def get_risk_report(db: Session, exam_id: int, student_id: int, current_user: User) -> dict:
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        if current_user.role != "admin" and exam.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view risk reports for your own exams",
            )

        # Find the latest session for this student+exam
        session = db.query(ExamSession).filter(
            ExamSession.exam_id == exam_id,
            ExamSession.student_id == student_id,
        ).order_by(ExamSession.downloaded_at.desc()).first()

        if not session:
            raise HTTPException(status_code=404, detail="No exam session found for this student")

        report = db.query(ProctorRiskReport).filter(
            ProctorRiskReport.exam_session_id == session.id
        ).first()

        if not report:
            raise HTTPException(status_code=404, detail="Risk report not found. No proctor events recorded yet.")

        return ProctorRiskService._report_to_dict(report, db)

    @staticmethod
    def get_exam_risk_reports(db: Session, exam_id: int, current_user: User) -> list[dict]:
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        if current_user.role != "admin" and exam.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view risk reports for your own exams",
            )

        reports = db.query(ProctorRiskReport).filter(
            ProctorRiskReport.exam_id == exam_id
        ).order_by(ProctorRiskReport.risk_score.desc()).all()

        return [ProctorRiskService._report_to_dict(r, db) for r in reports]
