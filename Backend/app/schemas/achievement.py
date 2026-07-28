from datetime import datetime

from pydantic import BaseModel


class AchievementDefinition(BaseModel):
    id: str
    title: str
    description: str
    icon: str = "emoji_events"
    category: str = "general"


class UnlockedAchievement(BaseModel):
    achievement_id: str
    title: str
    description: str
    icon: str = "emoji_events"
    category: str = "general"
    unlocked_at: datetime | None = None
    is_new: bool = False


class AchievementListResponse(BaseModel):
    achievements: list[UnlockedAchievement]
    total_unlocked: int = 0
    total_available: int = 0
    has_data: bool = False
