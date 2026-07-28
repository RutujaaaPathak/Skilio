from pydantic import BaseModel


class SubjectRecommendation(BaseModel):
    subject: str
    average_score: float
    status: str
    total_exams: int
    suggested_focus: list[str]
    ai_tip: str | None = None


class TopicRecommendation(BaseModel):
    topic: str
    subject: str
    average_score: float | None = None
    status: str = "unknown"
    suggested_focus: list[str] = []
    resource_suggestions: list[str] = []


class PerformanceTrajectory(BaseModel):
    trend: str = "stable"
    improvement_rate: float | None = None
    projected_score: float | None = None
    consistency_score: float | None = None


class TimeManagementTip(BaseModel):
    tip: str
    category: str = "pace"
    priority: str = "medium"


class PracticeRecommendationResponse(BaseModel):
    recommendations: list[SubjectRecommendation]
    weak_subjects: list[str]
    strong_subjects: list[str]
    topic_recommendations: list[TopicRecommendation] = []
    performance_trajectory: PerformanceTrajectory | None = None
    time_management_tips: list[TimeManagementTip] = []
    has_data: bool = False
