from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("", response_model=list[AnnouncementResponse])
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Announcement).filter(Announcement.is_active == True)

    if current_user.college:
        q = q.filter(
            (Announcement.institution.is_(None))
            | (Announcement.institution == current_user.college)
        )

    if current_user.branch:
        q = q.filter(
            (Announcement.department.is_(None))
            | (Announcement.department == current_user.branch)
        )

    return q.order_by(Announcement.created_at.desc()).limit(10).all()


@router.post("", response_model=AnnouncementResponse, status_code=201)
def create_announcement(
    body: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = Announcement(
        title=body.title,
        content=body.content,
        category=body.category,
        created_by=current_user.id,
        institution=body.institution,
        department=body.department,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement
