from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.hearing import Hearing
import uuid

router = APIRouter(prefix="/hearings", tags=["hearings"])

class HearingCreate(BaseModel):
    case_id: str
    title: str
    scheduled_at: str
    type: str = "ordinaria"
    duration_minutes: int = 60
    court: Optional[str] = None
    room: Optional[str] = None
    notes: Optional[str] = None

class HearingUpdate(BaseModel):
    title: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    court: Optional[str] = None
    room: Optional[str] = None
    notes: Optional[str] = None
    result: Optional[str] = None

def hearing_to_dict(h: Hearing) -> dict:
    return {
        "id": h.id, "case_id": h.case_id, "lawyer_id": h.lawyer_id,
        "type": h.type, "status": h.status, "title": h.title,
        "scheduled_at": h.scheduled_at, "duration_minutes": h.duration_minutes,
        "court": h.court, "room": h.room, "notes": h.notes, "result": h.result,
        "created_at": h.created_at.isoformat() if h.created_at else None,
    }

@router.get("")
async def list_hearings(
    case_id: Optional[str] = None, status: Optional[str] = None,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    q = select(Hearing).where(Hearing.tenant_id == current_user.tenant_id)
    if case_id: q = q.where(Hearing.case_id == case_id)
    if status: q = q.where(Hearing.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Hearing.scheduled_at.desc()).offset((page-1)*limit).limit(limit))
    return {"items": [hearing_to_dict(h) for h in result.scalars().all()], "total": total, "page": page, "pages": max(1,(total+limit-1)//limit)}

@router.post("", status_code=201)
async def create_hearing(data: HearingCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    h = Hearing(id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, lawyer_id=current_user.id, **data.model_dump())
    db.add(h)
    await db.commit()
    return {"id": h.id, "message": "Audiencia creada"}

@router.put("/{hearing_id}")
async def update_hearing(hearing_id: str, data: HearingUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Hearing).where(Hearing.id == hearing_id, Hearing.tenant_id == current_user.tenant_id))
    h = result.scalar_one_or_none()
    if not h: raise HTTPException(404, "Audiencia no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(h, k, v)
    await db.commit()
    return {"message": "Actualizado"}

@router.delete("/{hearing_id}")
async def delete_hearing(hearing_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Hearing).where(Hearing.id == hearing_id, Hearing.tenant_id == current_user.tenant_id))
    h = result.scalar_one_or_none()
    if not h: raise HTTPException(404, "Audiencia no encontrada")
    await db.delete(h)
    await db.commit()
    return {"message": "Eliminada"}
