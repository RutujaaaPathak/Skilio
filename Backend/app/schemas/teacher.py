from datetime import datetime
from pydantic import BaseModel


class ActiveExamInfo(BaseModel):
    id: int
    title: str
    subject: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    total_assigned: int
    started_count: int
    submitted_count: int

    model_config = {"from_attributes": True}


class AlertSummary(BaseModel):
    total: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class TeacherDashboardResponse(BaseModel):
    active_exams: list[ActiveExamInfo]
    pending_evaluations: int
    recent_alerts: AlertSummary


class PendingSubmissionInfo(BaseModel):
    assignment_id: int
    exam_id: int
    exam_title: str
    subject: str
    student_id: int
    student_name: str
    student_email: str
    submitted_at: datetime


class PendingEvaluationsResponse(BaseModel):
    total: int
    submissions: list[PendingSubmissionInfo]


class PerformanceSummary(BaseModel):
    total_students: int
    total_submissions: int
    completed_evaluations: int
    pending_evaluations: int
    average_score: float | None = None
    pass_rate: float | None = None


class ActivityItem(BaseModel):
    id: int
    action: str
    details: str | None = None
    created_at: datetime


class RecentAlertItem(BaseModel):
    id: int
    exam_id: int
    exam_title: str
    student_id: int
    student_name: str
    event_type: str
    severity: str
    description: str | None = None
    created_at: datetime


class TrendPoint(BaseModel):
    label: str
    value: float


class TrendData(BaseModel):
    performance_trend: list[TrendPoint]
    risk_distribution: list[TrendPoint]


class IntegrityTrendPoint(BaseModel):
    week: str
    score: float
    total_events: int = 0


class SubjectPerformanceItem(BaseModel):
    subject: str
    average_score: float | None = None
    total_students: int = 0
    total_exams: int = 0
    integrity_incidents: int = 0


class WeakTopicItem(BaseModel):
    topic: str
    subject: str
    average_score: float
    total_questions: int = 0


class CheatedSubjectItem(BaseModel):
    subject: str
    total_violations: int = 0
    critical_count: int = 0
    high_count: int = 0


class StudentRankingItem(BaseModel):
    student_id: int
    student_name: str
    average_score: float | None = None
    exams_taken: int = 0
    integrity_level: str | None = None


class ExamPerformanceItem(BaseModel):
    exam_id: int
    title: str
    subject: str
    average_score: float | None = None
    student_count: int = 0


class AnalyticsData(BaseModel):
    total_exams_completed: int = 0
    overall_integrity_score: float | None = None
    most_cheated_subject: CheatedSubjectItem | None = None
    weak_topics: list[WeakTopicItem] = []
    subject_performance: list[SubjectPerformanceItem] = []
    integrity_trend: list[IntegrityTrendPoint] = []
    student_ranking: list[StudentRankingItem] = []
    exam_performance: list[ExamPerformanceItem] = []
