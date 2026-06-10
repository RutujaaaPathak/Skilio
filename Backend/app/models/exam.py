from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    teacher_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_offline_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    tab_switch_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    camera_required: Mapped[bool] = mapped_column(Boolean, default=True)
    voice_verification_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    adaptive_difficulty_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    zero_knowledge_generation_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    teacher = relationship("User", lazy="joined")
    question_links = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan")
    assignments = relationship("ExamAssignment", back_populates="exam", cascade="all, delete-orphan")


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    exam_id: Mapped[int] = mapped_column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    marks: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    exam = relationship("Exam", back_populates="question_links")
    question = relationship("Question", lazy="joined")


ASSIGNMENT_STATUSES = frozenset({"assigned", "started", "submitted", "reviewed"})


class ExamAssignment(Base):
    __tablename__ = "exam_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    exam_id: Mapped[int] = mapped_column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="assigned")
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    exam = relationship("Exam", back_populates="assignments")
    student = relationship("User", foreign_keys=[student_id], lazy="joined")
    assigner = relationship("User", foreign_keys=[assigned_by], lazy="joined")
