import json
from statistics import stdev

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.exam_service import ExamService

WEAK = 40.0
STRONG = 75.0

TARGET_SCORE = 85.0


def _calc_stats(values: list[float]) -> dict:
    avg = sum(values) / len(values)
    velo = None
    if len(values) >= 2:
        velo = round(values[-1] - values[0], 2)
    vol = "low"
    cons = "consistent"
    if len(values) >= 3:
        try:
            sd = stdev(values)
            cv = sd / abs(avg) if avg else 99
            vol = "high" if cv > 0.4 else ("moderate" if cv > 0.2 else "low")
        except Exception:
            pass
        sorted_vals = sorted(values)
        gap = sorted_vals[-1] - sorted_vals[0]
        cons = "volatile" if gap > 40 else ("moderate" if gap > 20 else "consistent")
    elif len(values) == 2:
        gap = abs(values[1] - values[0])
        vol = "high" if gap > 30 else ("moderate" if gap > 15 else "low")
        cons = "volatile" if gap > 30 else ("moderate" if gap > 15 else "consistent")

    direction = "up" if len(values) > 1 and values[-1] > values[0] else ("down" if len(values) > 1 and values[-1] < values[0] else "stable")
    recent_improvement = None
    if len(values) >= 3:
        recent_improvement = round(values[-1] - values[-2], 2)

    return {
        "direction": direction,
        "volatility": vol,
        "consistency": cons,
        "score_velocity": velo,
        "recent_improvement": recent_improvement,
    }


def _predict_next(scores: list[float]) -> float | None:
    if len(scores) < 2:
        return None
    if len(scores) == 2:
        return round((scores[-1] * 0.7 + scores[-2] * 0.3), 1)
    w = [0.5, 0.3, 0.2]
    if len(scores) >= 5:
        w = [0.35, 0.25, 0.2, 0.12, 0.08]
    recent = scores[-len(w):]
    weights = w[:len(recent)]
    return round(sum(s * wt for s, wt in zip(recent, weights)) / sum(weights), 1)


