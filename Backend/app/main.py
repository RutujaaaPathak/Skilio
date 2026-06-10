from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.database import engine, Base
from app.routes import auth_router, questions_router, exams_router, students_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──
app.include_router(auth_router, prefix="/api")
app.include_router(questions_router, prefix="/api")
app.include_router(exams_router, prefix="/api")
app.include_router(students_router, prefix="/api")

# ── Health ──
@app.get("/health")
def health():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}


# ── Global error handler ──
@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": str(request.url)},
    )


# ── Startup: create tables ──
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
