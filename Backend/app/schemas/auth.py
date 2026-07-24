import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


PUBLIC_ROLES = frozenset({"student", "teacher"})


class UserCreate(BaseModel):
    name: str
    username: str | None = None
    email: EmailStr
    password: str
    role: str = "student"
    college: str | None = None
    branch: str | None = None
    division: str | None = None
    year: str | None = None
    phone: str | None = None
    batch: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in PUBLIC_ROLES:
            raise ValueError(
                f"Invalid role '{v}'. Must be one of {sorted(PUBLIC_ROLES)}"
            )
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserLogin(BaseModel):
    identifier: str
    password: str
    role: str


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    college: str | None = None
    branch: str | None = None
    division: str | None = None
    year: str | None = None
    phone: str | None = None
    batch: str | None = None
    profile_photo_url: str | None = None
    department: str | None = None
    subjects: str | None = None
    designation: str | None = None
    institution_address: str | None = None
    qualifications: str | None = None
    experience: str | None = None
    bio: str | None = None
    specialization: str | None = None
    languages: str | None = None
    alternate_contact: str | None = None
    notification_preferences: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\+?[\d\s\-()]{7,20}$", v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("alternate_contact")
    @classmethod
    def validate_alternate_contact(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\+?[\d\s\-()]{7,20}$", v):
            raise ValueError("Invalid alternate contact number format")
        return v

    @field_validator("profile_photo_url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith(("http://", "https://", "/uploads/")):
            raise ValueError("Invalid photo URL format")
        return v


class UserResponse(BaseModel):
    id: int
    name: str
    username: str | None = None
    email: str
    role: str
    college: str | None = None
    branch: str | None = None
    division: str | None = None
    year: str | None = None
    phone: str | None = None
    batch: str | None = None
    profile_photo_url: str | None = None
    department: str | None = None
    subjects: str | None = None
    designation: str | None = None
    institution_address: str | None = None
    qualifications: str | None = None
    experience: str | None = None
    bio: str | None = None
    specialization: str | None = None
    languages: str | None = None
    alternate_contact: str | None = None
    notification_preferences: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    token: str
    refresh_token: str
    user: UserResponse


class RefreshResponse(BaseModel):
    token: str
    refresh_token: str


class LogoutResponse(BaseModel):
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class ResetPasswordResponse(BaseModel):
    message: str


class VerifyEmailRequest(BaseModel):
    otp: str


class VerifyEmailResponse(BaseModel):
    message: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class SessionResponse(BaseModel):
    id: int
    created_at: datetime
    expires_at: datetime
    device_info: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    is_current: bool = False

    model_config = {"from_attributes": True}


class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    backup_codes: list[str]


class TOTPVerifyRequest(BaseModel):
    temp_token: str
    totp_code: str


class TOTPEnableRequest(BaseModel):
    totp_code: str


class TOTPDisableRequest(BaseModel):
    password: str


class TOTPStatusResponse(BaseModel):
    is_enabled: bool


class LoginResponse(BaseModel):
    token: str
    refresh_token: str
    user: UserResponse


class Login2FARequired(BaseModel):
    requires_2fa: bool
    temp_token: str