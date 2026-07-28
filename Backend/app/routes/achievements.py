from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.achievement import AchievementListResponse
from app.services.achievement_service import AchievementService

router = APIRouter(prefix="/achievements", tags=["Achievements"])


@router.get("", response_model=AchievementListResponse)
def list_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AchievementService.get_all_achievements(db, current_user)


@router.post("/check", response_model=AchievementListResponse)
def check_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new = AchievementService.check_and_unlock(db, current_user)
    data = AchievementService.get_all_achievements(db, current_user)
    # Mark newly unlocked items for the response
    new_ids = {a["achievement_id"] for a in new}
    data["achievements"] = [
        {**a, "is_new": a["achievement_id"] in new_ids} for a in data["achievements"]
    ]
    data["total_unlocked"] = len(data["achievements"])
    return data
