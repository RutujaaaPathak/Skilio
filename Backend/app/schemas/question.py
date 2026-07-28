from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_validator


DIFFICULTIES = frozenset({"easy", "medium", "hard"})
QUESTION_TYPES = frozenset({"mcq", "short_answer", "long_answer"})
BLOOMS_LEVELS = frozenset({"remember", "understand", "apply", "analyze", "evaluate", "create"})


class QuestionCreate(BaseModel):
    subject: str
    topic: str
    difficulty: str
    question_type: str
    question_text: str
    options: list[str] | None = None
    correct_answer: str
    marks: int = 1
    explanation: str | None = None
    is_ai_generated: bool = False
    blooms_level: str | None = None
    ai_model: str | None = None
    ai_prompt_used: str | None = None
    generation_source: str | None = None

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        if v not in DIFFICULTIES:
            raise ValueError(f"Difficulty must be one of {sorted(DIFFICULTIES)}")
        return v

    @field_validator("question_type")
    @classmethod
    def validate_question_type(cls, v: str) -> str:
        if v not in QUESTION_TYPES:
            raise ValueError(f"Question type must be one of {sorted(QUESTION_TYPES)}")
        return v

    @field_validator("marks")
    @classmethod
    def validate_marks(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Marks must be at least 1")
        return v

    @field_validator("blooms_level")
    @classmethod
    def validate_blooms(cls, v: str | None) -> str | None:
        if v is not None and v not in BLOOMS_LEVELS:
            raise ValueError(f"Bloom's level must be one of {sorted(BLOOMS_LEVELS)}")
        return v

    @model_validator(mode="after")
    def validate_mcq_options(self) -> "QuestionCreate":
        if self.question_type == "mcq":
            if not self.options or len(self.options) < 2:
                raise ValueError("MCQ must have at least 2 options")
            if len(set(self.options)) != len(self.options):
                raise ValueError("MCQ options must be unique")
        return self


class QuestionUpdate(BaseModel):
    subject: str | None = None
    topic: str | None = None
    difficulty: str | None = None
    question_type: str | None = None
    question_text: str | None = None
    options: list[str] | None = None
    correct_answer: str | None = None
    marks: int | None = None
    explanation: str | None = None

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str | None) -> str | None:
        if v is not None and v not in DIFFICULTIES:
            raise ValueError(f"Difficulty must be one of {sorted(DIFFICULTIES)}")
        return v

    @field_validator("question_type")
    @classmethod
    def validate_question_type(cls, v: str | None) -> str | None:
        if v is not None and v not in QUESTION_TYPES:
            raise ValueError(f"Question type must be one of {sorted(QUESTION_TYPES)}")
        return v

    @field_validator("marks")
    @classmethod
    def validate_marks(cls, v: int | None) -> int | None:
        if v is not None and v < 1:
            raise ValueError("Marks must be at least 1")
        return v


class QuestionBulkCreate(BaseModel):
    questions: list[QuestionCreate]

    @model_validator(mode="after")
    def validate_bulk(self) -> "QuestionBulkCreate":
        if not self.questions:
            raise ValueError("At least one question is required")
        if len(self.questions) > 500:
            raise ValueError("Maximum 500 questions per bulk import")
        return self


