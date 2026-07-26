from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.rate_limiter import limiter
from app.core.security import compute_token_hash
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AccountDeleteRequest,
    AdminUserUpdate,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginHistoryItem,
    LogoutResponse,
    OAuthLoginRequest,
    RefreshResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    SessionResponse,
    TOTPDisableRequest,
    TOTPEnableRequest,
    TOTPSetupResponse,
    TOTPStatusResponse,
    TOTPVerifyRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    VerifyEmailRequest,
    VerifyEmailResponse,
)
from app.services.auth_service import AuthService
from app.services.oauth_service import oauth_login

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _get_client_info(request: Request) -> tuple[str | None, str | None]:
    ip = request.client.host if request.client else None
    ua = request.headers.get("User-Agent")
    return ip, ua


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key="refresh_token", path="/api/auth")


@router.post("/signup", response_model=TokenResponse, status_code=201)
@limiter.limit(settings.RATE_LIMIT_SIGNUP)
def signup(
    body: UserCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ip, ua = _get_client_info(request)
    result = AuthService.register(db, body, ip_address=ip, user_agent=ua)
    _set_refresh_cookie(response, result["refresh_token"])
    return result


@router.post("/login")
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(
    body: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ip, ua = _get_client_info(request)
    result = AuthService.login(db, body, ip_address=ip, user_agent=ua)
    _set_refresh_cookie(response, result["refresh_token"])
    return result


@router.post("/oauth")
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def oauth(
    body: OAuthLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ip, ua = _get_client_info(request)
    result = oauth_login(db, body.provider, body.id_token, body.role, ip_address=ip, user_agent=ua)
    _set_refresh_cookie(response, result["refresh_token"])
    return result


@router.post("/refresh", response_model=RefreshResponse)
@limiter.limit(settings.RATE_LIMIT_REFRESH)
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ip, ua = _get_client_info(request)
    refresh_token_str = request.cookies.get("refresh_token")
    result = AuthService.refresh(db, refresh_token_str, ip_address=ip, user_agent=ua)
    _set_refresh_cookie(response, result["refresh_token"])
    return result


@router.post("/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    refresh_token_str = request.cookies.get("refresh_token")
    AuthService.logout(db, refresh_token_str)
    _clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit(settings.RATE_LIMIT_FORGOT_PASSWORD)
def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return AuthService.forgot_password(db, body.email)


@router.post("/reset-password", response_model=ResetPasswordResponse)
@limiter.limit(settings.RATE_LIMIT_RESET_PASSWORD)
def reset_password(
    body: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return AuthService.reset_password(db, body.token, body.password)


@router.post("/verify-email", response_model=VerifyEmailResponse)
@limiter.limit(settings.RATE_LIMIT_VERIFY_EMAIL)
def verify_email(
    body: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return AuthService.verify_email(db, body.otp)


@router.post("/resend-verification", response_model=ForgotPasswordResponse)
@limiter.limit(settings.RATE_LIMIT_RESEND_VERIFICATION)
def resend_verification(
    body: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return AuthService.resend_verification(db, body.email)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me")
@limiter.limit(settings.RATE_LIMIT_UPDATE_PROFILE)
def update_profile(
    body: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.update_profile(db, current_user, body)


@router.delete("/me")
def delete_account(
    body: AccountDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.delete_account(db, current_user, body.password)


@router.get("/me/export")
def export_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.export_data(db, current_user)


@router.get("/login-history", response_model=list[LoginHistoryItem])
def login_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.get_login_history(db, current_user)


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    refresh_token_str = request.cookies.get("refresh_token")
    current_hash = compute_token_hash(refresh_token_str) if refresh_token_str else None
    return AuthService.get_sessions(db, current_user, current_token_hash=current_hash)


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    refresh_token_str = request.cookies.get("refresh_token")
    current_hash = compute_token_hash(refresh_token_str) if refresh_token_str else None
    return AuthService.revoke_session(db, current_user, session_id, current_token_hash=current_hash)


@router.delete("/sessions")
def revoke_all_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    refresh_token_str = request.cookies.get("refresh_token")
    current_hash = compute_token_hash(refresh_token_str) if refresh_token_str else None
    return AuthService.revoke_all_sessions(db, current_user, current_token_hash=current_hash)


@router.post("/totp/setup", response_model=TOTPSetupResponse)
def setup_totp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.setup_2fa(db, current_user)


@router.post("/totp/enable")
def enable_totp(
    body: TOTPEnableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.enable_2fa(db, current_user, body.code)


@router.post("/totp/disable")
def disable_totp(
    body: TOTPDisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.disable_2fa(db, current_user, body.password)


@router.get("/totp/status", response_model=TOTPStatusResponse)
def totp_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.get_2fa_status(db, current_user)


@router.post("/totp/verify")
@limiter.limit(settings.RATE_LIMIT_TOTP_VERIFY)
def verify_totp_login(
    body: TOTPVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ip, ua = _get_client_info(request)
    result = AuthService.verify_2fa(db, body.temp_token, body.code, ip_address=ip, user_agent=ua)
    _set_refresh_cookie(response, result["refresh_token"])
    return result