from app.routes.auth import router as auth_router
from app.routes.devices import router as devices_router
from app.routes.exams import router as exams_router
from app.routes.questions import router as questions_router
from app.routes.students import router as students_router
from app.routes.proctor import student_router as proctor_router, teacher_router as teacher_proctor_router

__all__ = [
    "auth_router",
    "devices_router",
    "exams_router",
    "questions_router",
    "students_router",
    "proctor_router",
    "teacher_proctor_router",
]
