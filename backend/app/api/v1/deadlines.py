from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.deadline import Deadline
import uuid

router = APIRouter(prefix="/deadlines", tags=["deadlines"])

class DeadlineCreate(BaseModel):
    title: str
    due_date: str
    case_id: Optional[str] = None
    type: str = "procesal"
    priority: str = "medium"
    description: Optional[str] = None
    legal_basis: Optional[str] = None

class DeadlineUpdate(BaseModel):
    title: Optional[str] = None
    case_id: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None
    legal_basis: Optional[str] = None

def _clean_fks(payload: dict, *fields: str) -> dict:
    for f in fields:
        if payload.get(f) == "":
            payload[f] = None
    return payload

def deadline_to_dict(d: Deadline) -> dict:
    return {
        "id": d.id, "case_id": d.case_id, "lawyer_id": d.lawyer_id,
        "title": d.title, "description": d.description, "type": d.type,
        "priority": d.priority, "due_date": d.due_date,
        "legal_basis": d.legal_basis,
        "is_completed": d.is_completed, "completed_at": d.completed_at,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }

@router.get("")
async def list_deadlines(
    is_completed: Optional[bool] = None, case_id: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    q = select(Deadline).where(Deadline.tenant_id == current_user.tenant_id)
    if is_completed is not None: q = q.where(Deadline.is_completed == is_completed)
    if case_id: q = q.where(Deadline.case_id == case_id)
    if priority: q = q.where(Deadline.priority == priority)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Deadline.due_date).offset((page-1)*limit).limit(limit))
    return {"items": [deadline_to_dict(d) for d in result.scalars().all()], "total": total}

@router.post("", status_code=201)
async def create_deadline(data: DeadlineCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = Deadline(id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, lawyer_id=current_user.id, **_clean_fks(data.model_dump(), "case_id"))
    db.add(d)
    await db.commit()
    return {"id": d.id, "message": "Plazo creado"}

@router.post("/{deadline_id}/complete")
async def complete_deadline(deadline_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Deadline).where(Deadline.id == deadline_id, Deadline.tenant_id == current_user.tenant_id))
    d = result.scalar_one_or_none()
    if not d: raise HTTPException(404, "Plazo no encontrado")
    d.is_completed = True
    d.completed_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    return {"message": "Plazo completado"}

@router.put("/{deadline_id}")
async def update_deadline(deadline_id: str, data: DeadlineUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Deadline).where(Deadline.id == deadline_id, Deadline.tenant_id == current_user.tenant_id))
    d = result.scalar_one_or_none()
    if not d: raise HTTPException(404, "Plazo no encontrado")
    for k, v in _clean_fks(data.model_dump(exclude_none=True), "case_id").items(): setattr(d, k, v)
    await db.commit()
    return {"message": "Actualizado"}

@router.delete("/{deadline_id}")
async def delete_deadline(deadline_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Deadline).where(Deadline.id == deadline_id, Deadline.tenant_id == current_user.tenant_id))
    d = result.scalar_one_or_none()
    if not d: raise HTTPException(404, "Plazo no encontrado")
    await db.delete(d)
    await db.commit()
    return {"message": "Eliminado"}
