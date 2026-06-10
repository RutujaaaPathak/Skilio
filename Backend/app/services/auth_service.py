from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from datetime import datetime, timezone

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, UserUpdate


class AuthService:
    @staticmethod
    def register(db: Session, data: UserCreate) -> User:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        user = User(
            name=data.name,
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
        return {
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "college": user.college,
                "branch": user.branch,
                "division": user.division,
                "year": user.year,
                "phone": user.phone,
                "batch": user.batch,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if isinstance(user.created_at, datetime) else user.created_at,
            },
        }

    @staticmethod
    def update_profile(db: Session, user: User, data: UserUpdate) -> User:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        db.commit()
        db.refresh(user)
        return {
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "college": user.college,
                "branch": user.branch,
                "division": user.division,
                "year": user.year,
                "phone": user.phone,
                "batch": user.batch,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if isinstance(user.created_at, datetime) else user.created_at,
            },
        }

    @staticmethod
    def login(db: Session, data: UserLogin) -> dict:
        user = db.query(User).filter(User.email == data.email).first()
        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if data.role != user.role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"This account is registered as a {user.role}, not a {data.role}",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        token = create_access_token({"sub": str(user.id), "role": user.role})
        return {"token": token, "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "college": user.college, "branch": user.branch, "division": user.division, "year": user.year, "phone": user.phone, "batch": user.batch, "is_active": user.is_active, "created_at": user.created_at.isoformat()}}
