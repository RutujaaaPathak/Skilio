from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.achievement import UnlockedAchievement as UnlockedAchievementModel
from app.models.notification import Notification
from app.models.user import User
from app.services.exam_service import ExamService

ACHIEVEMENTS: list[dict] = [
    {"id": "first_exam", "title": "First Steps", "description": "Complete your first exam", "icon": "check_circle", "category": "milestone"},
    {"id": "five_exams", "title": "Getting Started", "description": "Complete 5 exams", "icon": "school", "category": "milestone"},
    {"id": "ten_exams", "title": "Dedicated", "description": "Complete 10 exams", "icon": "stars", "category": "milestone"},
    {"id": "streak_3", "title": "Consistent", "description": "Achieve a 3-day learning streak", "icon": "local_fire_department", "category": "streak"},
    {"id": "streak_7", "title": "On Fire", "description": "Achieve a 7-day learning streak", "icon": "local_fire_department", "category": "streak"},
    {"id": "streak_14", "title": "Unstoppable", "description": "Achieve a 14-day learning streak", "icon": "local_fire_department", "category": "streak"},
    {"id": "streak_30", "title": "Legendary Streak", "description": "Achieve a 30-day learning streak", "icon": "emoji_events", "category": "streak"},
    {"id": "perfect_score", "title": "Perfect Score", "description": "Score 100% on any exam", "icon": "star", "category": "score"},
    {"id": "high_avg", "title": "Scholar", "description": "Achieve an overall average above 85%", "icon": "auto_awesome", "category": "score"},
    {"id": "rank_1_institution", "title": "Top of the Class", "description": "Rank #1 in your institution", "icon": "emoji_events", "category": "rank"},
    {"id": "rank_top3", "title": "Elite Performer", "description": "Rank in the top 3 of your institution", "icon": "military_tech", "category": "rank"},
    {"id": "fast_exam", "title": "Quick Silver", "description": "Average exam time under 20 minutes", "icon": "bolt", "category": "speed"},
    {"id": "big_improvement", "title": "Most Improved", "description": "Improve your score by 20%+ between exams", "icon": "trending_up", "category": "improvement"},
    {"id": "integrity_100", "title": "Clean Record", "description": "Maintain 100% integrity across all exams", "icon": "verified", "category": "integrity"},
]


class AchievementService:
    @staticmethod
    def _already_unlocked(db: Session, user_id: int, achievement_id: str) -> bool:
        return db.query(UnlockedAchievementModel).filter(
            UnlockedAchievementModel.user_id == user_id,
            UnlockedAchievementModel.achievement_id == achievement_id,
        ).first() is not None

    @staticmethod
    def _unlock(db: Session, user_id: int, achievement: dict) -> dict | None:
        if AchievementService._already_unlocked(db, user_id, achievement["id"]):
            return None
        record = UnlockedAchievementModel(
            user_id=user_id,
            achievement_id=achievement["id"],
            title=achievement["title"],
            description=achievement["description"],
            icon=achievement["icon"],
            category=achievement["category"],
        )
        db.add(record)
        db.flush()

        db.add(Notification(
            user_id=user_id,
            title=f"Achievement unlocked: {achievement['title']}",
            message=achievement["description"],
            category=achievement["category"],
        ))
        db.flush()

        return {
            "achievement_id": achievement["id"],
            "title": achievement["title"],
            "description": achievement["description"],
            "icon": achievement["icon"],
            "category": achievement["category"],
            "unlocked_at": record.unlocked_at,
            "is_new": True,
        }

    @staticmethod
    def check_and_unlock(db: Session, user: User) -> list[dict]:
        new_achievements = []
        core = ExamService.get_core_analytics(db, user)
        streak = ExamService.get_learning_streak(db, user)

        # Fetch results once
        results = ExamService.get_my_results(db, user)
        scores = [r.get("score_percentage") for r in results if r.get("score_percentage") is not None]

        completed = core.get("total_exams_completed", 0) or 0
        avg_score = core.get("overall_average_score")

        # First exam
        if completed >= 1:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[0])
            if ach: new_achievements.append(ach)

        # Five exams
        if completed >= 5:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[1])
            if ach: new_achievements.append(ach)

        # Ten exams
        if completed >= 10:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[2])
            if ach: new_achievements.append(ach)

        # Streak achievements
        current_streak = streak.get("current_streak", 0) or 0
        if current_streak >= 3:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[3])
            if ach: new_achievements.append(ach)
        if current_streak >= 7:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[4])
            if ach: new_achievements.append(ach)
        if current_streak >= 14:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[5])
            if ach: new_achievements.append(ach)
        if current_streak >= 30:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[6])
            if ach: new_achievements.append(ach)

        # Perfect score on any exam
        if any(sp == 100.0 for sp in scores):
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[7])
            if ach: new_achievements.append(ach)

        # High average
        if avg_score is not None and avg_score >= 85:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[8])
            if ach: new_achievements.append(ach)

        # Rank achievements
        try:
            ranking = ExamService.get_ranking(db, user)
            if ranking.get("has_data"):
                inst = ranking.get("institution_rank")
                if inst and inst.get("rank") == 1:
                    ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[9])
                    if ach: new_achievements.append(ach)
                if inst and inst.get("rank") is not None and inst["rank"] <= 3:
                    ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[10])
                    if ach: new_achievements.append(ach)
        except Exception:
            pass

        # Fast exam
        avg_secs = core.get("average_time_per_exam_seconds", 0) or 0
        if completed > 0 and avg_secs > 0 and avg_secs / 60 < 20:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[11])
            if ach: new_achievements.append(ach)

        # Big improvement
        if len(scores) >= 2 and (max(scores) - min(scores)) >= 20:
            ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[12])
            if ach: new_achievements.append(ach)

        # Integrity
        try:
            integrity = ExamService.get_integrity_breakdown(db, user)
            if integrity.get("has_data") and integrity.get("overall_integrity") == 100.0:
                ach = AchievementService._unlock(db, user.id, ACHIEVEMENTS[13])
                if ach: new_achievements.append(ach)
        except Exception:
            pass

        if new_achievements:
            db.commit()

        return new_achievements

    @staticmethod
    def get_all_achievements(db: Session, user: User) -> dict:
        unlocked = (
            db.query(UnlockedAchievementModel)
            .filter(UnlockedAchievementModel.user_id == user.id)
            .order_by(UnlockedAchievementModel.unlocked_at.desc())
            .all()
        )
        formatted = [
            {
                "achievement_id": u.achievement_id,
                "title": u.title,
                "description": u.description,
                "icon": u.icon,
                "category": u.category,
                "unlocked_at": u.unlocked_at,
                "is_new": False,
            }
            for u in unlocked
        ]
        return {
            "achievements": formatted,
            "total_unlocked": len(formatted),
            "total_available": len(ACHIEVEMENTS),
            "has_data": len(formatted) > 0,
        }
