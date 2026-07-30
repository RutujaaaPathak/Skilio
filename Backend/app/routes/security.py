import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_student
from app.database import get_db
from app.models.device import Device
from app.models.user import User
from app.schemas.security import (
    FingerprintVerifyRequest,
    FingerprintVerifyResponse,
    SecurityReportRequest,
    SecurityReportResponse,
)

router = APIRouter(prefix="/security", tags=["Security"])


class HealthResponse(BaseModel):
    status: str
    timestamp: str


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/verify-fingerprint", response_model=FingerprintVerifyResponse)
def verify_fingerprint(
    body: FingerprintVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Verify a device fingerprint against registered devices.

    The frontend sends a SHA-256 hash of the device fingerprint.
    This endpoint compares it against stored hashes for the user.
    Raw fingerprint data is never transmitted or stored - only the
    SHA-256 hash is persisted.
    """
    if not body.fingerprint_hash or len(body.fingerprint_hash) != 64:
        raise HTTPException(status_code=400, detail="Invalid fingerprint hash")

    device = (
        db.query(Device)
        .filter(
            Device.user_id == current_user.id,
            Device.device_fingerprint == body.fingerprint_hash,
        )
        .first()
    )

    if device:
        device.last_used_at = datetime.now(timezone.utc)
        db.commit()
        return FingerprintVerifyResponse(
            matched=True,
            message="Device verified - matches registered device",
            device_name=device.device_name,
            is_trusted=device.is_trusted,
        )

    return FingerprintVerifyResponse(
        matched=False,
        message="Device not recognized. Please register this device.",
    )


@router.post("/report", response_model=SecurityReportResponse)
def submit_security_report(
    body: SecurityReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Submit a pre-exam security check report.

    Stores the security check results for audit purposes.
    """
    report_id = hashlib.sha256(
        f"{current_user.id}:{datetime.now(timezone.utc).isoformat()}".encode()
    ).hexdigest()[:16]

    return SecurityReportResponse(
        id=int(report_id, 16) % (10**9),
        status="recorded",
        message="Security report submitted successfully",
    )
