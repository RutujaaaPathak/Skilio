import json

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.exam_service import ExamService

WEAK = 40.0
STRONG = 75.0


def _build_insights(results: list[dict]) -> dict:
    insights = []
    subject_scores: dict[str, list[float]] = {}
    all_scores: list[float] = []

    for r in results:
        subject = r.get("exam_subject") or "Unknown"
        score = r.get("score_percentage")
        if score is None:
            continue
        subject_scores.setdefault(subject, []).append(score)
        all_scores.append(score)

    if not all_scores:
        return {"insights": [], "overall_assessment": "No exam data available yet.", "subject_performance": [], "has_data": False}

    avg_all = sum(all_scores) / len(all_scores)
    latest_score = all_scores[-1]
    trend = "up" if len(all_scores) > 1 and all_scores[-1] > all_scores[-2] else ("down" if len(all_scores) > 1 and all_scores[-1] < all_scores[-2] else "stable")

    subject_performance = []
    for subject, scores in subject_scores.items():
        avg = sum(scores) / len(scores)
        status = "weak" if avg < WEAK else ("average" if avg < STRONG else "strong")
        subject_performance.append({"subject": subject, "average_score": round(avg, 1), "status": status, "exams_taken": len(scores)})

    weak_subjects = [s["subject"] for s in subject_performance if s["status"] == "weak"]
    strong_subjects = [s["subject"] for s in subject_performance if s["status"] == "strong"]

    if avg_all >= STRONG:
        overall_assessment = "Excellent performance! You are consistently scoring well across all subjects."
        insights.append({"category": "achievement", "message": f"Overall average of {avg_all:.1f}% — outstanding work!", "severity": "positive"})
    elif avg_all >= WEAK:
        overall_assessment = "Good progress! There are areas where focused effort can boost your performance."
        insights.append({"category": "encouragement", "message": f"Current average is {avg_all:.1f}%. Keep pushing!", "severity": "info"})
    else:
        overall_assessment = "You need significant improvement. Focus on fundamentals and consistent practice."
        insights.append({"category": "alert", "message": f"Average score is {avg_all:.1f}%. Let's work on improving this.", "severity": "warning"})

    if weak_subjects:
        insights.append({"category": "weakness", "message": f"Weak areas detected: {', '.join(weak_subjects)}. Prioritize these subjects.", "severity": "warning"})
    if strong_subjects:
        insights.append({"category": "strength", "message": f"Strong areas: {', '.join(strong_subjects)}. Keep up the good work!", "severity": "positive"})

    if len(all_scores) >= 2:
        if trend == "up":
            insights.append({"category": "trend", "message": "Your scores are trending upward. Great momentum!", "severity": "positive"})
        elif trend == "down":
            insights.append({"category": "trend", "message": "Your recent scores have dipped. Review your preparation strategy.", "severity": "warning"})
        else:
            insights.append({"category": "trend", "message": "Your performance is consistent. Aim for incremental improvement.", "severity": "info"})

    if latest_score < WEAK:
        insights.append({"category": "suggestion", "message": "Review the topics from your latest exam and practice similar questions.", "severity": "info"})
    elif latest_score < STRONG:
        insights.append({"category": "suggestion", "message": "Focus on time management and revisiting incorrect answers from recent exams.", "severity": "info"})
    else:
        insights.append({"category": "suggestion", "message": "Challenge yourself with advanced topics and help peers with revision.", "severity": "info"})

    ai_tips = _get_ai_analysis(results)
    if ai_tips:
        insights.append({"category": "ai_insight", "message": ai_tips, "severity": "info"})

    return {
        "insights": insights,
        "overall_assessment": overall_assessment,
        "subject_performance": subject_performance,
        "has_data": True,
    }


def _get_ai_analysis(results: list[dict]) -> str | None:
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an AI academic coach. Given a student's exam results, "
                        "provide ONE concise, actionable study tip (max 20 words) to help them improve."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        [{"subject": r.get("exam_subject"), "score": r.get("score_percentage")} for r in results[-5:]]
                    ),
                },
            ],
            max_tokens=100,
        )
        return response.choices[0].message.content
    except Exception:
        return None


class AIService:
    @staticmethod
    def get_insights(db: Session, user: User) -> dict:
        results = ExamService.get_my_results(db, user)
        return _build_insights(results)
