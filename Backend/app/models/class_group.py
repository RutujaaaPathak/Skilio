from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ClassGroup(Base):
    __tablename__ = "class_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(6), unique=True, nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    teacher_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    semester: Mapped[str | None] = mapped_column(String(50), nullable=True)
    academic_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=lambda: datetime.now(timezone.utc))

    teacher = relationship("User", foreign_keys=[teacher_id], lazy="joined")
    members = relationship("ClassMember", back_populates="class_group", cascade="all, delete-orphan")
    exam_links = relationship("ExamClass", back_populates="class_group", cascade="all, delete-orphan")


class ClassMember(Base):
    __tablename__ = "class_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("class_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    class_group = relationship("ClassGroup", back_populates="members")
    student = relationship("User", foreign_keys=[student_id], lazy="joined")


class ExamClass(Base):
    __tablename__ = "exam_classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    exam_id: Mapped[int] = mapped_column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("class_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    assign_to_future_members: Mapped[bool] = mapped_column(Boolean, default=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    exam = relationship("Exam", lazy="joined")
    class_group = relationship("ClassGroup", back_populates="exam_links")