def _build_insights(results: list[dict], core: dict | None = None, topic_mastery: dict | None = None) -> dict:
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
        return {
            "insights": [],
            "overall_assessment": "No exam data available yet.",
            "subject_performance": [],
            "trend_analysis": None,
            "topic_performance": [],
            "time_analysis": None,
            "performance_prediction": None,
            "has_data": False,
        }

    avg_all = sum(all_scores) / len(all_scores)
    latest_score = all_scores[-1]

    subject_performance = []
    for subject, scores in subject_scores.items():
        avg = sum(scores) / len(scores)
        status = "weak" if avg < WEAK else ("average" if avg < STRONG else "strong")
        subject_performance.append({
            "subject": subject,
            "average_score": round(avg, 1),
            "status": status,
            "exams_taken": len(scores),
            "trend": "up" if len(scores) > 1 and scores[-1] > scores[0] else ("down" if len(scores) > 1 and scores[-1] < scores[0] else "stable"),
        })

    weak_subjects = [s["subject"] for s in subject_performance if s["status"] == "weak"]
    strong_subjects = [s["subject"] for s in subject_performance if s["status"] == "strong"]

    # Overall assessment
    if avg_all >= STRONG:
        overall_assessment = "Excellent performance! You are consistently scoring well across all subjects."
    elif avg_all >= WEAK:
        overall_assessment = "Good progress! There are areas where focused effort can boost your performance."
    else:
        overall_assessment = "You need significant improvement. Focus on fundamentals and consistent practice."

    # Core insights
    if avg_all >= STRONG:
        insights.append({"category": "achievement", "message": f"Overall average of {avg_all:.1f}% — outstanding work!", "severity": "positive"})
    elif avg_all >= WEAK:
        insights.append({"category": "encouragement", "message": f"Current average is {avg_all:.1f}%. Keep pushing!", "severity": "info"})
    else:
        insights.append({"category": "alert", "message": f"Average score is {avg_all:.1f}%. Let's work on improving this.", "severity": "warning"})

    # Trend insight
    trend = _calc_stats(all_scores)
    if len(all_scores) >= 2:
        if trend["direction"] == "up":
            insights.append({"category": "trend", "message": f"Your scores are trending upward (+{trend['score_velocity']:.1f}%). Great momentum!", "severity": "positive"})
        elif trend["direction"] == "down":
            insights.append({"category": "trend", "message": f"Your scores have dipped ({trend['score_velocity']:.1f}%). Review your preparation strategy.", "severity": "warning"})
        else:
            insights.append({"category": "trend", "message": "Your performance is stable. Aim for incremental improvement.", "severity": "info"})

    # Volatility insight
    if trend["volatility"] == "high":
        insights.append({"category": "consistency", "message": "Score swings are large. Focus on consistent preparation across all subjects.", "severity": "warning"})
    elif trend["consistency"] == "consistent":
        insights.append({"category": "consistency", "message": "Strong consistency in scores. You're on the right track!", "severity": "positive"})

    # Subject-specific insights
    if weak_subjects:
        insights.append({"category": "weakness", "message": f"Weak areas: {', '.join(weak_subjects)}. Prioritize these subjects.", "severity": "warning"})
    if strong_subjects:
        insights.append({"category": "strength", "message": f"Strong areas: {', '.join(strong_subjects)}. Keep up the good work!", "severity": "positive"})

    # Topic mastery insights
    topic_performance = []
    if topic_mastery and topic_mastery.get("has_data"):
        topic_performance = topic_mastery.get("topics", [])
        weak_topics = [t["topic"] for t in topic_performance if t["status"] == "weak"]
        if weak_topics:
            insights.append({"category": "topic_weakness", "message": f"Weak topics: {', '.join(weak_topics[:3])}. Focus on these concepts.", "severity": "warning"})

    # Latest exam inference
    if latest_score < WEAK:
        insights.append({"category": "suggestion", "message": "Review topics from your latest exam and practice similar questions.", "severity": "info"})
    elif latest_score < STRONG:
        insights.append({"category": "suggestion", "message": "Focus on time management and revisiting incorrect answers from recent exams.", "severity": "info"})
    else:
        insights.append({"category": "suggestion", "message": "Challenge yourself with advanced topics and help peers with revision.", "severity": "info"})

    # Performance prediction
    prediction = None
    if len(all_scores) >= 2:
        next_est = _predict_next(all_scores)
        if next_est is not None:
            diff = TARGET_SCORE - next_est
            exams_needed = None
            if diff > 0:
                exams_needed = max(1, int(diff / max(abs(trend.get("score_velocity") or 2), 2)))
            confidence = "high" if len(all_scores) >= 5 else ("moderate" if len(all_scores) >= 3 else "low")
            prediction = {
                "estimated_next_score": next_est,
                "confidence": confidence,
                "target_score": TARGET_SCORE,
                "exams_to_target": exams_needed,
            }
            if next_est >= latest_score:
                insights.append({"category": "prediction", "message": f"Next score estimated around {next_est:.1f}% based on recent trend.", "severity": "info"})

    # Time analysis
    time_analysis = None
    if core:
        total_secs = core.get("total_time_spent_seconds", 0) or 0
        avg_secs = core.get("average_time_per_exam_seconds", 0) or 0
        completed = core.get("total_exams_completed", 0)
        if completed > 0:
            avg_min = avg_secs / 60
            efficiency = "fast" if avg_min < 20 else ("moderate" if avg_min < 45 else "slow")
            # Optimal pace: 2 min per question avg
            optimal = None
            time_analysis = {
                "total_time_spent_minutes": total_secs // 60,
                "average_time_per_exam_minutes": round(avg_min, 0),
                "time_efficiency": efficiency,
                "optimal_pace_minutes": optimal,
            }
            if efficiency == "slow":
                insights.append({"category": "time", "message": "You spend more time than average per exam. Practice timing to improve efficiency.", "severity": "warning"})
            elif efficiency == "fast":
                insights.append({"category": "time", "message": "You complete exams quickly. Ensure accuracy isn't being sacrificed for speed.", "severity": "info"})

    ai_tips = _get_ai_analysis(results)
    if ai_tips:
        insights.append({"category": "ai_insight", "message": ai_tips, "severity": "info"})

    return {
        "insights": insights,
        "overall_assessment": overall_assessment,
        "subject_performance": subject_performance,
        "trend_analysis": trend,
        "topic_performance": topic_performance,
        "time_analysis": time_analysis,
        "performance_prediction": prediction,
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
        core = ExamService.get_core_analytics(db, user)
        topic_mastery = ExamService.get_topic_mastery(db, user)
        return _build_insights(results, core, topic_mastery)
