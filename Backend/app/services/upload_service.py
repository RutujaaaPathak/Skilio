import os
import uuid

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}
EXT_TO_MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


class UploadService:
    @staticmethod
    def validate_image(file: UploadFile) -> None:
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
            )

        if file.content_type and file.content_type not in ALLOWED_MIMES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
            )

    @staticmethod
    def save_upload(file: UploadFile, subdir: str = "profile") -> str:
        ext = (file.filename or "").rsplit(".", 1)[-1].lower() or "jpg"
        filename = f"{uuid.uuid4().hex}.{ext}"
        upload_path = os.path.join(settings.UPLOAD_DIR, subdir)
        os.makedirs(upload_path, exist_ok=True)
        file_path = os.path.join(upload_path, filename)

        content = file.file.read()
        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB",
            )

        with open(file_path, "wb") as f:
            f.write(content)

        return f"/uploads/{subdir}/{filename}"

    @staticmethod
    def delete_upload(url: str | None) -> None:
        if not url:
            return
        if url.startswith("http"):
            from urllib.parse import urlparse
            path = urlparse(url).path
        else:
            path = url
        if not path.startswith("/uploads/"):
            return
        rel_path = path.lstrip("/")
        full_path = os.path.join(settings.UPLOAD_DIR, rel_path.replace("uploads/", "", 1))
        if os.path.exists(full_path):
            os.remove(full_path)