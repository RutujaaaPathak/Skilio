from datetime import datetime, timezone

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, field_serializer, field_validator, model_validator


VALID_STATUSES = frozenset({"draft", "scheduled", "active", "completed", "cancelled"})
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
    fullscreen_required: bool = True
    microphone_required: bool = True
    tab_switch_limit: int = 3
    camera_required: bool = True
    voice_verification_enabled: bool = False
    ai_monitoring_level: str = "medium"
    face_detection_enabled: bool = True
    multiple_person_detection_enabled: bool = True
    phone_detection_enabled: bool = True
    voice_monitoring_enabled: bool = True
    screen_monitoring_enabled: bool = True
    registered_device_only: bool = False
    randomize_questions: bool = True
    shuffle_options: bool = True
    negative_marking_enabled: bool = False
    negative_marks_per_question: float = 0.0
    adaptive_difficulty_enabled: bool = False
    zero_knowledge_generation_enabled: bool = False
    exam_type: str = "exam"
    difficulty_level: str = "medium"
    passing_marks: int | None = None
    timezone: str = "UTC"
    cancellation_reason: str | None = None
    grace_period_minutes: int = 0
    allow_late_entry: bool = True
    late_entry_cutoff_minutes: int = 0
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

    @field_validator("exam_type")
    @classmethod
    def validate_exam_type(cls, v: str) -> str:
        allowed = {"exam", "quiz", "midterm", "final", "practice", "assignment"}
        if v not in allowed:
            raise ValueError(f"Invalid exam_type '{v}'. Must be one of {sorted(allowed)}")
        return v

    @field_validator("passing_marks")
    @classmethod
    def validate_passing_marks(cls, v: int | None, info) -> int | None:
        if v is not None:
            if v < 0:
                raise ValueError("passing_marks cannot be negative")
            total = info.data.get("total_marks")
            if total is not None and v > total:
                raise ValueError("passing_marks cannot exceed total_marks")
        return v

    @field_validator("difficulty_level")
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        allowed = {"easy", "medium", "hard"}
        if v not in allowed:
            raise ValueError(f"Invalid difficulty_level '{v}'. Must be one of {sorted(allowed)}")
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
    fullscreen_required: bool | None = None
    microphone_required: bool | None = None
    tab_switch_limit: int | None = None
    camera_required: bool | None = None
    voice_verification_enabled: bool | None = None
    ai_monitoring_level: str | None = None
    face_detection_enabled: bool | None = None
    multiple_person_detection_enabled: bool | None = None
    phone_detection_enabled: bool | None = None
    voice_monitoring_enabled: bool | None = None
    screen_monitoring_enabled: bool | None = None
    registered_device_only: bool | None = None
    randomize_questions: bool | None = None
    shuffle_options: bool | None = None
    negative_marking_enabled: bool | None = None
    negative_marks_per_question: float | None = None
    adaptive_difficulty_enabled: bool | None = None
    zero_knowledge_generation_enabled: bool | None = None
    exam_type: str | None = None
    difficulty_level: str | None = None
    passing_marks: int | None = None
    timezone: str | None = None
    cancellation_reason: str | None = None
    original_start_time: datetime | None = None
    reschedule_reason: str | None = None
    grace_period_minutes: int | None = None
    allow_late_entry: bool | None = None
    late_entry_cutoff_minutes: int | None = None
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
    fullscreen_required: bool
    microphone_required: bool
    tab_switch_limit: int
    camera_required: bool
    voice_verification_enabled: bool
    ai_monitoring_level: str = "medium"
    face_detection_enabled: bool = True
    multiple_person_detection_enabled: bool = True
    phone_detection_enabled: bool = True
    voice_monitoring_enabled: bool = True
    screen_monitoring_enabled: bool = True
    registered_device_only: bool = False
    randomize_questions: bool = True
    shuffle_options: bool = True
    negative_marking_enabled: bool = False
    negative_marks_per_question: float = 0.0
    adaptive_difficulty_enabled: bool
    zero_knowledge_generation_enabled: bool
    exam_type: str | None = "exam"
    difficulty_level: str | None = "medium"
    passing_marks: int | None = None
    timezone: str = "UTC"
    cancellation_reason: str | None = None
    original_start_time: datetime | None = None
    reschedule_reason: str | None = None
    grace_period_minutes: int = 0
    allow_late_entry: bool = True
    late_entry_cutoff_minutes: int = 0
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

    @field_serializer("start_time", "end_time", "original_start_time", "created_at", "updated_at")
    def serialize_datetime(self, v: datetime | None) -> str | None:
        if v is None:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()


