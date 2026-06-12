from datetime import datetime

from pydantic import BaseModel


class DeviceCreate(BaseModel):
    """
    Register a new device for the authenticated student.

    The `device_fingerprint` should be generated on the frontend using a
    fingerprinting library (e.g. fingerprintjs).  See the Device model for
    security caveats.
    """
    device_fingerprint: str
    device_name: str | None = None
    browser: str | None = None
    os: str | None = None


class DeviceResponse(BaseModel):
    id: int
    user_id: int
    device_fingerprint: str
    device_name: str | None = None
    browser: str | None = None
    os: str | None = None
    ip_address: str | None = None
    is_trusted: bool
    first_used_at: datetime
    last_used_at: datetime

    model_config = {"from_attributes": True}


class DeviceBindRequest(BaseModel):
    """Bind an exam session to a specific registered device."""
    session_token: str
    device_fingerprint: str
