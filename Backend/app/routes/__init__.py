from app.routes.admin import router as admin_router
from app.routes.auth import router as auth_router
from app.routes.devices import router as devices_router
from app.routes.exams import router as exams_router
from app.routes.profile import router as profile_router
from app.routes.questions import router as questions_router
from app.routes.students import router as students_router
from app.routes.proctor import router as proctor_router, teacher_router as teacher_proctor_router
from app.routes.announcements import router as announcement_router
from app.routes.teacher import router as teacher_router
from app.routes.emergency_contacts import router as emergency_contacts_router
from app.routes.institutions import router as institutions_router
from app.routes.departments import router as departments_router
from app.routes.webauthn_routes import router as webauthn_router
from app.routes.notifications import router as notifications_router
from app.routes.syllabus import router as syllabus_router
from app.routes.achievements import router as achievements_router
from app.routes.security import router as security_router

__all__ = ["admin_router", "auth_router", "devices_router", "exams_router", "profile_router", "questions_router", "students_router", "proctor_router", "teacher_proctor_router", "teacher_router", "announcement_router", "emergency_contacts_router", "institutions_router", "departments_router", "webauthn_router", "notifications_router", "syllabus_router", "achievements_router", "security_router"]

