from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_student
from app.database import get_db
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceResponse
from app.services.device_service import DeviceService

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.post("/register", response_model=DeviceResponse, status_code=201)
def register_device(
    body: DeviceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Register the current device for exam binding.

    The frontend should generate a `device_fingerprint` using a library such as
    fingerprintjs and send it along with browser/OS info.  See the Device model
    for important security caveats about browser fingerprinting.
    """
    ip_address = request.client.host if request.client else None
    return DeviceService.register(db=db, user=current_user, data=body, ip_address=ip_address)


@router.get("/my-devices", response_model=list[DeviceResponse])
def get_my_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """List all devices registered by the current student."""
    return DeviceService.get_my_devices(db=db, user=current_user)
