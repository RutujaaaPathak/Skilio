from app.routes.auth import router as auth_router
from app.routes.questions import router as questions_router
from app.routes.exams import router as exams_router
from app.routes.students import router as students_router

__all__ = ["auth_router", "questions_router", "exams_router", "students_router"]
