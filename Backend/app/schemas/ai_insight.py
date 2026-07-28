from pydantic import BaseModel


class AIInsightItem(BaseModel):
    category: str
    message: str
    severity: str


class TrendAnalysis(BaseModel):
    direction: str = "stable"
    volatility: str = "low"
    consistency: str = "inconsistent"
    score_velocity: float | None = None
    recent_improvement: float | None = None


class TopicPerformanceItem(BaseModel):
    topic: str
    subject: str
    average_score: float | None = None
    status: str = "unknown"
    total_questions: int = 0
    correct_count: int = 0


class TimeAnalysis(BaseModel):
    total_time_spent_minutes: int = 0
    average_time_per_exam_minutes: int = 0
    time_efficiency: str = "moderate"
    optimal_pace_minutes: int | None = None


class PerformancePrediction(BaseModel):
    estimated_next_score: float | None = None
    confidence: str = "low"
    target_score: float | None = None
    exams_to_target: int | None = None


class AIInsightsResponse(BaseModel):
    insights: list[AIInsightItem]
    overall_assessment: str
    subject_performance: list[dict]
    trend_analysis: TrendAnalysis | None = None
    topic_performance: list[TopicPerformanceItem] = []
    time_analysis: TimeAnalysis | None = None
    performance_prediction: PerformancePrediction | None = None
    has_data: bool = False
