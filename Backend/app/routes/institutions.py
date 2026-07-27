from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.institution import Institution
from app.models.user import User
from app.schemas.institution import InstitutionCreate, InstitutionResponse, InstitutionUpdate

router = APIRouter(prefix="/institutions", tags=["Institutions"])


def _response(inst: Institution) -> InstitutionResponse:
    return InstitutionResponse(
        id=inst.id,
        name=inst.name,
        code=inst.code,
        address=inst.address,
        city=inst.city,
        state=inst.state,
        country=inst.country,
        is_active=inst.is_active,
        created_at=inst.created_at,
        updated_at=inst.updated_at,
    )


@router.get("", response_model=list[InstitutionResponse])
def list_institutions(
    db: Session = Depends(get_db),
):
    return [_response(inst) for inst in db.query(Institution).order_by(Institution.name).all()]


@router.get("/{institution_id}", response_model=InstitutionResponse)
def get_institution(
    institution_id: int,
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")
    return _response(inst)


@router.post("", response_model=InstitutionResponse, status_code=201)
def create_institution(
    body: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(Institution).filter(Institution.code == body.code).first()
    if existing:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Institution with this code already exists")
    inst = Institution(name=body.name, code=body.code, address=body.address, city=body.city, state=body.state, country=body.country)
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return _response(inst)


@router.put("/{institution_id}", response_model=InstitutionResponse)
def update_institution(
    institution_id: int,
    body: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from fastapi import HTTPException, status
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(inst, field, value)
    db.commit()
    db.refresh(inst)
    return _response(inst)


@router.delete("/{institution_id}")
def delete_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from fastapi import HTTPException, status
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")
    db.delete(inst)
    db.commit()
    return {"message": "Institution deleted successfully"}
