from datetime import datetime

from pydantic import BaseModel, field_validator


VALID_STATUSES = frozenset({"draft", "scheduled", "active", "completed"})
ASSIGNMENT_STATUSES = frozenset({"assigned", "started", "submitted", "reviewed"})


class ExamCreate(BaseModel):
    title: str
    subject: str
    description: str | None = None
    duration_minutes: int = 60
    total_marks: int = 100
    start_time: datetime
    end_time: datetime
    is_offline_enabled: bool = False
    tab_switch_limit: int = 3
    camera_required: bool = True
    voice_verification_enabled: bool = False
    adaptive_difficulty_enabled: bool = False
    zero_knowledge_generation_enabled: bool = False
    status: str = "draft"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Must be one of {sorted(VALID_STATUSES)}")
        return v

    @field_validator("start_time")
    @classmethod
    def start_must_be_aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("start_time must include timezone info")
        return v

    @field_validator("end_time")
    @classmethod
    def end_must_be_aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("end_time must include timezone info")
        return v

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v: datetime, info) -> datetime:
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time")
        return v

    @field_validator("duration_minutes")
    @classmethod
    def positive_duration(cls, v: int) -> int:
        if v < 1:
            raise ValueError("duration_minutes must be at least 1")
        return v

    @field_validator("tab_switch_limit")
    @classmethod
    def non_negative_tab_limit(cls, v: int) -> int:
        if v < 0:
            raise ValueError("tab_switch_limit cannot be negative")
        return v


class ExamUpdate(BaseModel):
    title: str | None = None
    subject: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    total_marks: int | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    is_offline_enabled: bool | None = None
    tab_switch_limit: int | None = None
    camera_required: bool | None = None
    voice_verification_enabled: bool | None = None
    adaptive_difficulty_enabled: bool | None = None
    zero_knowledge_generation_enabled: bool | None = None
    status: str | None = None


class ExamResponse(BaseModel):
    id: int
    teacher_id: int
    title: str
    subject: str
    description: str | None = None
    duration_minutes: int
    total_marks: int
    start_time: datetime
    end_time: datetime
    is_offline_enabled: bool
    tab_switch_limit: int
    camera_required: bool
    voice_verification_enabled: bool
    adaptive_difficulty_enabled: bool
    zero_knowledge_generation_enabled: bool
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ExamQuestionCreate(BaseModel):
    question_id: int
    marks: int = 1
    order_index: int = 0


class ExamQuestionBulkCreate(BaseModel):
    questions: list[ExamQuestionCreate]


class ExamQuestionResponse(BaseModel):
    id: int
    exam_id: int
    question_id: int
    marks: int
    order_index: int

    model_config = {"from_attributes": True}


class ExamAssignCreate(BaseModel):
    student_ids: list[int]


class ExamAssignmentResponse(BaseModel):
    id: int
    exam_id: int
    student_id: int
    assigned_by: int
    status: str
    assigned_at: datetime
    started_at: datetime | None = None
    submitted_at: datetime | None = None

    model_config = {"from_attributes": True}


class StudentExamResponse(BaseModel):
    id: int
    exam_id: int
    status: str
    assigned_at: datetime
    started_at: datetime | None = None
    submitted_at: datetime | None = None
    exam: ExamResponse | None = None

    model_config = {"from_attributes": True}
