import json
from datetime import datetime

from app.database import SessionLocal
from app.models.audit_log import AuditLog


class AuditService:
    @staticmethod
    def log(
        action: str,
        user_id: int | None = None,
        details: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        db = SessionLocal()
        try:
            entry = AuditLog(
                user_id=user_id,
                action=action,
                details=json.dumps(details) if details else None,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            db.add(entry)
            db.commit()
        finally:
            db.close()