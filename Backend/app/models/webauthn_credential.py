from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    credential_id: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    public_key: Mapped[str] = mapped_column(Text, nullable=False)
    credential_type: Mapped[str] = mapped_column(String(64), default="public-key")
    transports: Mapped[str | None] = mapped_column(Text, nullable=True)
    aaguid: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    counter: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