class AIGenerateRequest(BaseModel):
    subject: str
    topic: str
    difficulties: list[str] = ["medium"]
    question_types: list[str] = ["mcq"]
    count: int = 5
    marks: int = 1
    syllabus_ids: list[int] | None = None
    blooms_levels: list[str] | None = None

    @field_validator("difficulties")
    @classmethod
    def validate_difficulties(cls, v: list[str]) -> list[str]:
        invalid = [d for d in v if d not in DIFFICULTIES]
        if invalid:
            raise ValueError(f"Invalid difficulties: {invalid}. Must be one of {sorted(DIFFICULTIES)}")
        if not v:
            raise ValueError("At least one difficulty is required")
        return v

    @field_validator("question_types")
    @classmethod
    def validate_question_types(cls, v: list[str]) -> list[str]:
        invalid = [t for t in v if t not in QUESTION_TYPES]
        if invalid:
            raise ValueError(f"Invalid question types: {invalid}. Must be one of {sorted(QUESTION_TYPES)}")
        if not v:
            raise ValueError("At least one question type is required")
        return v

    @field_validator("count")
    @classmethod
    def validate_count(cls, v: int) -> int:
        if v < 1 or v > 20:
            raise ValueError("Count must be between 1 and 20")
        return v

    @field_validator("marks")
    @classmethod
    def validate_marks(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Marks must be at least 1")
        return v

    @field_validator("blooms_levels")
    @classmethod
    def validate_blooms_levels(cls, v: list[str] | None) -> list[str] | None:
        if v:
            invalid = [b for b in v if b not in BLOOMS_LEVELS]
            if invalid:
                raise ValueError(f"Invalid Bloom's levels: {invalid}. Must be one of {sorted(BLOOMS_LEVELS)}")
        return v


class AIGeneratedQuestion(BaseModel):
    subject: str
    topic: str
    difficulty: str
    question_type: str
    question_text: str
    options: list[str] | None = None
    correct_answer: str
    marks: int = 1
    explanation: str | None = None
    is_ai_generated: bool = True
    blooms_level: str | None = None


class AIGenerateResponse(BaseModel):
    questions: list[AIGeneratedQuestion]


class QuestionResponse(BaseModel):
    id: int
    teacher_id: int
    subject: str
    topic: str
    difficulty: str
    question_type: str
    question_text: str
    options: Any = None
    correct_answer: str
    marks: int
    explanation: str | None
    is_ai_generated: bool
    blooms_level: str | None = None
    ai_model: str | None = None
    ai_prompt_used: str | None = None
    generation_source: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedQuestionResponse(BaseModel):
    items: list[QuestionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BulkUpdateRequest(BaseModel):
    question_ids: list[int]
    subject: str | None = None
    topic: str | None = None
    difficulty: str | None = None
    question_type: str | None = None
    marks: int | None = None
    explanation: str | None = None

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str | None) -> str | None:
        if v is not None and v not in DIFFICULTIES:
            raise ValueError(f"Difficulty must be one of {sorted(DIFFICULTIES)}")
        return v

    @field_validator("question_type")
    @classmethod
    def validate_question_type(cls, v: str | None) -> str | None:
        if v is not None and v not in QUESTION_TYPES:
            raise ValueError(f"Question type must be one of {sorted(QUESTION_TYPES)}")
        return v

    @field_validator("marks")
    @classmethod
    def validate_marks(cls, v: int | None) -> int | None:
        if v is not None and v < 1:
            raise ValueError("Marks must be at least 1")
        return v


class BulkDuplicateRequest(BaseModel):
    question_ids: list[int]


class QuestionAnalytics(BaseModel):
    total_questions: int
    by_difficulty: dict[str, int]
    by_type: dict[str, int]
    by_subject: dict[str, int]
    recently_added: int
    unused: int
    average_difficulty: str
    total_ai_generated: int
    ai_generated_saved: int
    by_blooms_level: dict[str, int]
    ai_generation_trend: list[dict]  # [{"week": "2026-01", "count": 5}, ...]
    recent_ai_activity: list[dict]  # last 5 AI-generated questions with timestamp


class VersionEntry(BaseModel):
    id: int
    question_id: int
    version_number: int
    snapshot: dict
    changed_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SuggestResponse(BaseModel):
    suggestions: list[str]


class GenerateEquivalentRequest(BaseModel):
    question_id: int | None = None
    count: int = 1

    @field_validator("count")
    @classmethod
    def validate_count(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Count must be between 1 and 5")
        return v


class DuplicateCheckRequest(BaseModel):
    question_texts: list[str]

    @field_validator("question_texts")
    @classmethod
    def validate_texts(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("At least one question text is required")
        if len(v) > 50:
            raise ValueError("Maximum 50 question texts per request")
        return v


class DuplicateCheckItem(BaseModel):
    text: str
    is_duplicate: bool
    existing_question_id: int | None = None
    existing_question_text: str | None = None


class DuplicateCheckResponse(BaseModel):
    results: list[DuplicateCheckItem]
    total_duplicates: int