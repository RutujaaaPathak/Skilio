from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.user import User
from app.schemas.device import DeviceCreate


class DeviceService:
    @staticmethod
    def register(db: Session, user: User, data: DeviceCreate, ip_address: str | None = None) -> Device:
        existing = db.query(Device).filter(
            Device.user_id == user.id,
            Device.device_fingerprint == data.device_fingerprint,
        ).first()
        if existing:
            existing.last_used_at = datetime.now(timezone.utc)
            if data.device_name:
                existing.device_name = data.device_name
            if data.browser:
                existing.browser = data.browser
            if data.os:
                existing.os = data.os
            if ip_address:
                existing.ip_address = ip_address
            db.commit()
            db.refresh(existing)
            return existing

        device = Device(
            user_id=user.id,
            device_fingerprint=data.device_fingerprint,
            device_name=data.device_name,
            browser=data.browser,
            os=data.os,
            ip_address=ip_address,
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        return device

    @staticmethod
    def get_my_devices(db: Session, user: User) -> list[Device]:
        return (
            db.query(Device)
            .filter(Device.user_id == user.id)
            .order_by(Device.last_used_at.desc())
            .all()
        )
