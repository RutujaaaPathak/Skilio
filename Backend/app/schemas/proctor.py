import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator


SEVERITY_MAP = {
    "tab_switch": "medium",
    "fullscreen_exit": "high",
    "copy_paste": "high",
    "multiple_faces": "critical",
    "no_face": "high",
    "phone_detected": "critical",
    "window_blur": "medium",
    "right_click": "low",
}

SEVERITY_LEVELS = frozenset({"low", "medium", "high", "critical"})


class ProctorEventCreate(BaseModel):
    exam_session_id: int
    exam_id: int
    event_type: str
    description: str | None = None
    metadata: dict | None = None


class ProctorEventResponse(BaseModel):
    id: int
    exam_session_id: int
    exam_id: int
    student_id: int
    event_type: str
    severity: str
    description: str | None = None
    event_metadata: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("event_metadata", mode="before")
    @classmethod
    def parse_json(cls, v: Any) -> Any:
        if isinstance(v, str):
            return json.loads(v) if v else None
        return v
