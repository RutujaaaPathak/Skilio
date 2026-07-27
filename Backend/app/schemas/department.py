from datetime import datetime

from pydantic import BaseModel


class DepartmentCreate(BaseModel):
    institution_id: int
    name: str
    code: str


class DepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    is_active: bool | None = None


class DepartmentResponse(BaseModel):
    id: int
    institution_id: int
    name: str
    code: str
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
