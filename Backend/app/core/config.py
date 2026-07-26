from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import field_validator
import warnings


class Settings(BaseSettings):
    APP_NAME: str = "Skillo"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "Offline-First AI Exam Platform"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite:///./skillo.db"
    DATABASE_ECHO: bool = False

    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REMEMBER_ME_TOKEN_EXPIRE_DAYS: int = 30

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    COOKIE_SECURE: bool = False

    FRONTEND_URL: str = "http://localhost:5173"

    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_TLS: bool = True
    SMTP_FROM_EMAIL: str | None = None

    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    APPLE_CLIENT_ID: str | None = None
    APPLE_CLIENT_SECRET: str | None = None

    MAX_ACTIVE_SESSIONS: int = 5

    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    RATE_LIMIT_SIGNUP: str = "5/minute"
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_REFRESH: str = "20/minute"
    RATE_LIMIT_FORGOT_PASSWORD: str = "3/minute"
    RATE_LIMIT_RESET_PASSWORD: str = "5/minute"
    RATE_LIMIT_VERIFY_EMAIL: str = "10/minute"
    RATE_LIMIT_RESEND_VERIFICATION: str = "3/minute"
    RATE_LIMIT_UPDATE_PROFILE: str = "10/minute"
    RATE_LIMIT_TOTP_VERIFY: str = "10/minute"
    RATE_LIMIT_UPLOAD_PHOTO: str = "5/minute"
    RATE_LIMIT_WEBAUTHN: str = "10/minute"

    WEBAUTHN_RP_NAME: str = "Skillo"
    WEBAUTHN_RP_ID: str = "localhost"

    SENTRY_DSN: str | None = None
    SENTRY_ENVIRONMENT: str = "development"
    ENABLE_METRICS: bool = True
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # "json" or "console"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024
    ALLOWED_EXTENSIONS: list[str] = ["jpg", "jpeg", "png", "webp"]

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v):
        if not v or v == "change-me-in-production":
            warnings.warn(
                "SECRET_KEY is not set or is the insecure default. "
                "Set a strong SECRET_KEY environment variable for production use.",
                stacklevel=2,
            )
            return "dev-insecure-key-not-for-production"
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
