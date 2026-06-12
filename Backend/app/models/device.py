from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Device(Base):
    """
    Registered student device for exam binding.

    Browser fingerprinting (via fingerprintjs or similar) is used here as an
    additional security layer.  It is NOT cryptographically guaranteed and can
    be spoofed by a determined attacker.  Combine with server-side anomaly
    detection, IP monitoring, and short token expiry for defence in depth.
    """

    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    device_fingerprint: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(255), nullable=True)
    os: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    is_trusted: Mapped[bool] = mapped_column(Boolean, default=False)
    first_used_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_used_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
