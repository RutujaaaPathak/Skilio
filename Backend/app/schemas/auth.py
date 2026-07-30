import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


PUBLIC_ROLES = frozenset({"student", "teacher"})


SEMESTER_CHOICES = frozenset({"1", "2", "3", "4", "5", "6", "7", "8", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"})


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
    institution_id: int | None = None
    department_id: int | None = None
    roll_number: str | None = None

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
    remember_me: bool = False


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    college: str | None = None
    branch: str | None = None
    division: str | None = None
    year: str | None = None
    phone: str | None = None
    batch: str | None = None
    institution_id: int | None = None
    department_id: int | None = None
    roll_number: str | None = None
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
    institution_id: int | None = None
    department_id: int | None = None
    roll_number: str | None = None
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
    last_login: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

    @field_validator("department", mode="before")
    @classmethod
    def coerce_department(cls, v):
        if hasattr(v, "name"):
            return v.name
        return v


class TokenResponse(BaseModel):
    token: str
    refresh_token: str
    user: UserResponse


class RefreshResponse(BaseModel):
    token: str | None = None
    refresh_token: str | None = None


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


class LoginHistoryItem(BaseModel):
    id: int
    success: bool
    ip_address: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


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


class OAuthLoginRequest(BaseModel):
    provider: str
    id_token: str
    role: str = "student"

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        if v not in ("google", "apple"):
            raise ValueError("Provider must be 'google' or 'apple'")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in PUBLIC_ROLES:
            raise ValueError(f"Invalid role '{v}'. Must be one of {sorted(PUBLIC_ROLES)}")
        return v


class AccountDeleteRequest(BaseModel):
    password: str


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    role: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is not None and v not in ("student", "teacher", "admin"):
            raise ValueError("Role must be 'student', 'teacher', or 'admin'")
        return v


class BulkInviteRequest(BaseModel):
    role: str = "student"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in PUBLIC_ROLES:
            raise ValueError(f"Invalid role '{v}'. Must be one of {sorted(PUBLIC_ROLES)}")
        return v


class ProfileCompletionResponse(BaseModel):
    percentage: int
    completed_fields: list[str]
    missing_fields: list[str]
    total_required: int
    is_complete: bool
