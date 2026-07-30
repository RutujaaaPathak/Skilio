from datetime import datetime

from pydantic import BaseModel, field_validator

from app.schemas.exam import ExamResponse


class ClassCreate(BaseModel):
    name: str
    subject: str
    semester: str | None = None
    academic_year: str | None = None
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Class name is required")
        return v.strip()

    @field_validator("subject")
    @classmethod
    def subject_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Subject is required")
        return v.strip()


class ClassUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    semester: str | None = None
    academic_year: str | None = None
    description: str | None = None
    status: str | None = None


class ClassMemberResponse(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_email: str
    joined_at: datetime
    status: str

    model_config = {"from_attributes": True}


class ClassResponse(BaseModel):
    id: int
    name: str
    code: str
    subject: str
    teacher_id: int
    semester: str | None = None
    academic_year: str | None = None
    description: str | None = None
    status: str
    student_count: int = 0
    exam_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ClassDetailResponse(BaseModel):
    id: int
    name: str
    code: str
    subject: str
    teacher_id: int
    teacher_name: str
    semester: str | None = None
    academic_year: str | None = None
    description: str | None = None
    status: str
    student_count: int = 0
    exam_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class JoinClassRequest(BaseModel):
    code: str

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if len(cleaned) != 6:
            raise ValueError("Class code must be exactly 6 characters")
        return cleaned


class RegenerateCodeResponse(BaseModel):
    code: str


class AssignExamToClassRequest(BaseModel):
    class_ids: list[int]
    assign_to_future_members: bool = False


class ClassExamStatus(BaseModel):
    exam_id: int
    exam_title: str
    subject: str
    status: str
    total_students: int
    completed: int
    in_progress: int
    not_started: int


class AssignStudentsToClassRequest(BaseModel):
    student_ids: list[int]
