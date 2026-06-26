from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_tenant_id
from app.models.user import User
from app.models.case import Case, CaseStatus, CasePriority
from app.models.client import Client
from app.models.hearing import Hearing
from app.models.deadline import Deadline
from app.models.task import Task
from app.models.billing import Income
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/cases", tags=["cases"])

class CaseCreate(BaseModel):
    title: str
    client_id: str
    matter: str = "civil"
    priority: str = "medium"
    status: Optional[str] = None
    description: Optional[str] = None
    court: Optional[str] = None
    court_file_number: Optional[str] = None
    opposing_party: Optional[str] = None
    agreed_fee: Optional[float] = None
    notes: Optional[str] = None
    opened_at: Optional[str] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    client_id: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    matter: Optional[str] = None
    court: Optional[str] = None
    court_file_number: Optional[str] = None
    opposing_party: Optional[str] = None
    agreed_fee: Optional[float] = None
    notes: Optional[str] = None
    description: Optional[str] = None

def case_to_dict(c: Case) -> dict:
    return {
        "id": c.id, "reference": c.reference, "title": c.title,
        "description": c.description, "status": c.status.value if hasattr(c.status, 'value') else c.status,
        "priority": c.priority.value if hasattr(c.priority, 'value') else c.priority,
        "matter": c.matter, "client_id": c.client_id, "lawyer_id": c.lawyer_id,
        "court": c.court, "court_file_number": c.court_file_number,
        "opposing_party": c.opposing_party, "agreed_fee": c.agreed_fee,
        "opened_at": c.opened_at, "notes": c.notes, "is_archived": c.is_archived,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "client": {"id": c.client.id, "full_name": c.client.full_name} if c.client else None,
    }

@router.get("")
async def list_cases(
    search: Optional[str] = None,
    status: Optional[str] = None,
    matter: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Case).options(selectinload(Case.client)).where(
        Case.tenant_id == current_user.tenant_id,
        Case.is_archived == False
    )
    if search:
        q = q.where(or_(
            Case.title.ilike(f"%{search}%"),
            Case.reference.ilike(f"%{search}%"),
            Case.opposing_party.ilike(f"%{search}%"),
        ))
    if status:
        q = q.where(Case.status == status)
    if matter:
        q = q.where(Case.matter == matter)

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    q = q.order_by(Case.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    items = result.scalars().all()

    return {"items": [case_to_dict(c) for c in items], "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}

@router.get("/dashboard-stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Case.status, func.count().label("count")).where(
            Case.tenant_id == current_user.tenant_id,
            Case.is_archived == False
        ).group_by(Case.status)
    )
    stats = {r.status if isinstance(r.status, str) else r.status.value: r.count for r in result}
    return {
        "active": stats.get("active", 0) + stats.get("new", 0),
        "trial": stats.get("trial", 0),
        "total": sum(stats.values()),
        "by_status": stats,
    }

@router.get("/{case_id}")
async def get_case(case_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Case).options(selectinload(Case.client)).where(Case.id == case_id, Case.tenant_id == current_user.tenant_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(404, "Caso no encontrado")
    return case_to_dict(case)


@router.get("/{case_id}/detail")
async def get_case_detail(case_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Full case detail with related data"""
    result = await db.execute(
        select(Case).options(selectinload(Case.client)).where(Case.id == case_id, Case.tenant_id == current_user.tenant_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(404, "Caso no encontrado")

    # Get related hearings
    hearings_r = await db.execute(
        select(Hearing).where(Hearing.case_id == case_id, Hearing.tenant_id == current_user.tenant_id)
        .order_by(Hearing.scheduled_at.desc()).limit(20)
    )
    hearings = hearings_r.scalars().all()

    # Get related deadlines
    deadlines_r = await db.execute(
        select(Deadline).where(Deadline.case_id == case_id, Deadline.tenant_id == current_user.tenant_id)
        .order_by(Deadline.due_date.asc()).limit(30)
    )
    deadlines = deadlines_r.scalars().all()

    # Get related tasks
    tasks_r = await db.execute(
        select(Task).where(Task.case_id == case_id, Task.tenant_id == current_user.tenant_id)
        .order_by(Task.due_date.asc()).limit(30)
    )
    tasks = tasks_r.scalars().all()

    # Get income for this case
    income_r = await db.execute(
        select(func.sum(Income.amount)).where(Income.case_id == case_id, Income.tenant_id == current_user.tenant_id)
    )
    total_income = income_r.scalar() or 0

    case_data = case_to_dict(case)
    case_data["hearings"] = [{
        "id": h.id, "type": h.type, "hearing_type": h.type, "status": h.status,
        "scheduled_at": h.scheduled_at, "court": h.court, "location": h.court,
        "title": h.title, "notes": h.notes, "result": h.result,
    } for h in hearings]
    case_data["deadlines"] = [{
        "id": d.id, "title": d.title, "due_date": d.due_date,
        "priority": d.priority if isinstance(d.priority, str) else d.priority.value,
        "status": d.status, "legal_basis": d.legal_basis,
    } for d in deadlines]
    case_data["tasks"] = [{
        "id": t.id, "title": t.title, "due_date": t.due_date,
        "priority": t.priority if isinstance(t.priority, str) else t.priority.value,
        "status": t.status if isinstance(t.status, str) else t.status.value,
    } for t in tasks]
    case_data["total_income"] = total_income

    return case_data

@router.post("", status_code=201)
async def create_case(data: CaseCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    tenant_id = require_tenant_id(current_user)
    year = datetime.now().year
    count_result = await db.execute(
        select(func.count()).where(Case.tenant_id == tenant_id)
    )
    count = (count_result.scalar() or 0) + 1
    reference = f"EXP-{year}-{count:04d}"

    case = Case(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        reference=reference,
        lawyer_id=current_user.id,
        **data.model_dump(exclude_none=True),
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return {"id": case.id, "reference": case.reference, "message": "Caso creado exitosamente"}

@router.put("/{case_id}")
async def update_case(case_id: str, data: CaseUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Case).where(Case.id == case_id, Case.tenant_id == current_user.tenant_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(404, "Caso no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(case, k, v)
    await db.commit()
    return {"message": "Actualizado"}

@router.delete("/{case_id}")
async def archive_case(case_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Case).where(Case.id == case_id, Case.tenant_id == current_user.tenant_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(404, "Caso no encontrado")
    case.is_archived = True
    await db.commit()
    return {"message": "Caso archivado"}
