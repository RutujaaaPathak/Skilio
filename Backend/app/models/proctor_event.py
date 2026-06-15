from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Float, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProctorEvent(Base):
    __tablename__ = "proctor_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    exam_session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exam_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)  # low, medium, high, critical
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Map Python attribute metadata_ to DB column metadata to avoid Base.metadata conflict
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    
    # Maintain compatibility fields
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    screenshot_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    session = relationship("ExamSession", back_populates="proctor_events")
    exam = relationship("Exam")
    student = relationship("User")

