import re
from datetime import datetime

from pydantic import BaseModel, field_validator


class EmergencyContactCreate(BaseModel):
    name: str
    relationship: str
    phone: str
    alternate_phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_primary: bool = False
    note: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+?[\d\s\-()]{7,20}$", v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("alternate_phone")
    @classmethod
    def validate_alternate_phone(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\+?[\d\s\-()]{7,20}$", v):
            raise ValueError("Invalid alternate phone number format")
        return v


class EmergencyContactUpdate(BaseModel):
    name: str | None = None
    relationship: str | None = None
    phone: str | None = None
    alternate_phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_primary: bool | None = None
    note: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\+?[\d\s\-()]{7,20}$", v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("alternate_phone")
    @classmethod
    def validate_alternate_phone(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\+?[\d\s\-()]{7,20}$", v):
            raise ValueError("Invalid alternate phone number format")
        return v


class EmergencyContactResponse(BaseModel):
    id: int
    user_id: int
    name: str
    relationship: str
    phone: str
    alternate_phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_primary: bool
    note: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
