from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.rate_limiter import limiter
from app.database import get_db
from app.models.user import User
from app.services import webauthn_service

router = APIRouter(prefix="/auth/webauthn", tags=["WebAuthn"])


@router.post("/register/begin")
@limiter.limit(settings.RATE_LIMIT_WEBAUTHN)
def begin_registration(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return webauthn_service.generate_registration_options_for_user(db, current_user)


@router.post("/register/complete")
@limiter.limit(settings.RATE_LIMIT_WEBAUTHN)
def complete_registration(
    body: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return webauthn_service.verify_registration(
        db, current_user, body.get("credential", {}), body.get("challenge", "")
    )


@router.post("/authenticate/begin")
@limiter.limit(settings.RATE_LIMIT_WEBAUTHN)
def begin_authentication(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return webauthn_service.generate_authentication_options_for_user(db, current_user)


@router.post("/authenticate/complete")
@limiter.limit(settings.RATE_LIMIT_WEBAUTHN)
def complete_authentication(
    body: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return webauthn_service.verify_authentication(
        db, current_user, body.get("credential", {}), body.get("challenge", "")
    )


@router.get("/credentials")
def list_credentials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return webauthn_service.list_credentials(db, current_user)


@router.delete("/credentials/{credential_id}")
def delete_credential(
    credential_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return webauthn_service.delete_credential(db, current_user, credential_id)
