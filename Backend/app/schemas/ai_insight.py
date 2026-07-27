from pydantic import BaseModel


class AIInsightItem(BaseModel):
    category: str
    message: str
    severity: str


class AIInsightsResponse(BaseModel):
    insights: list[AIInsightItem]
    overall_assessment: str
    subject_performance: list[dict]
    has_data: bool = False
