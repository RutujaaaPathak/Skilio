import json

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.exam_service import ExamService

WEAK_THRESHOLD = 40.0
STRONG_THRESHOLD = 75.0

TOPIC_RESOURCE_MAP: dict[str, dict[str, list[str]]] = {
    "weak": {
        "default": [
            "Review textbook fundamentals",
            "Watch introductory video tutorials",
            "Solve step-by-step practice problems",
            "Take topic-specific quizzes",
        ],
    },
    "average": {
        "default": [
            "Practice application-level problems",
            "Attempt previous year questions",
            "Focus on common mistake patterns",
            "Join peer study groups",
        ],
    },
    "strong": {
        "default": [
            "Attempt advanced problem sets",
            "Explore real-world applications",
            "Teach concepts to peers",
            "Take mock tests under timed conditions",
        ],
    },
}

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

TIME_MGMT_TIPS: list[dict] = [
    {"tip": "Spend no more than 2 minutes per question. If stuck, skip and return later.", "category": "pace", "priority": "high"},
    {"tip": "Allocate the first 5 minutes to scan all questions and prioritize easy ones.", "category": "strategy", "priority": "high"},
    {"tip": "Leave at least 5 minutes at the end to review flagged answers.", "category": "review", "priority": "medium"},
    {"tip": "Practice with a timer to simulate real exam pressure.", "category": "practice", "priority": "medium"},
    {"tip": "Divide total time by number of questions to set a per-question budget.", "category": "pace", "priority": "low"},
]


def _get_focus(status: str) -> list[str]:
    return FOCUS_MAP.get(status, {}).get("default", [])


def _get_topic_resources(topic: str, status: str) -> list[str]:
    return TOPIC_RESOURCE_MAP.get(status, {}).get("default", [])


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


def _compute_trajectory(results: list[dict]) -> dict:
    subject_scores: dict[str, list[float]] = {}
    all_scores: list[float] = []

    for r in results:
        score = r.get("score_percentage")
        if score is None:
            continue
        all_scores.append(score)
        subject = r.get("exam_subject") or "Unknown"
        subject_scores.setdefault(subject, []).append(score)

    if not all_scores or len(all_scores) < 2:
        return {"trend": "stable", "improvement_rate": None, "projected_score": None, "consistency_score": None}

    first = all_scores[0]
    last = all_scores[-1]
    n = len(all_scores)
    improvement_rate = round((last - first) / n, 2) if n > 1 else None

    trend = "up" if improvement_rate and improvement_rate > 1 else ("down" if improvement_rate and improvement_rate < -1 else "stable")

    projected = None
    if improvement_rate and improvement_rate > 0:
        projected = round(min(last + improvement_rate * 3, 100), 1)

    consistency_score = None
    if n >= 3:
        try:
            from statistics import stdev
            sd = stdev(all_scores)
            consistency_score = round(max(0, 100 - sd * 2), 1)
        except Exception:
            pass

    return {
        "trend": trend,
        "improvement_rate": improvement_rate,
        "projected_score": projected,
        "consistency_score": consistency_score,
    }


class RecommendationService:
    @staticmethod
    def get_practice_recommendations(db: Session, user: User) -> dict:
        results = ExamService.get_my_results(db, user)

        if not results:
            return {
                "recommendations": [],
                "weak_subjects": [],
                "strong_subjects": [],
                "topic_recommendations": [],
                "performance_trajectory": None,
                "time_management_tips": [],
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
                "topic_recommendations": [],
                "performance_trajectory": None,
                "time_management_tips": [],
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

        # Topic-level recommendations
        topic_mastery = ExamService.get_topic_mastery(db, user)
        topic_recommendations = []
        if topic_mastery and topic_mastery.get("has_data"):
            for t in topic_mastery.get("topics", []):
                status = t.get("status", "unknown")
                topic_recommendations.append({
                    "topic": t["topic"],
                    "subject": t.get("subject", ""),
                    "average_score": t.get("average_score"),
                    "status": status,
                    "suggested_focus": _get_focus(status),
                    "resource_suggestions": _get_topic_resources(t["topic"], status),
                })

        # Performance trajectory
        trajectory = _compute_trajectory(results)

        # Time management
        time_management_tips = [dict(tip) for tip in TIME_MGMT_TIPS]
        # Tailor tips based on actual performance
        if weak_subjects:
            time_management_tips.insert(0, {
                "tip": f"Prioritize {', '.join(weak_subjects[:2])} in your study schedule. Allocate extra time to these subjects.",
                "category": "planning",
                "priority": "high",
            })

        return {
            "recommendations": recommendations,
            "weak_subjects": weak_subjects,
            "strong_subjects": strong_subjects,
            "topic_recommendations": topic_recommendations,
            "performance_trajectory": trajectory,
            "time_management_tips": time_management_tips,
            "has_data": True,
        }
