from datetime import datetime

from pydantic import BaseModel


class SyllabusCreate(BaseModel):
    subject: str
    topic: str
    chapter: str | None = None
    unit: str | None = None
    description: str | None = None
    learning_outcomes: str | None = None


class SyllabusUpdate(BaseModel):
    subject: str | None = None
    topic: str | None = None
    chapter: str | None = None
    unit: str | None = None
    description: str | None = None
    learning_outcomes: str | None = None
    is_active: bool | None = None


class SyllabusResponse(BaseModel):
    id: int
    teacher_id: int
    subject: str
    topic: str
    chapter: str | None = None
    unit: str | None = None
    description: str | None = None
    learning_outcomes: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class SyllabusSubjectResponse(BaseModel):
    subject: str
    topic_count: int