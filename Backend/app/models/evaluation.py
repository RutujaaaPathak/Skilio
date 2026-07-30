from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class AnswerEvaluation(Base):
    __tablename__ = "answer_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)

    marks_awarded = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)

    flag = Column(String(50), default="none")
    flag_note = Column(Text, nullable=True)
    flag_resolved = Column(Boolean, default=False)

    ai_suggested_marks = Column(Float, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_reason = Column(Text, nullable=True)
    ai_suggestion_applied = Column(Boolean, default=False)

    evaluated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    evaluated_at = Column(DateTime, nullable=True)
    is_auto_graded = Column(Boolean, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    exam = relationship("Exam", back_populates="evaluations")
    student = relationship("User", foreign_keys=[student_id], lazy="joined")
    question = relationship("Question", lazy="joined")
    evaluator = relationship("User", foreign_keys=[evaluated_by], lazy="joined")

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "question_id", name="uq_exam_student_question"),
    )


class ExamEvaluationStatus(Base):
    __tablename__ = "exam_evaluation_status"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    results_published = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)
    published_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    exam = relationship("Exam", back_populates="evaluation_status")
    publisher = relationship("User", foreign_keys=[published_by], lazy="joined")
