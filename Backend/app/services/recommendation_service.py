import json

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.exam_service import ExamService

WEAK_THRESHOLD = 40.0
STRONG_THRESHOLD = 75.0

FOCUS_MAP: dict[str, dict[str, list[str]]] = {
    "weak": {
        "default": ["Review core concepts", "Practice basic problems", "Take remedial quizzes"],
    },
    "average": {
        "default": ["Focus on weak topics", "Attempt timed practice tests", "Review incorrect answers"],
    },
    "strong": {
        "default": ["Maintain consistency", "Attempt advanced problems", "Help peers with revision"],
    },
}

AI_SYSTEM_PROMPT = (
    "You are an AI academic advisor. Given a student's subject performance data, "
    "provide ONE concise, actionable study tip (max 15 words) for each subject. "
    "Respond ONLY with a JSON object mapping subject names to tip strings."
)


def _get_focus(status: str) -> list[str]:
    return FOCUS_MAP.get(status, {}).get("default", [])


def _get_ai_tips(subject_scores: dict[str, float]) -> dict[str, str]:
    if not settings.OPENAI_API_KEY:
        return {}
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": AI_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            subj: {"average_score": score}
                            for subj, score in subject_scores.items()
                        }
                    ),
                },
            ],
            max_tokens=300,
        )
        content = response.choices[0].message.content
        return json.loads(content) if content else {}
    except Exception:
        return {}


class RecommendationService:
    @staticmethod
    def get_practice_recommendations(db: Session, user: User) -> dict:
        results = ExamService.get_my_results(db, user)

        if not results:
            return {
                "recommendations": [],
                "weak_subjects": [],
                "strong_subjects": [],
                "has_data": False,
            }

        subject_scores: dict[str, list[float]] = {}
        for r in results:
            subject = r.get("exam_subject") or "Unknown"
            score = r.get("score_percentage")
            if score is None:
                continue
            subject_scores.setdefault(subject, []).append(score)

        if not subject_scores:
            return {
                "recommendations": [],
                "weak_subjects": [],
                "strong_subjects": [],
                "has_data": False,
            }

        averages = {subj: sum(scores) / len(scores) for subj, scores in subject_scores.items()}

        ai_tips = _get_ai_tips(averages)

        recommendations = []
        weak_subjects: list[str] = []
        strong_subjects: list[str] = []

        for subject, avg in averages.items():
            if avg < WEAK_THRESHOLD:
                status = "weak"
                weak_subjects.append(subject)
            elif avg < STRONG_THRESHOLD:
                status = "average"
            else:
                status = "strong"
                strong_subjects.append(subject)

            recommendations.append({
                "subject": subject,
                "average_score": round(avg, 1),
                "status": status,
                "total_exams": len(subject_scores[subject]),
                "suggested_focus": _get_focus(status),
                "ai_tip": ai_tips.get(subject),
            })

        return {
            "recommendations": recommendations,
            "weak_subjects": weak_subjects,
            "strong_subjects": strong_subjects,
            "has_data": True,
        }
