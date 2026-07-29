from datetime import datetime

from pydantic import BaseModel


class FingerprintVerifyRequest(BaseModel):
    fingerprint_hash: str


class FingerprintVerifyResponse(BaseModel):
    matched: bool
    message: str
    device_name: str | None = None
    is_trusted: bool = False


class CheckResult(BaseModel):
    check_name: str
    status: str
    details: dict | None = None


class SecurityReportRequest(BaseModel):
    session_token: str | None = None
    overall_score: int
    risk_level: str
    results: list[CheckResult]
    client_timestamp: datetime | None = None


class SecurityReportResponse(BaseModel):
    id: int
    status: str
    message: str
