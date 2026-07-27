from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.emergency_contact import (
    EmergencyContactCreate,
    EmergencyContactResponse,
    EmergencyContactUpdate,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth/me/emergency-contacts", tags=["Emergency Contacts"])


@router.get("", response_model=list[EmergencyContactResponse])
def list_emergency_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.get_emergency_contacts(db, current_user)


@router.post("", response_model=EmergencyContactResponse, status_code=201)
def create_emergency_contact(
    body: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.create_emergency_contact(db, current_user, body)


@router.put("/{contact_id}", response_model=EmergencyContactResponse)
def update_emergency_contact(
    contact_id: int,
    body: EmergencyContactUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.update_emergency_contact(db, current_user, contact_id, body)


@router.delete("/{contact_id}")
def delete_emergency_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.delete_emergency_contact(db, current_user, contact_id)
