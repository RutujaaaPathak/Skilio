from pydantic import BaseModel


class CoreAnalyticsResponse(BaseModel):
    overall_average_score: float | None = None
    highest_score: float | None = None
    lowest_score: float | None = None
    pass_percentage: float | None = None
    total_exams_completed: int = 0
    total_exams_attempted: int = 0
    total_time_spent_seconds: int = 0
    average_time_per_exam_seconds: int = 0


class WeeklyProgressItem(BaseModel):
    week_start: str
    week_end: str
    average_score: float | None = None
    exams_count: int = 0


class WeeklyProgressResponse(BaseModel):
    weekly_progress: list[WeeklyProgressItem]
    has_data: bool = False


class LearningStreakResponse(BaseModel):
    current_streak: int = 0
    longest_streak: int = 0
    has_data: bool = False


class TopicMasteryItem(BaseModel):
    topic: str
    subject: str
    average_score: float | None = None
    total_questions: int = 0
    correct_count: int = 0
    status: str = "unknown"


class TopicMasteryResponse(BaseModel):
    topics: list[TopicMasteryItem]
    has_data: bool = False


class StudentRankInfo(BaseModel):
    rank: int = 0
    total_students: int = 0
    average_score: float | None = None
    label: str = ""


class RankingResponse(BaseModel):
    institution_rank: StudentRankInfo | None = None
    department_rank: StudentRankInfo | None = None
    batch_rank: StudentRankInfo | None = None
    overall_rank: StudentRankInfo | None = None
    has_data: bool = False


class IntegrityEventCount(BaseModel):
    event_type: str
    count: int = 0
    severity: str = "low"


class IntegrityExamScore(BaseModel):
    exam_id: int
    exam_title: str
    integrity_percentage: float | None = None
    total_events: int = 0


class IntegrityBreakdownResponse(BaseModel):
    overall_integrity: float | None = None
    integrity_by_exam: list[IntegrityExamScore] = []
    event_breakdown: list[IntegrityEventCount] = []
    has_data: bool = False