class ExamCancelRequest(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Cancellation reason cannot be empty")
        return v.strip()


class ExamRescheduleRequest(BaseModel):
    new_start_time: datetime
    new_end_time: datetime
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Reschedule reason cannot be empty")
        return v.strip()

    @field_validator("new_start_time")
    @classmethod
    def start_must_be_aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("new_start_time must include timezone info")
        return v

    @field_validator("new_end_time")
    @classmethod
    def end_must_be_aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("new_end_time must include timezone info")
        return v

    @field_validator("new_end_time")
    @classmethod
    def end_after_start(cls, v: datetime, info) -> datetime:
        start = info.data.get("new_start_time")
        if start and v <= start:
            raise ValueError("new_end_time must be after new_start_time")
        return v


class ConflictInfo(BaseModel):
    exam_id: int
    title: str
    status: str
    start_time: datetime
    end_time: datetime

    model_config = {"from_attributes": True}


class ConflictCheckResponse(BaseModel):
    has_conflict: bool
    conflicts: list[ConflictInfo]


class StudentConflictInfo(BaseModel):
    student_id: int
    exam_id: int
    exam_title: str
    exam_start_time: datetime
    exam_end_time: datetime


class StudentConflictCheckResponse(BaseModel):
    has_conflict: bool
    conflicts: list[StudentConflictInfo]


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


# ── Offline Package Schemas ──

class OfflineQuestionResponse(BaseModel):
    """Question data sent in offline package – NO correct_answer included."""
    id: int
    subject: str
    topic: str
    difficulty: str
    question_type: str
    question_text: str
    options: str | None = None
    marks: int
    explanation: str | None = None
    order_index: int

    model_config = {"from_attributes": True}


class OfflinePackageResponse(BaseModel):
    """
    Full offline package for frontend to cache (IndexedDB / localStorage).

    Frontend usage:
      - Store this JSON blob in IndexedDB keyed by `session_token`
      - Use `exam` fields to render the instructions / header
      - Use `questions` to render the exam UI (answers are collected locally)
      - Use `session_token` for all subsequent sync requests
      - Use `assignment_id` to identify the assignment on sync
      - Enforce `exam.tab_switch_limit`, `exam.camera_required`,
        `exam.voice_verification_enabled` locally during the exam
    """
    exam: ExamResponse
    questions: list[OfflineQuestionResponse]
    assignment_id: int
    session_token: str
    downloaded_at: datetime


# ── Answer Sync Schemas ──

class AnswerSyncItem(BaseModel):
    """A single answer from the frontend's offline store."""
    question_id: int
    answer_text: str | None = None
    selected_option: str | None = None
    answer_type: str = "text"
    local_saved_at: datetime | None = None
    word_count: int = 0
    edit_count: int = 0
    time_spent_seconds: int = 0


class AnswerSyncRequest(BaseModel):
    """Batch payload sent after offline exam completion."""
    session_token: str
    answers: list[AnswerSyncItem]
    device_fingerprint: str | None = None
    final_submission: bool = False

    @model_validator(mode="after")
    def check_at_least_one_field(self):
        for i, a in enumerate(self.answers):
            if not a.answer_text and not a.selected_option:
                raise ValueError(f"answers[{i}]: either answer_text or selected_option is required")
        return self


class AnswerSyncResponse(BaseModel):
    message: str
    synced_count: int
    session_status: str
    submitted_at: datetime | None = None


class StudentAnswerResponse(BaseModel):
    """Safe answer view returned to the student (no correct_answer)."""
    question_id: int
    answer_text: str | None = None
    selected_option: str | None = None
    answer_type: str
    word_count: int
    edit_count: int
    time_spent_seconds: int
    sync_status: str
    local_saved_at: datetime | None = None
    synced_at: datetime | None = None

    model_config = {"from_attributes": True}


class MySubmissionResponse(BaseModel):
    """Full submission view for the student after syncing."""
    exam_id: int
    assignment_id: int
    assignment_status: str
    submitted_at: datetime | None = None
    answers: list[StudentAnswerResponse]
    total_questions: int
    answered_count: int
    score_percentage: float | None = None
    correct_count: int | None = None
    integrity_percentage: float | None = None


# ── Voice Verification ──

class VoiceVerifyRequest(BaseModel):
    session_token: str
    transcript: str


class VoiceVerifyResponse(BaseModel):
    matched: int
    total: int
    passed: bool
    required: int
