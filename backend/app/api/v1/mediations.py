from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import uuid
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.mediation import Mediation

router = APIRouter(prefix="/mediations", tags=["mediations"])


class MediationCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pendiente"
    client_id: Optional[str] = None
    case_id: Optional[str] = None
    case_number: Optional[str] = None
    mediation_center: Optional[str] = None
    mediator_name: Optional[str] = None
    opposing_party: Optional[str] = None
    scheduled_at: Optional[str] = None
    notes: Optional[str] = None


class MediationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    case_number: Optional[str] = None
    mediation_center: Optional[str] = None
    mediator_name: Optional[str] = None
    opposing_party: Optional[str] = None
    scheduled_at: Optional[str] = None
    result: Optional[str] = None
    agreement_reached: Optional[bool] = None
    notes: Optional[str] = None


def _clean_fks(payload: dict, *fields: str) -> dict:
    for f in fields:
        if payload.get(f) == "":
            payload[f] = None
    return payload


def med_to_dict(m: Mediation) -> dict:
    return {
        "id": m.id, "title": m.title, "description": m.description,
        "status": m.status, "client_id": m.client_id, "case_id": m.case_id,
        "case_number": m.case_number,
        "mediation_center": m.mediation_center, "mediator_name": m.mediator_name,
        "opposing_party": m.opposing_party, "scheduled_at": m.scheduled_at,
        "result": m.result, "agreement_reached": m.agreement_reached,
        "notes": m.notes,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


@router.get("")
async def list_mediations(
    status: Optional[str] = None,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    q = select(Mediation).where(Mediation.tenant_id == current_user.tenant_id)
    if status:
        q = q.where(Mediation.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Mediation.created_at.desc()).offset((page-1)*limit).limit(limit))
    return {"items": [med_to_dict(m) for m in result.scalars().all()], "total": total}


@router.post("", status_code=201)
async def create_mediation(
    data: MediationCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    m = Mediation(id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, **_clean_fks(data.model_dump(), "client_id", "case_id"))
    db.add(m)
    await db.commit()
    return {"id": m.id, "message": "Mediación creada"}


@router.put("/{mid}")
async def update_mediation(
    mid: str, data: MediationUpdate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Mediation).where(Mediation.id == mid, Mediation.tenant_id == current_user.tenant_id))
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(404, "Mediación no encontrada")
    for k, v in data.model_dump(exclude_none=True).items(): setattr(m, k, v)
    await db.commit()
    return {"message": "Actualizada"}


@router.delete("/{mid}")
async def delete_mediation(
    mid: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Mediation).where(Mediation.id == mid, Mediation.tenant_id == current_user.tenant_id))
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(404, "Mediación no encontrada")
    await db.delete(m)
    await db.commit()
    return {"message": "Eliminada"}
