from pydantic import BaseModel


class SubjectRecommendation(BaseModel):
    subject: str
    average_score: float
    status: str
    total_exams: int
    suggested_focus: list[str]
    ai_tip: str | None = None


class PracticeRecommendationResponse(BaseModel):
    recommendations: list[SubjectRecommendation]
    weak_subjects: list[str]
    strong_subjects: list[str]
    has_data: bool = False
