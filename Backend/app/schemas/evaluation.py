from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EvaluationAnswerItem(BaseModel):
    id: int
    question_id: int
    answer_text: Optional[str] = None
    selected_option: Optional[str] = None
    answer_type: str = "text"
    word_count: int = 0
    time_spent_seconds: int = 0


class EvaluationQuestionItem(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    marks: int
    order_index: int
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    blooms_level: Optional[str] = None


class StudentEvaluationItem(BaseModel):
    student_id: int
    student_name: str
    student_code: str
    auto_score: Optional[float] = None
    manual_score: Optional[float] = None
    final_score: Optional[float] = None
    total_marks: int = 0
    status: str = "pending"
    flag: str = "none"
    flag_resolved: bool = True
    evaluated_count: int = 0
    total_questions: int = 0
    submitted: bool = False
    submitted_at: Optional[datetime] = None
    integrity_percentage: float = 100.0


class EvaluationDashboardResponse(BaseModel):
    exam_id: int
    exam_title: str
    subject: str
    class_name: Optional[str] = None
    total_students: int = 0
    submitted_count: int = 0
    evaluated_count: int = 0
    pending_count: int = 0
    flagged_count: int = 0
    avg_score: float = 0.0
    highest_score: float = 0.0
    lowest_score: float = 0.0
    progress_pct: float = 0.0
    auto_graded_pct: float = 0.0
    manual_pct: float = 0.0
    total_marks: int = 0


class EvaluationQueueResponse(BaseModel):
    items: list[StudentEvaluationItem]
    total: int
    page: int = 1
    per_page: int = 20


class AnswerEvaluationData(BaseModel):
    marks_awarded: Optional[float] = None
    feedback: Optional[str] = None
    flag: str = "none"
    flag_note: Optional[str] = None
    flag_resolved: bool = False
    ai_suggested_marks: Optional[float] = None
    ai_confidence: Optional[float] = None
    ai_reason: Optional[str] = None
    ai_suggestion_applied: bool = False
    evaluated_by: Optional[int] = None
    evaluated_at: Optional[datetime] = None
    is_auto_graded: bool = False


class QuestionWithEvaluation(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    marks: int
    order_index: int
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    blooms_level: Optional[str] = None
    answer: Optional[EvaluationAnswerItem] = None
    evaluation: Optional[AnswerEvaluationData] = None
    auto_score: Optional[float] = None
    is_correct: Optional[bool] = None


class StudentSubmissionResponse(BaseModel):
    student_id: int
    student_name: str
    student_code: str
    exam_id: int
    exam_title: str
    subject: str
    total_marks: int
    questions: list[QuestionWithEvaluation]
    auto_total_score: float = 0.0
    manual_total_score: Optional[float] = None
    final_total_score: float = 0.0
    evaluated_count: int = 0
    total_questions: int = 0
    submitted: bool = False
    submitted_at: Optional[datetime] = None
    integrity_percentage: float = 100.0


class SaveEvaluationRequest(BaseModel):
    student_id: int
    question_id: int
    marks_awarded: Optional[float] = None
    feedback: Optional[str] = None
    flag: str = "none"
    flag_note: Optional[str] = None


class SaveEvaluationResponse(BaseModel):
    message: str
    saved: bool = True


class AISuggestRequest(BaseModel):
    student_id: int
    question_id: int


class AISuggestResponse(BaseModel):
    suggested_marks: float
    confidence: float
    reason: str
    raw_response: Optional[str] = None


class FinalReviewResponse(BaseModel):
    exam_id: int
    exam_title: str
    subject: str
    total_students: int = 0
    submitted_count: int = 0
    not_submitted_count: int = 0
    evaluated_count: int = 0
    pending_count: int = 0
    flagged_count: int = 0
    avg_score: float = 0.0
    highest_score: float = 0.0
    lowest_score: float = 0.0
    pass_rate: float = 0.0
    fail_rate: float = 0.0
    ai_assisted_count: int = 0
    results_published: bool = False
    published_at: Optional[datetime] = None


class QuestionAnalyticsItem(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    marks: int
    order_index: int
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    blooms_level: Optional[str] = None
    avg_marks: float = 0.0
    correct_pct: float = 0.0
    incorrect_pct: float = 0.0
    unanswered_pct: float = 0.0
    student_count: int = 0


class TopicAnalyticsItem(BaseModel):
    topic: str
    question_count: int = 0
    avg_score: float = 0.0
    performance_pct: float = 0.0


class DifficultyAnalyticsItem(BaseModel):
    difficulty: str
    question_count: int = 0
    avg_score: float = 0.0
    performance_pct: float = 0.0


class BloomsAnalyticsItem(BaseModel):
    level: str
    question_count: int = 0
    avg_score: float = 0.0
    performance_pct: float = 0.0


class ScoreDistribution(BaseModel):
    range_0_20: int = 0
    range_21_40: int = 0
    range_41_60: int = 0
    range_61_80: int = 0
    range_81_100: int = 0


class FinalReviewReportResponse(BaseModel):
    summary: FinalReviewResponse
    score_distribution: ScoreDistribution
    question_analytics: list[QuestionAnalyticsItem]
    topic_analytics: list[TopicAnalyticsItem]
    difficulty_analytics: list[DifficultyAnalyticsItem]
    blooms_analytics: list[BloomsAnalyticsItem]


class PublishResultRequest(BaseModel):
    confirm: bool = False


class PublishResultResponse(BaseModel):
    message: str
    published: bool = True
    published_at: Optional[datetime] = None
