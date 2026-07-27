import secrets as sec

from datetime import datetime, timedelta, timezone

import pyotp

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    compute_token_hash,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    verify_password,
)
from app.models.audit_log import AuditLog
from app.models.email_verification_token import EmailVerificationToken
from app.models.login_attempt import LoginAttempt
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.totp_secret import TOTPSecret
from app.models.department import Department
from app.models.emergency_contact import EmergencyContact
from app.models.institution import Institution
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, UserUpdate, ProfileCompletionResponse
from app.schemas.emergency_contact import EmergencyContactCreate, EmergencyContactUpdate
from app.services.audit_service import AuditService
from app.services.email_service import EmailService


class AuthService:
    @staticmethod
    def _build_user_dict(user: User) -> dict:
        institution_name = user.institution.name if user.institution else None
        department_name = user.department.name if user.department else None
        return {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "college": institution_name or user.college,
            "branch": department_name or user.branch,
            "division": user.division,
            "year": user.year,
            "phone": user.phone,
            "batch": user.batch,
            "institution_id": user.institution_id,
            "department_id": user.department_id,
            "roll_number": user.roll_number,
            "profile_photo_url": user.profile_photo_url,
            "department": user.department,
            "subjects": user.subjects,
            "designation": user.designation,
            "institution_address": user.institution_address,
            "qualifications": user.qualifications,
            "experience": user.experience,
            "bio": user.bio,
            "specialization": user.specialization,
            "languages": user.languages,
            "alternate_contact": user.alternate_contact,
            "notification_preferences": user.notification_preferences,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at.isoformat()
            if isinstance(user.created_at, datetime)
            else user.created_at,
            "updated_at": user.updated_at.isoformat()
            if isinstance(user.updated_at, datetime)
            else user.updated_at,
            "last_login": user.last_login.isoformat()
            if isinstance(user.last_login, datetime)
            else user.last_login,
            "oauth_provider": user.oauth_provider,
            "oauth_id": user.oauth_id,
        }

    @staticmethod
    def _check_lockout(db: Session, identifier: str) -> None:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
        recent_failures = (
            db.query(LoginAttempt)
            .filter(
                LoginAttempt.identifier == identifier,
                LoginAttempt.success == False,
                LoginAttempt.created_at > cutoff,
            )
            .count()
        )
        if recent_failures >= settings.MAX_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked. Try again in {settings.LOGIN_LOCKOUT_MINUTES} minutes.",
            )

    @staticmethod
    def _record_attempt(db: Session, identifier: str, success: bool, ip_address: str | None = None) -> None:
        attempt = LoginAttempt(
            identifier=identifier,
            ip_address=ip_address,
            success=success,
        )
        db.add(attempt)
        db.commit()

    @staticmethod
    def _create_refresh_token(
        db: Session,
        user_id: int,
        device_info: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        remember_me: bool = False,
    ) -> str:
        active = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
            .count()
        )
        if active >= settings.MAX_ACTIVE_SESSIONS:
            oldest = (
                db.query(RefreshToken)
                .filter(
                    RefreshToken.user_id == user_id,
                    RefreshToken.is_revoked == False,
                    RefreshToken.expires_at > datetime.now(timezone.utc),
                )
                .order_by(RefreshToken.created_at.asc())
                .first()
            )
            if oldest:
                oldest.is_revoked = True

        token_str, token_hash = generate_refresh_token()
        expiry_days = settings.REMEMBER_ME_TOKEN_EXPIRE_DAYS if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
        rt = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=expiry_days),
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(rt)
        db.commit()
        return token_str

    @staticmethod
    def register(
        db: Session,
        data: UserCreate,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        if data.username:
            existing_username = db.query(User).filter(User.username == data.username).first()
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This username is already taken",
                )

        user = User(
            name=data.name,
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
            role=data.role,
            college=data.college,
            branch=data.branch,
            division=data.division,
            year=data.year,
            phone=data.phone,
            batch=data.batch,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = AuthService._create_refresh_token(
            db, user.id, device_info=data.branch, ip_address=ip_address, user_agent=user_agent
        )

        otp = f"{sec.randbelow(900000) + 100000}"
        otp_hash = compute_token_hash(otp)
        evt = EmailVerificationToken(
            user_id=user.id,
            token_hash=otp_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.add(evt)
        db.commit()
        EmailService.send_verification(user.email, otp)

        AuditService.log("signup", user_id=user.id, details={"role": user.role}, ip_address=ip_address, user_agent=user_agent)

        return {
            "token": token,
            "refresh_token": refresh_token,
            "user": AuthService._build_user_dict(user),
        }

    @staticmethod
    def login(
        db: Session,
        data: UserLogin,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict:
        user = (
            db.query(User)
            .filter(
                (User.email == data.identifier) | (User.username == data.identifier)
            )
            .first()
        )

        AuthService._check_lockout(db, data.identifier)

        if not user or not verify_password(data.password, user.hashed_password):
            AuthService._record_attempt(db, data.identifier, success=False, ip_address=ip_address)
            AuditService.log("login_failed", details={"identifier": data.identifier}, ip_address=ip_address, user_agent=user_agent)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if data.role != user.role:
            AuthService._record_attempt(db, data.identifier, success=False, ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"This account is registered as a {user.role}, not a {data.role}",
            )

        if not user.is_active:
            AuthService._record_attempt(db, data.identifier, success=False, ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        if not user.is_verified:
            AuthService._record_attempt(db, data.identifier, success=False, ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before logging in. Check your inbox for the verification OTP.",
            )

        totp = db.query(TOTPSecret).filter(
            TOTPSecret.user_id == user.id,
            TOTPSecret.is_enabled == True,
        ).first()

        if totp:
            temp_token = create_access_token(
                {"sub": str(user.id), "role": user.role, "purpose": "2fa"},
                expires_delta=timedelta(minutes=5),
            )
            return {"requires_2fa": True, "temp_token": temp_token}

        AuthService._record_attempt(db, data.identifier, success=True, ip_address=ip_address)

        user.last_login = datetime.now(timezone.utc)
        token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = AuthService._create_refresh_token(
            db, user.id, ip_address=ip_address, user_agent=user_agent, remember_me=data.remember_me
        )

        AuditService.log("login", user_id=user.id, ip_address=ip_address, user_agent=user_agent)

        return {
            "token": token,
            "refresh_token": refresh_token,
            "user": AuthService._build_user_dict(user),
        }

    @staticmethod
    def refresh(
        db: Session,
        refresh_token_str: str | None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict:
        if not refresh_token_str:
            return {"token": None}

        token_hash = compute_token_hash(refresh_token_str)
        stored = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )

        if not stored:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        stored.is_revoked = True

        user = db.query(User).filter(User.id == stored.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or deactivated",
            )

        new_token = create_access_token({"sub": str(user.id), "role": user.role})
        new_refresh = AuthService._create_refresh_token(
            db, user.id, ip_address=ip_address, user_agent=user_agent
        )

        AuditService.log("token_refresh", user_id=user.id, ip_address=ip_address, user_agent=user_agent)

        return {"token": new_token, "refresh_token": new_refresh}

    @staticmethod
    def logout(db: Session, refresh_token_str: str | None) -> dict:
        if refresh_token_str:
            token_hash = compute_token_hash(refresh_token_str)
            stored = (
                db.query(RefreshToken)
                .filter(
                    RefreshToken.token_hash == token_hash,
                    RefreshToken.is_revoked == False,
                )
                .first()
            )
            if stored:
                stored.is_revoked = True
                db.commit()
                AuditService.log("logout", user_id=stored.user_id)

        return {"message": "Logged out successfully"}

    @staticmethod
    def forgot_password(db: Session, email: str) -> dict:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return {"message": "If an account with that email exists, a password reset link has been sent."}

        token_str, token_hash = generate_refresh_token()
        prt = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(prt)
        db.commit()

        EmailService.send_password_reset(user.email, token_str)
        AuditService.log("forgot_password", user_id=user.id)

        return {"message": "If an account with that email exists, a password reset link has been sent."}

    @staticmethod
    def reset_password(db: Session, token_str: str, new_password: str) -> dict:
        token_hash = compute_token_hash(token_str)
        stored = (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.is_used == False,
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )

        if not stored:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

        stored.is_used = True

        user = db.query(User).filter(User.id == stored.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found",
            )

        user.hashed_password = hash_password(new_password)

        db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.is_revoked == False,
        ).update({RefreshToken.is_revoked: True})

        db.commit()
        AuditService.log("password_reset", user_id=user.id)

        return {"message": "Password reset successfully. Please log in with your new password."}

    @staticmethod
    def verify_email(db: Session, otp: str) -> dict:
        otp_hash = compute_token_hash(otp)
        stored = (
            db.query(EmailVerificationToken)
            .filter(
                EmailVerificationToken.token_hash == otp_hash,
                EmailVerificationToken.is_used == False,
                EmailVerificationToken.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )

        if not stored:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP",
            )

        stored.is_used = True

        user = db.query(User).filter(User.id == stored.user_id).first()
        if user:
            user.is_verified = True

        db.commit()
        AuditService.log("email_verified", user_id=user.id)

        return {"message": "Email verified successfully."}

    @staticmethod
    def resend_verification(db: Session, email: str) -> dict:
        user = db.query(User).filter(User.email == email).first()
        if not user or user.is_verified:
            return {"message": "If the account exists and is not yet verified, a new OTP has been sent."}

        db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.is_used == False,
        ).update({EmailVerificationToken.is_used: True})

        otp = f"{sec.randbelow(900000) + 100000}"
        otp_hash = compute_token_hash(otp)
        evt = EmailVerificationToken(
            user_id=user.id,
            token_hash=otp_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.add(evt)
        db.commit()

        EmailService.send_verification(user.email, otp)

        return {"message": "If the account exists and is not yet verified, a new OTP has been sent."}

    @staticmethod
    def get_login_history(db: Session, user: User, limit: int = 10) -> list[dict]:
        attempts = (
            db.query(LoginAttempt)
            .filter(LoginAttempt.identifier == user.email)
            .order_by(LoginAttempt.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": a.id,
                "success": a.success,
                "ip_address": a.ip_address,
                "created_at": a.created_at.isoformat() if isinstance(a.created_at, datetime) else str(a.created_at),
            }
            for a in attempts
        ]

    @staticmethod
    def get_sessions(db: Session, user: User, current_token_hash: str | None = None) -> list[dict]:
        sessions = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.user_id == user.id,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
            .order_by(RefreshToken.created_at.desc())
            .all()
        )

        return [
            {
                "id": s.id,
                "created_at": s.created_at.isoformat() if isinstance(s.created_at, datetime) else str(s.created_at),
                "expires_at": s.expires_at.isoformat() if isinstance(s.expires_at, datetime) else str(s.expires_at),
                "device_info": s.device_info,
                "ip_address": s.ip_address,
                "user_agent": s.user_agent,
                "is_current": current_token_hash is not None and s.token_hash == current_token_hash,
            }
            for s in sessions
        ]

    @staticmethod
    def revoke_session(db: Session, user: User, session_id: int, current_token_hash: str | None = None) -> dict:
        session = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.id == session_id,
                RefreshToken.user_id == user.id,
                RefreshToken.is_revoked == False,
            )
            .first()
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        if current_token_hash and session.token_hash == current_token_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot revoke current session. Use logout instead.",
            )

        session.is_revoked = True
        db.commit()
        AuditService.log("session_revoked", user_id=user.id)

        return {"message": "Session revoked successfully."}

    @staticmethod
    def revoke_all_sessions(db: Session, user: User, current_token_hash: str | None = None) -> dict:
        query = db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.is_revoked == False,
        )
        if current_token_hash:
            query = query.filter(RefreshToken.token_hash != current_token_hash)

        query.update({RefreshToken.is_revoked: True})
        db.commit()
        AuditService.log("all_sessions_revoked", user_id=user.id)

        return {"message": "All other sessions revoked successfully."}

    @staticmethod
    def verify_2fa(db: Session, temp_token: str, totp_code: str, ip_address: str | None = None, user_agent: str | None = None) -> dict:
        payload = decode_access_token(temp_token)
        if not payload or payload.get("purpose") != "2fa":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired 2FA token")

        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or deactivated")

        totp = db.query(TOTPSecret).filter(TOTPSecret.user_id == user.id, TOTPSecret.is_enabled == True).first()
        if not totp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")

        if not pyotp.TOTP(totp.secret).verify(totp_code):
            AuditService.log("2fa_failed", user_id=user.id, ip_address=ip_address, user_agent=user_agent)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

        user.last_login = datetime.now(timezone.utc)
        token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = AuthService._create_refresh_token(db, user.id, ip_address=ip_address, user_agent=user_agent)

        AuditService.log("login", user_id=user.id, details={"method": "2fa"}, ip_address=ip_address, user_agent=user_agent)

        return {"token": token, "refresh_token": refresh_token, "user": AuthService._build_user_dict(user)}

    @staticmethod
    def setup_2fa(db: Session, user: User) -> dict:
        secret = pyotp.random_base32()
        provisioning_uri = pyotp.TOTP(secret).provisioning_uri(user.email, issuer_name="Skillo")

        backup_codes = [sec.token_hex(4) for _ in range(8)]
        import hashlib
        hashed_backup = [hashlib.sha256(c.encode()).hexdigest() for c in backup_codes]

        existing = db.query(TOTPSecret).filter(TOTPSecret.user_id == user.id).first()
        if existing:
            existing.secret = secret
            existing.is_enabled = False
            existing.backup_codes = str(hashed_backup)
        else:
            totp = TOTPSecret(user_id=user.id, secret=secret, backup_codes=str(hashed_backup))
            db.add(totp)
        db.commit()

        return {"secret": secret, "provisioning_uri": provisioning_uri, "backup_codes": backup_codes}

    @staticmethod
    def enable_2fa(db: Session, user: User, totp_code: str) -> dict:
        totp = db.query(TOTPSecret).filter(TOTPSecret.user_id == user.id).first()
        if not totp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Set up 2FA first")

        if not pyotp.TOTP(totp.secret).verify(totp_code):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code. Please try again.")

        totp.is_enabled = True
        db.commit()
        AuditService.log("2fa_enabled", user_id=user.id)

        return {"message": "2FA enabled successfully."}

    @staticmethod
    def disable_2fa(db: Session, user: User, password: str) -> dict:
        if not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

        totp = db.query(TOTPSecret).filter(TOTPSecret.user_id == user.id).first()
        if totp:
            totp.is_enabled = False
            db.commit()
        AuditService.log("2fa_disabled", user_id=user.id)

        return {"message": "2FA disabled successfully."}

    @staticmethod
    def get_2fa_status(db: Session, user: User) -> dict:
        totp = db.query(TOTPSecret).filter(TOTPSecret.user_id == user.id).first()
        return {"is_enabled": bool(totp and totp.is_enabled)}

    STUDENT_REQUIRED_FIELDS: dict[str, str] = {
        "name": "Full Name",
        "phone": "Phone Number",
        "username": "Student ID",
        "college": "College / Institution",
        "branch": "Branch / Department",
        "division": "Division",
        "year": "Year / Semester",
        "roll_number": "Roll Number",
        "profile_photo_url": "Profile Photo",
        "emergency_contact": "Emergency Contact",
    }

    @staticmethod
    def get_emergency_contacts(db: Session, user: User) -> list[dict]:
        contacts = (
            db.query(EmergencyContact)
            .filter(EmergencyContact.user_id == user.id)
            .order_by(EmergencyContact.is_primary.desc(), EmergencyContact.created_at.desc())
            .all()
        )
        return [
            {
                "id": c.id,
                "user_id": c.user_id,
                "name": c.name,
                "relationship": c.relationship,
                "phone": c.phone,
                "alternate_phone": c.alternate_phone,
                "email": c.email,
                "address": c.address,
                "is_primary": c.is_primary,
                "note": c.note,
                "created_at": c.created_at.isoformat() if isinstance(c.created_at, datetime) else c.created_at,
                "updated_at": c.updated_at.isoformat() if isinstance(c.updated_at, datetime) else c.updated_at,
            }
            for c in contacts
        ]

    @staticmethod
    def _ensure_single_primary(db: Session, user_id: int, exclude_id: int | None = None) -> None:
        query = db.query(EmergencyContact).filter(
            EmergencyContact.user_id == user_id,
            EmergencyContact.is_primary == True,
        )
        if exclude_id is not None:
            query = query.filter(EmergencyContact.id != exclude_id)
        for c in query.all():
            c.is_primary = False

    @staticmethod
    def create_emergency_contact(db: Session, user: User, data: EmergencyContactCreate) -> dict:
        if data.is_primary:
            AuthService._ensure_single_primary(db, user.id)
        contact = EmergencyContact(
            user_id=user.id,
            name=data.name,
            relationship=data.relationship,
            phone=data.phone,
            alternate_phone=data.alternate_phone,
            email=data.email,
            address=data.address,
            is_primary=data.is_primary,
            note=data.note,
        )
        db.add(contact)
        db.commit()
        db.refresh(contact)
        return {
            "id": contact.id,
            "user_id": contact.user_id,
            "name": contact.name,
            "relationship": contact.relationship,
            "phone": contact.phone,
            "alternate_phone": contact.alternate_phone,
            "email": contact.email,
            "address": contact.address,
            "is_primary": contact.is_primary,
            "note": contact.note,
            "created_at": contact.created_at.isoformat() if isinstance(contact.created_at, datetime) else contact.created_at,
            "updated_at": contact.updated_at.isoformat() if isinstance(contact.updated_at, datetime) else contact.updated_at,
        }

    @staticmethod
    def update_emergency_contact(db: Session, user: User, contact_id: int, data: EmergencyContactUpdate) -> dict:
        contact = (
            db.query(EmergencyContact)
            .filter(EmergencyContact.id == contact_id, EmergencyContact.user_id == user.id)
            .first()
        )
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency contact not found",
            )

        update_data = data.model_dump(exclude_unset=True)
        if update_data.get("is_primary"):
            AuthService._ensure_single_primary(db, user.id, exclude_id=contact_id)

        for field, value in update_data.items():
            setattr(contact, field, value)

        contact.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(contact)
        return {
            "id": contact.id,
            "user_id": contact.user_id,
            "name": contact.name,
            "relationship": contact.relationship,
            "phone": contact.phone,
            "alternate_phone": contact.alternate_phone,
            "email": contact.email,
            "address": contact.address,
            "is_primary": contact.is_primary,
            "note": contact.note,
            "created_at": contact.created_at.isoformat() if isinstance(contact.created_at, datetime) else contact.created_at,
            "updated_at": contact.updated_at.isoformat() if isinstance(contact.updated_at, datetime) else contact.updated_at,
        }

    @staticmethod
    def delete_emergency_contact(db: Session, user: User, contact_id: int) -> dict:
        contact = (
            db.query(EmergencyContact)
            .filter(EmergencyContact.id == contact_id, EmergencyContact.user_id == user.id)
            .first()
        )
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency contact not found",
            )
        db.delete(contact)
        db.commit()
        return {"message": "Emergency contact deleted successfully."}

    @staticmethod
    def get_profile_completion(user: User) -> ProfileCompletionResponse:
        completed: list[str] = []
        missing: list[str] = []
        for field, label in AuthService.STUDENT_REQUIRED_FIELDS.items():
            if field == "emergency_contact":
                has_contact = len(getattr(user, "emergency_contacts", []) or []) > 0
                if has_contact:
                    completed.append(label)
                else:
                    missing.append(label)
            elif field == "college":
                if user.college or user.institution_id:
                    completed.append(label)
                else:
                    missing.append(label)
            elif field == "branch":
                if user.branch or user.department_id:
                    completed.append(label)
                else:
                    missing.append(label)
            else:
                value = getattr(user, field, None)
                if value:
                    completed.append(label)
                else:
                    missing.append(label)
        total = len(AuthService.STUDENT_REQUIRED_FIELDS)
        pct = round((len(completed) / total) * 100) if total else 0
        return ProfileCompletionResponse(
            percentage=pct,
            completed_fields=sorted(completed),
            missing_fields=sorted(missing),
            total_required=total,
            is_complete=pct == 100,
        )

    @staticmethod
    def update_profile(db: Session, user: User, data: UserUpdate) -> dict:
        update_data = data.model_dump(exclude_unset=True)

        if "email" in update_data and update_data["email"] != user.email:
            existing = db.query(User).filter(User.email == update_data["email"]).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this email already exists",
                )

        for field, value in update_data.items():
            setattr(user, field, value)

        if "institution_id" in update_data and update_data["institution_id"] is not None:
            inst = db.query(Institution).filter(Institution.id == update_data["institution_id"]).first()
            if inst:
                user.college = inst.name
        if "department_id" in update_data and update_data["department_id"] is not None:
            dept = db.query(Department).filter(Department.id == update_data["department_id"]).first()
            if dept:
                user.branch = dept.name

        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return {"user": AuthService._build_user_dict(user)}

    @staticmethod
    def delete_account(db: Session, user: User, password: str) -> dict:
        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password",
            )

        db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
        db.query(LoginAttempt).filter(LoginAttempt.identifier == user.email).delete()
        AuditService.log("account_deleted", user_id=user.id)
        db.delete(user)
        db.commit()
        return {"message": "Account deleted successfully."}

    @staticmethod
    def export_data(db: Session, user: User) -> dict:
        return {
            "user": AuthService._build_user_dict(user),
            "sessions": [
                {"created_at": s.created_at.isoformat() if isinstance(s.created_at, datetime) else str(s.created_at), "ip_address": s.ip_address, "device_info": s.device_info}
                for s in db.query(RefreshToken).filter(RefreshToken.user_id == user.id).all()
            ],
            "login_attempts": [
                {"created_at": a.created_at.isoformat() if isinstance(a.created_at, datetime) else str(a.created_at), "success": a.success, "ip_address": a.ip_address}
                for a in db.query(LoginAttempt).filter(LoginAttempt.identifier == user.email).all()
            ],
        }

    @staticmethod
    def admin_list_users(db: Session, role: str | None = None, is_active: bool | None = None, skip: int = 0, limit: int = 100) -> list[dict]:
        query = db.query(User)
        if role:
            query = query.filter(User.role == role)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
        return [AuthService._build_user_dict(u) for u in users]

    @staticmethod
    def admin_update_user(db: Session, user_id: int, is_active: bool | None = None, role: str | None = None) -> dict:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if is_active is not None:
            user.is_active = is_active
            if not is_active:
                db.query(RefreshToken).filter(
                    RefreshToken.user_id == user.id,
                    RefreshToken.is_revoked == False,
                ).update({RefreshToken.is_revoked: True})
        if role is not None:
            user.role = role

        db.commit()
        db.refresh(user)
        AuditService.log("admin_update_user", user_id=user.id, details={"is_active": is_active, "role": role})
        return {"user": AuthService._build_user_dict(user)}