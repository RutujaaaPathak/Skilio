from fastapi import APIRouter, Depends, Request, UploadFile, File
from sqlalchemy.orm import Session
from starlette.datastructures import URL

from app.core.dependencies import get_current_user
from app.core.rate_limiter import limiter
from app.database import get_db
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.upload_service import UploadService


def _full_url(request: Request, path: str) -> str:
    return str(URL(scheme=request.url.scheme, hostname=request.url.hostname, port=request.url.port, path=path))


router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("/photo")
@limiter.limit("5/minute")
def upload_profile_photo(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    UploadService.validate_image(file)
    old_url = current_user.profile_photo_url
    rel_path = UploadService.save_upload(file, subdir="profile")
    full_url = _full_url(request, rel_path)
    UploadService.delete_upload(old_url)
    current_user.profile_photo_url = full_url
    db.commit()
    db.refresh(current_user)
    return {"profile_photo_url": full_url, "user": AuthService._build_user_dict(current_user)}


@router.delete("/photo")
def remove_profile_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    UploadService.delete_upload(current_user.profile_photo_url)
    current_user.profile_photo_url = None
    db.commit()
    db.refresh(current_user)
    return {"profile_photo_url": None, "user": AuthService._build_user_dict(current_user)}