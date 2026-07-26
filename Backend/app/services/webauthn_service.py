from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from webauthn import generate_registration_options, verify_registration_response, generate_authentication_options, verify_authentication_response
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    RegistrationCredential,
    AuthenticationCredential,
)
from webauthn.helpers.options_to_json import options_to_json

from app.core.config import settings
from app.models.user import User
from app.models.webauthn_credential import WebAuthnCredential


def _get_origin() -> str:
    origins = settings.CORS_ORIGINS
    return origins[0] if origins else "http://localhost:5173"


def _get_rp_id() -> str:
    return settings.WEBAUTHN_RP_ID


def generate_registration_options_for_user(db: Session, user: User) -> dict:
    existing = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.user_id == user.id,
        WebAuthnCredential.is_enabled == True,
    ).all()

    exclude_credentials = []
    for cred in existing:
        try:
            exclude_credentials.append(bytes.fromhex(cred.credential_id))
        except ValueError:
            pass

    options = generate_registration_options(
        rp_id=_get_rp_id(),
        rp_name=settings.WEBAUTHN_RP_NAME,
        user_id=str(user.id).encode(),
        user_name=user.email,
        user_display_name=user.name,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
        exclude_credentials=exclude_credentials,
    )

    challenge_hex = options.challenge.hex()
    setattr(options, "challenge_hex", challenge_hex)

    return {"options": options_to_json(options), "challenge": challenge_hex}


def verify_registration(db: Session, user: User, credential_json: dict, challenge: str) -> dict:
    try:
        verification = verify_registration_response(
            credential=RegistrationCredential.model_validate(credential_json),
            expected_challenge=bytes.fromhex(challenge),
            expected_origin=_get_origin(),
            expected_rp_id=_get_rp_id(),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"WebAuthn registration failed: {exc}",
        )

    existing = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.credential_id == verification.credential_id.hex()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This credential is already registered",
        )

    cred = WebAuthnCredential(
        user_id=user.id,
        credential_id=verification.credential_id.hex(),
        public_key=verification.credential_public_key.hex(),
        credential_type="public-key",
        transports=str(verification.transports) if verification.transports else None,
        aaguid=verification.aaguid.hex() if verification.aaguid else "",
        counter=verification.sign_count,
    )
    db.add(cred)
    db.commit()
    db.refresh(cred)

    return {"id": cred.id, "name": cred.name, "created_at": cred.created_at.isoformat() if isinstance(cred.created_at, datetime) else str(cred.created_at)}


def generate_authentication_options_for_user(db: Session, user: User) -> dict:
    credentials = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.user_id == user.id,
        WebAuthnCredential.is_enabled == True,
    ).all()

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No WebAuthn credentials registered. Set up a passkey first.",
        )

    allow_credentials = []
    for cred in credentials:
        try:
            allow_credentials.append(bytes.fromhex(cred.credential_id))
        except ValueError:
            pass

    options = generate_authentication_options(
        rp_id=_get_rp_id(),
        user_verification=UserVerificationRequirement.PREFERRED,
        allow_credentials=allow_credentials,
    )

    challenge_hex = options.challenge.hex()
    return {"options": options_to_json(options), "challenge": challenge_hex}


def verify_authentication(db: Session, user: User, credential_json: dict, challenge: str) -> dict:
    credential_id = credential_json.get("id", "").replace("-", "")

    stored = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.credential_id == credential_id,
        WebAuthnCredential.user_id == user.id,
        WebAuthnCredential.is_enabled == True,
    ).first()

    if not stored:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    try:
        verification = verify_authentication_response(
            credential=AuthenticationCredential.model_validate(credential_json),
            expected_challenge=bytes.fromhex(challenge),
            expected_origin=_get_origin(),
            expected_rp_id=_get_rp_id(),
            credential_public_key=bytes.fromhex(stored.public_key),
            credential_current_sign_count=stored.counter,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"WebAuthn authentication failed: {exc}",
        )

    stored.counter = verification.new_sign_count
    db.commit()

    return {"success": True, "credential_id": credential_id}


def list_credentials(db: Session, user: User) -> list[dict]:
    creds = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.user_id == user.id,
        WebAuthnCredential.is_enabled == True,
    ).all()

    return [
        {
            "id": c.id,
            "name": c.name or "Passkey",
            "created_at": c.created_at.isoformat() if isinstance(c.created_at, datetime) else str(c.created_at),
        }
        for c in creds
    ]


def delete_credential(db: Session, user: User, credential_id: int) -> dict:
    cred = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.id == credential_id,
        WebAuthnCredential.user_id == user.id,
    ).first()

    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found",
        )

    cred.is_enabled = False
    db.commit()
    return {"message": "Passkey deleted successfully."}
