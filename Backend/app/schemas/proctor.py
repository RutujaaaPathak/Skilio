from datetime import datetime
from pydantic import BaseModel, Field, field_validator

VALID_EVENT_TYPES = frozenset({
    "no_face_detected",
    "multiple_faces_detected",
    "face_mismatch",
    "student_verified",
    "camera_blocked",
    "suspicious_movement",
    "phone_detected",
    "looking_away",
    "tab_switch",
    "fullscreen_exit",
    "devtools_opened",
    "copy_paste",
    "right_click",
    "multiple_faces",
    "no_face",
    "window_blur",
})


class ProctorEventCreate(BaseModel):
    session_token: str
    event_type: str
    confidence_score: float = 1.0
    screenshot_url: str | None = None
    description: str | None = None
    metadata: dict | None = None

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if v not in VALID_EVENT_TYPES:
            raise ValueError(
                f"Invalid event_type '{v}'. Must be one of {sorted(VALID_EVENT_TYPES)}"
            )
        return v

    @field_validator("confidence_score")
    @classmethod
    def validate_confidence_score(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("confidence_score must be between 0.0 and 1.0 inclusive")
        return v


class ProctorEventResponse(BaseModel):
    id: int
    exam_session_id: int
    exam_id: int
    student_id: int
    event_type: str
    confidence_score: float | None = None
    screenshot_url: str | None = None
    severity: str
    description: str | None = None
    metadata: dict | None = Field(default=None, validation_alias="metadata_")
    created_at: datetime

    model_config = {"from_attributes": True}



class ProctorEventResponseWithRisk(BaseModel):
    event: ProctorEventResponse
    session_risk_score: float


class ProctorFrameAnalysisCreate(BaseModel):
    session_token: str
    screenshot_url: str


class ProctorFrameAnalysisResponse(BaseModel):
    phone_detected: bool
    looking_away: bool
    multiple_faces: bool
    no_face: bool
    camera_blocked: bool
    description: str
    session_risk_score: float

