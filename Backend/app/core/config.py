from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Skillo"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "Offline-First AI Exam Platform"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite:///./skillo.db"
    DATABASE_ECHO: bool = False

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
