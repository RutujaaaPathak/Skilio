from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.department import Department
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate

router = APIRouter(prefix="/departments", tags=["Departments"])


def _response(dept: Department) -> DepartmentResponse:
    return DepartmentResponse(
        id=dept.id,
        institution_id=dept.institution_id,
        name=dept.name,
        code=dept.code,
        is_active=dept.is_active,
        created_at=dept.created_at,
        updated_at=dept.updated_at,
    )


@router.get("", response_model=list[DepartmentResponse])
def list_departments(
    institution_id: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Department)
    if institution_id:
        q = q.filter(Department.institution_id == institution_id)
    return [_response(dept) for dept in q.order_by(Department.name).all()]


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException, status
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return _response(dept)


@router.post("", response_model=DepartmentResponse, status_code=201)
def create_department(
    body: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from fastapi import HTTPException, status
    from app.models.institution import Institution
    inst = db.query(Institution).filter(Institution.id == body.institution_id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")
    dept = Department(institution_id=body.institution_id, name=body.name, code=body.code)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return _response(dept)


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    body: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from fastapi import HTTPException, status
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dept, field, value)
    db.commit()
    db.refresh(dept)
    return _response(dept)


@router.delete("/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from fastapi import HTTPException, status
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted successfully"}
