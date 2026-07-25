from datetime import datetime
from pydantic import BaseModel


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    category: str = "general"
    institution: str | None = None
    department: str | None = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    created_by: int
    institution: str | None = None
    department: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
