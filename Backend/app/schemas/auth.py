from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


PUBLIC_ROLES = frozenset({"student", "teacher"})


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in PUBLIC_ROLES:
            raise ValueError(f"Invalid role '{v}'. Must be one of {sorted(PUBLIC_ROLES)}")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    token: str
    user: UserResponse
