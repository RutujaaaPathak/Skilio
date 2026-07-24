import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import inspect, text

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.database import engine, Base
from app.routes import (
    auth_router,
    devices_router,
    exams_router,
    profile_router,
    proctor_router,
    questions_router,
    students_router,
    teacher_proctor_router,
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(SecurityHeadersMiddleware)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(devices_router, prefix="/api")
app.include_router(questions_router, prefix="/api")
app.include_router(exams_router, prefix="/api")
app.include_router(students_router, prefix="/api")
app.include_router(proctor_router, prefix="/api")
app.include_router(teacher_proctor_router, prefix="/api")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, RateLimitExceeded):
        raise exc
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": str(request.url)},
    )


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    columns = {c["name"] for c in inspector.get_columns("users")}
    with engine.begin() as conn:
        if "is_verified" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0"))
        if "username" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(255)"))
    rt_columns = {c["name"] for c in inspector.get_columns("refresh_tokens")}
    with engine.begin() as conn:
        if "ip_address" not in rt_columns:
            conn.execute(text("ALTER TABLE refresh_tokens ADD COLUMN ip_address VARCHAR(45)"))
            conn.execute(text("ALTER TABLE refresh_tokens ADD COLUMN user_agent TEXT"))

    profile_columns = {c["name"] for c in inspector.get_columns("users")}
    with engine.begin() as conn:
        for col, col_type in [
            ("profile_photo_url", "VARCHAR(500)"),
            ("department", "VARCHAR(255)"),
            ("subjects", "TEXT"),
            ("designation", "VARCHAR(255)"),
            ("institution_address", "VARCHAR(500)"),
            ("qualifications", "TEXT"),
            ("experience", "TEXT"),
            ("bio", "TEXT"),
            ("specialization", "VARCHAR(255)"),
            ("languages", "VARCHAR(500)"),
            ("alternate_contact", "VARCHAR(20)"),
            ("updated_at", "DATETIME"),
            ("notification_preferences", "TEXT"),
        ]:
            if col not in profile_columns:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
