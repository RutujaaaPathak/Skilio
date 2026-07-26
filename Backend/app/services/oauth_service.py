from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException, status
from jose import jwk, jwt
from jose.constants import Algorithms
from jose.exceptions import JOSEError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, generate_refresh_token, hash_password
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.services.audit_service import AuditService


def _fetch_apple_public_keys() -> list[dict]:
    resp = httpx.get("https://appleid.apple.com/auth/keys", timeout=10)
    resp.raise_for_status()
    return resp.json().get("keys", [])


def _verify_google_token(id_token: str) -> dict:
    resp = httpx.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": id_token},
        timeout=10,
    )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )
    data = resp.json()
    if data.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token audience mismatch",
        )
    return data


def _verify_apple_token(id_token: str) -> dict:
    try:
        header = jwt.get_unverified_header(id_token)
    except JOSEError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Apple token")

    keys = _fetch_apple_public_keys()
    matching_key = next((k for k in keys if k.get("kid") == header.get("kid")), None)
    if not matching_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify Apple token",
        )

    rsa_key = jwk.construct(matching_key, algorithm=Algorithms.RS256)
    try:
        payload = jwt.decode(
            id_token, rsa_key,
            audience=settings.APPLE_CLIENT_ID,
            algorithms=["RS256"],
        )
    except JOSEError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple ID token signature",
        )

    if payload.get("iss") != "https://appleid.apple.com":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple token issuer",
        )
    return payload


def _create_oauth_user(db: Session, email: str, name: str, provider: str, oauth_id: str, role: str) -> User:
    import secrets as sec
    temp_password = sec.token_urlsafe(32)
    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(temp_password),
        role=role,
        is_verified=True,
        oauth_provider=provider,
        oauth_id=oauth_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _build_oauth_response(db: Session, user: User, ip_address: str | None, user_agent: str | None) -> dict:
    token_str, token_hash = generate_refresh_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(rt)
    db.commit()

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    AuditService.log("oauth_login", user_id=user.id, details={"provider": user.oauth_provider}, ip_address=ip_address, user_agent=user_agent)

    from app.services.auth_service import AuthService
    return {
        "token": access_token,
        "refresh_token": token_str,
        "user": AuthService._build_user_dict(user),
    }


def oauth_login(
    db: Session,
    provider: str,
    id_token: str,
    role: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    if provider == "google":
        payload = _verify_google_token(id_token)
        email = payload.get("email", "")
        name = payload.get("name", email.split("@")[0]) if email else "User"
        oauth_id = payload.get("sub", "")
    else:
        payload = _verify_apple_token(id_token)
        email = payload.get("email", "")
        name = payload.get("name", email.split("@")[0]) if email else "User"
        oauth_id = payload.get("sub", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by OAuth provider",
        )

    user = db.query(User).filter(User.email == email).first()

    if user:
        if user.oauth_provider and user.oauth_provider != provider:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This email is already linked to {user.oauth_provider}. Use that provider to sign in.",
            )
        user.oauth_provider = provider
        user.oauth_id = oauth_id
        db.commit()
    else:
        user = _create_oauth_user(db, email, name, provider, oauth_id, role)

    return _build_oauth_response(db, user, ip_address, user_agent)
