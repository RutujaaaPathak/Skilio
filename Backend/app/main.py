import os
from contextlib import asynccontextmanager

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
    announcement_router,
    auth_router,
    devices_router,
    exams_router,
    profile_router,
    proctor_router,
    questions_router,
    students_router,
    teacher_proctor_router,
    teacher_router,
)
from app.models.notification import Notification


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    from app.services.scheduler import start as start_scheduler, shutdown as stop_scheduler
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    lifespan=lifespan,
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
app.include_router(teacher_router, prefix="/api")
app.include_router(announcement_router, prefix="/api")


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


def _run_migrations():
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

    exam_columns = {c["name"] for c in inspector.get_columns("exams")}
    with engine.begin() as conn:
        if "exam_type" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN exam_type VARCHAR(50) DEFAULT 'exam'"))
        if "difficulty_level" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN difficulty_level VARCHAR(20) DEFAULT 'medium'"))
        if "passing_marks" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN passing_marks INTEGER"))
        if "updated_at" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN updated_at DATETIME"))
        if "timezone" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'"))
        if "cancellation_reason" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN cancellation_reason TEXT"))
        if "original_start_time" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN original_start_time DATETIME"))
        if "reschedule_reason" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN reschedule_reason TEXT"))
        if "grace_period_minutes" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN grace_period_minutes INTEGER DEFAULT 0"))
        if "allow_late_entry" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN allow_late_entry BOOLEAN DEFAULT 1"))
        if "late_entry_cutoff_minutes" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN late_entry_cutoff_minutes INTEGER DEFAULT 0"))
        if "fullscreen_required" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN fullscreen_required BOOLEAN DEFAULT 1"))
        if "microphone_required" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN microphone_required BOOLEAN DEFAULT 1"))
        if "ai_monitoring_level" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN ai_monitoring_level VARCHAR(20) DEFAULT 'medium'"))
        if "face_detection_enabled" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN face_detection_enabled BOOLEAN DEFAULT 1"))
        if "multiple_person_detection_enabled" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN multiple_person_detection_enabled BOOLEAN DEFAULT 1"))
        if "phone_detection_enabled" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN phone_detection_enabled BOOLEAN DEFAULT 1"))
        if "voice_monitoring_enabled" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN voice_monitoring_enabled BOOLEAN DEFAULT 1"))
        if "screen_monitoring_enabled" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN screen_monitoring_enabled BOOLEAN DEFAULT 1"))
        if "registered_device_only" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN registered_device_only BOOLEAN DEFAULT 0"))
        if "randomize_questions" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN randomize_questions BOOLEAN DEFAULT 1"))
        if "shuffle_options" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN shuffle_options BOOLEAN DEFAULT 1"))
        if "negative_marking_enabled" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN negative_marking_enabled BOOLEAN DEFAULT 0"))
        if "negative_marks_per_question" not in exam_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN negative_marks_per_question FLOAT DEFAULT 0.0"))

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

    try:
        note_columns = {c["name"] for c in inspector.get_columns("notifications")}
        with engine.begin() as conn:
            if "category" not in note_columns:
                conn.execute(text("ALTER TABLE notifications ADD COLUMN category VARCHAR(50) DEFAULT 'exam'"))
            if "is_read" not in note_columns:
                conn.execute(text("ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT 0"))
    except Exception:
        pass  # notifications table may not exist yet; create_all handles it
