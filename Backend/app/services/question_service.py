import json

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.question import Question
from app.models.user import User
from app.schemas.question import QuestionCreate, QuestionUpdate


class QuestionService:
    @staticmethod
    def create(db: Session, data: QuestionCreate, teacher: User) -> Question:
        options_json = json.dumps(data.options) if data.options else None

        question = Question(
            teacher_id=teacher.id,
            subject=data.subject,
            topic=data.topic,
            difficulty=data.difficulty,
            question_type=data.question_type,
            question_text=data.question_text,
            options=options_json,
            correct_answer=data.correct_answer,
            marks=data.marks,
            explanation=data.explanation,
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        return question

    @staticmethod
    def get_all(
        db: Session,
        user: User,
        subject: str | None = None,
        topic: str | None = None,
        difficulty: str | None = None,
        question_type: str | None = None,
    ) -> list[Question]:
        q = db.query(Question)

        if user.role == "student":
            q = q.filter(Question.teacher_id == 0)
        elif user.role == "teacher":
            q = q.filter(Question.teacher_id == user.id)

        if subject:
            q = q.filter(Question.subject.ilike(f"%{subject}%"))
        if topic:
            q = q.filter(Question.topic.ilike(f"%{topic}%"))
        if difficulty:
            q = q.filter(Question.difficulty == difficulty)
        if question_type:
            q = q.filter(Question.question_type == question_type)

        return q.order_by(Question.created_at.desc()).all()

    @staticmethod
    def get_by_id(db: Session, question_id: int, user: User) -> Question:
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Question not found"
            )

        if user.role != "admin" and question.teacher_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this question",
            )
        return question

    @staticmethod
    def update(db: Session, question_id: int, data: QuestionUpdate, user: User) -> Question:
        question = QuestionService.get_by_id(db, question_id, user)

        if user.role != "admin" and question.teacher_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own questions",
            )

        update_data = data.model_dump(exclude_unset=True)
        if "options" in update_data:
            update_data["options"] = json.dumps(update_data["options"]) if update_data["options"] else None

        for field, value in update_data.items():
            setattr(question, field, value)

        db.commit()
        db.refresh(question)
        return question

    @staticmethod
    def delete(db: Session, question_id: int, user: User) -> None:
        question = QuestionService.get_by_id(db, question_id, user)

        if user.role != "admin" and question.teacher_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own questions",
            )

        db.delete(question)
        db.commit()
