import json
import re

from fastapi import HTTPException, status
from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
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

    @staticmethod
    def create_bulk(db: Session, questions_data: list[QuestionCreate], teacher: User) -> list[Question]:
        created = []
        for data in questions_data:
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
            created.append(question)
        db.commit()
        for q in created:
            db.refresh(q)
        return created

    @staticmethod
    def _get_ai_client():
        if settings.GROQ_API_KEY:
            return OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.GROQ_API_KEY,
            )
        if settings.OPENAI_API_KEY:
            return OpenAI(api_key=settings.OPENAI_API_KEY)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="AI generation is not configured. Set GROQ_API_KEY or OPENAI_API_KEY in the server environment.",
        )

    @staticmethod
    def _get_ai_model():
        return settings.GROQ_MODEL if settings.GROQ_API_KEY else settings.OPENAI_MODEL

    @staticmethod
    def generate_with_ai(data) -> list[dict]:
        client = QuestionService._get_ai_client()
        model = QuestionService._get_ai_model()

        types_str = ", ".join(data.question_types)
        prompt = f"""Generate {data.count} {data.difficulty}-difficulty questions about {data.topic} in {data.subject}.
Question types to include: {types_str}.

Return ONLY a JSON object with a "questions" key containing an array of objects with these fields:
- subject: "{data.subject}"
- topic: "{data.topic}"
- difficulty: "{data.difficulty}"
- question_type: one of {types_str}
- question_text: the question
- options: array of strings (only for mcq, at least 2, null otherwise)
- correct_answer: the correct answer
- marks: 1
- explanation: brief explanation of the answer

Valid JSON only, no markdown, no code fences."""

        kwargs = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a teacher creating exam questions. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
        }

        use_openai = bool(settings.OPENAI_API_KEY) and not settings.GROQ_API_KEY
        if use_openai:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = client.chat.completions.create(**kwargs)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI generation failed: {str(e)}",
            )

        raw = response.choices[0].message.content
        try:
            parsed = json.loads(raw)
            questions = parsed if isinstance(parsed, list) else parsed.get("questions", [])
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI returned invalid JSON",
            )

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI returned no questions",
            )

        for q in questions:
            q.setdefault("marks", 1)
            q.setdefault("explanation", None)
            q.setdefault("options", None)

        return questions[:data.count]
