import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator
from sentry_sdk import init as sentry_init
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import inspect, text

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.rate_limiter import limiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.database import engine, Base
from app.routes import (
    admin_router,
    announcement_router,
    auth_router,
    departments_router,
    devices_router,
    emergency_contacts_router,
    exams_router,
    institutions_router,
    notifications_router,
    profile_router,
    proctor_router,
    questions_router,
    students_router,
    teacher_proctor_router,
    teacher_router,
    webauthn_router,
)
from app.models.notification import Notification
from app.services.email_service import EmailService

setup_logging()
logger = structlog.get_logger()


if settings.SENTRY_DSN:
    sentry_init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        integrations=[
            FastApiIntegration(),
            LoggingIntegration(level=None, event_level=None),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
    logger.info("sentry_initialized", environment=settings.SENTRY_ENVIRONMENT)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _run_migrations()

    if settings.SMTP_HOST and settings.SMTP_USER:
        if EmailService.verify_config():
            logger.info("smtp_verified")
        else:
            logger.warning("smtp_connection_failed")
    else:
        logger.info("smtp_not_configured")

    from app.services.scheduler import start as start_scheduler, shutdown as stop_scheduler
    start_scheduler()
    yield
    stop_scheduler()
    engine.dispose()
    logger.info("shutdown_complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(SlowAPIMiddleware)
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
app.include_router(admin_router, prefix="/api")
app.include_router(announcement_router, prefix="/api")
app.include_router(emergency_contacts_router, prefix="/api")
app.include_router(institutions_router, prefix="/api")
app.include_router(departments_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(webauthn_router, prefix="/api")


if settings.ENABLE_METRICS:
    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/ready")
def readiness():
    status = "ok"
    checks = {}

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = str(e)
        status = "degraded"

    if settings.SMTP_HOST and settings.SMTP_USER:
        checks["smtp"] = "ok" if EmailService.verify_config() else "unreachable"
    else:
        checks["smtp"] = "skipped"

    http_code = 200 if status == "ok" else 503
    return JSONResponse(
        status_code=http_code,
        content={"status": status, "checks": checks, "timestamp": datetime.now(timezone.utc).isoformat()},
    )


@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, RateLimitExceeded):
        raise exc
    logger.error("unhandled_exception", path=str(request.url), exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": str(request.url)},
    )


def _run_migrations():
    is_sqlite = "sqlite" in settings.DATABASE_URL
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

    if is_sqlite:
        exam_columns = {c["name"] for c in inspector.get_columns("exams")}
        with engine.begin() as conn:
            for col, col_type, default in [
                ("exam_type", "VARCHAR(50)", "'exam'"),
                ("difficulty_level", "VARCHAR(20)", "'medium'"),
                ("passing_marks", "INTEGER", None),
                ("updated_at", "DATETIME", None),
                ("timezone", "VARCHAR(50)", "'UTC'"),
                ("cancellation_reason", "TEXT", None),
                ("original_start_time", "DATETIME", None),
                ("reschedule_reason", "TEXT", None),
                ("grace_period_minutes", "INTEGER", "0"),
                ("allow_late_entry", "BOOLEAN", "1"),
                ("late_entry_cutoff_minutes", "INTEGER", "0"),
                ("fullscreen_required", "BOOLEAN", "1"),
                ("microphone_required", "BOOLEAN", "1"),
                ("ai_monitoring_level", "VARCHAR(20)", "'medium'"),
                ("face_detection_enabled", "BOOLEAN", "1"),
                ("multiple_person_detection_enabled", "BOOLEAN", "1"),
                ("phone_detection_enabled", "BOOLEAN", "1"),
                ("voice_monitoring_enabled", "BOOLEAN", "1"),
                ("screen_monitoring_enabled", "BOOLEAN", "1"),
                ("registered_device_only", "BOOLEAN", "0"),
                ("randomize_questions", "BOOLEAN", "1"),
                ("shuffle_options", "BOOLEAN", "1"),
                ("negative_marking_enabled", "BOOLEAN", "0"),
                ("negative_marks_per_question", "FLOAT", "0.0"),
            ]:
                if col not in exam_columns:
                    sql = f"ALTER TABLE exams ADD COLUMN {col} {col_type}"
                    if default is not None:
                        sql += f" DEFAULT {default}"
                    conn.execute(text(sql))

    if "last_login" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login DATETIME"))
    if "oauth_provider" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20)"))
    if "oauth_id" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255)"))

    user_new_columns = {c["name"] for c in inspector.get_columns("users")}
    with engine.begin() as conn:
        if "institution_id" not in user_new_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN institution_id INTEGER"))
        if "department_id" not in user_new_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN department_id INTEGER"))
        if "roll_number" not in user_new_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN roll_number VARCHAR(50)"))

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
        pass


    try:
        q_columns = {c["name"] for c in inspector.get_columns("questions")}
        with engine.begin() as conn:
            if "is_deleted" not in q_columns:
                conn.execute(text("ALTER TABLE questions ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
            if "deleted_at" not in q_columns:
                conn.execute(text("ALTER TABLE questions ADD COLUMN deleted_at DATETIME"))
    except Exception:
        pass

    try:
        qv_columns = {c["name"] for c in inspector.get_columns("question_versions")}
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE IF NOT EXISTS question_versions (id INTEGER PRIMARY KEY AUTOINCREMENT, question_id INTEGER NOT NULL, version_number INTEGER NOT NULL, snapshot TEXT NOT NULL, changed_by INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (question_id) REFERENCES questions(id), FOREIGN KEY (changed_by) REFERENCES users(id))"))
    except Exception:
        pass
