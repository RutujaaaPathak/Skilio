from datetime import datetime

from pydantic import BaseModel


class InstitutionCreate(BaseModel):
    name: str
    code: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None


class InstitutionUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    is_active: bool | None = None


class InstitutionResponse(BaseModel):
    id: int
    name: str
    code: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
