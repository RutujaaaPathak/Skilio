from fastapi import APIRouter, Depends, Query, Request, status as http_status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_student, require_teacher_or_admin
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.device import DeviceBindRequest
from app.schemas.exam import AnswerSyncRequest, AnswerSyncResponse, MySubmissionResponse, OfflinePackageResponse, StudentExamResponse
from app.services.exam_service import ExamService

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=list[UserResponse])
def list_students(
    batch: str | None = Query(None),
    year: str | None = Query(None),
    branch: str | None = Query(None),
    division: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    q = db.query(User).filter(User.role == "student")
    if batch:
        q = q.filter(User.batch == batch)
    if year:
        q = q.filter(User.year == year)
    if branch:
        q = q.filter(User.branch == branch)
    if division:
        q = q.filter(User.division == division)
    return q.order_by(User.name).all()


@router.get("/my-exams", response_model=list[StudentExamResponse])
def get_my_exams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExamService.get_my_exams(db, current_user)


@router.get("/exams/{exam_id}/offline-package", response_model=OfflinePackageResponse)
def download_offline_package(
    exam_id: int,
    request: Request,
    device_info: str | None = Query(None, description="Browser/device info for session tracking"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Download offline exam package for caching in IndexedDB/localStorage.

    Returns exam details, questions (without answers), a secure session token,
    and exam rules. The frontend should:
      1. Store this response in IndexedDB under the `session_token` key
      2. Use the cached data when network is unavailable
      3. Pass `session_token` with all answer submission/sync requests
      4. Enforce tab-switch limit, camera, and voice rules locally
    """
    ip_address = request.client.host if request.client else None
    return ExamService.get_offline_package(
        db=db,
        exam_id=exam_id,
        user=current_user,
        ip_address=ip_address,
        device_info=device_info,
    )


@router.post("/exams/{exam_id}/sync-answers", response_model=AnswerSyncResponse, status_code=http_status.HTTP_200_OK)
def sync_answers(
    exam_id: int,
    body: AnswerSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Sync answers collected offline during the exam.

    The frontend should send the batch of answers along with the
    session_token obtained from the offline-package download.

    Set `final_submission: true` for the last sync to mark the
    exam as submitted. Subsequent syncs after submission are
    rejected unless a teacher reopens the assignment.

    If the session has been device-bound, provide `device_fingerprint`
    in the request body so the server can verify the request comes
    from the same device.
    """
    return ExamService.sync_answers(
        db=db,
        exam_id=exam_id,
        user=current_user,
        body=body,
    )


@router.get("/exams/{exam_id}/my-submission", response_model=MySubmissionResponse)
def get_my_submission(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Get the student's submitted answers for a completed exam."""
    return ExamService.get_my_submission(
        db=db,
        exam_id=exam_id,
        user=current_user,
    )


@router.post("/exams/{exam_id}/bind-device", status_code=http_status.HTTP_200_OK)
def bind_device(
    exam_id: int,
    body: DeviceBindRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Bind an exam session to a specific device.

    Call this after the student starts the exam to lock the session
    to their current device fingerprint.  Subsequent sync requests
    must include the matching fingerprint or they will be rejected.

    Browser fingerprinting is a useful deterrent against casual
    device switching but is not cryptographically secure.  Combine
    with IP monitoring and short token expiry for stronger protection.
    """
    return ExamService.bind_device(
        db=db,
        exam_id=exam_id,
        user=current_user,
        session_token=body.session_token,
        device_fingerprint=body.device_fingerprint,
    )
