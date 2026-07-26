import csv
import io

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.rate_limiter import limiter
from app.database import get_db
from app.models.user import User
from app.schemas.auth import AdminUserUpdate, BulkInviteRequest
from app.services.auth_service import AuthService
from app.services.email_service import EmailService

router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


@router.get("/users")
def list_users(
    role: str | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    return AuthService.admin_list_users(db, role=role, is_active=is_active, skip=skip, limit=limit)


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    return AuthService.admin_update_user(db, user_id, is_active=body.is_active, role=body.role)


@router.post("/bulk-invite")
@limiter.limit("3/minute")
async def bulk_invite(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    required = {"name", "email"}
    if not required.issubset(reader.fieldnames or set()):
        return {"error": "CSV must contain at least 'name' and 'email' columns", "imported": 0, "failed": 0}

    imported = 0
    failed = 0
    errors = []

    for idx, row in enumerate(reader, start=2):
        try:
            from app.core.security import hash_password, generate_refresh_token
            import secrets as sec
            temp_password = sec.token_urlsafe(12)
            user = User(
                name=row["name"],
                email=row["email"],
                hashed_password=hash_password(temp_password),
                role=row.get("role", "student").strip().lower(),
                college=row.get("college", "").strip() or None,
                branch=row.get("branch", "").strip() or None,
                division=row.get("division", "").strip() or None,
                year=row.get("year", "").strip() or None,
                batch=row.get("batch", "").strip() or None,
            )
            db.add(user)
            db.commit()

            EmailService.send(
                to=row["email"],
                subject="Welcome to Skillo — Your Account Has Been Created",
                html_body=f"""
                <h2>Welcome to Skillo, {row['name']}!</h2>
                <p>An admin has created an account for you.</p>
                <p><strong>Email:</strong> {row['email']}</p>
                <p><strong>Temporary Password:</strong> {temp_password}</p>
                <p>Please log in and change your password immediately.</p>
                """,
            )
            imported += 1
        except Exception as exc:
            db.rollback()
            failed += 1
            errors.append({"row": idx, "email": row.get("email", ""), "error": str(exc)})

    return {"imported": imported, "failed": failed, "errors": errors[:20]}
