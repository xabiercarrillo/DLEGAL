from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_tenant_id
from app.models.user import User
from app.models.appointment import Appointment
import uuid

router = APIRouter(prefix="/appointments", tags=["appointments"])


class AppointmentCreate(BaseModel):
    title: str
    scheduled_at: str
    client_id: Optional[str] = None
    case_id: Optional[str] = None
    type: str = "presencial"
    status: str = "scheduled"
    duration_minutes: int = 60
    location: Optional[str] = None
    fee: Optional[float] = None
    notes: Optional[str] = None


def _clean_fks(payload: dict, *fields: str) -> dict:
    for f in fields:
        if payload.get(f) == "":
            payload[f] = None
    return payload


class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    fee: Optional[float] = None
    is_paid: Optional[bool] = None
    notes: Optional[str] = None


def appt_to_dict(a: Appointment) -> dict:
    return {
        "id": a.id, "title": a.title, "scheduled_at": a.scheduled_at,
        "type": a.type, "status": a.status, "duration_minutes": a.duration_minutes,
        "location": a.location, "fee": a.fee, "is_paid": a.is_paid,
        "client_id": a.client_id, "case_id": a.case_id,
        "client_name": (a.client.full_name if a.client else None),
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("")
async def list_appointments(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Appointment).options(selectinload(Appointment.client)).where(Appointment.tenant_id == current_user.tenant_id)
    if status:
        q = q.where(Appointment.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(
        q.order_by(Appointment.scheduled_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    return {"items": [appt_to_dict(a) for a in result.scalars().all()], "total": total}


@router.post("", status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant_id = require_tenant_id(current_user)
    a = Appointment(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        lawyer_id=current_user.id,
        **_clean_fks(data.model_dump(), "client_id", "case_id"),
    )
    db.add(a)
    await db.commit()
    return {"id": a.id, "message": "Cita creada"}


@router.put("/{appt_id}")
async def update_appointment(
    appt_id: str,
    data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appt_id, Appointment.tenant_id == current_user.tenant_id)
    )
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Cita no encontrada")
    for k, v in _clean_fks(data.model_dump(exclude_none=True), "client_id", "case_id").items():
        setattr(a, k, v)
    await db.commit()
    return {"message": "Cita actualizada"}


@router.delete("/{appt_id}")
async def delete_appointment(
    appt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appt_id, Appointment.tenant_id == current_user.tenant_id)
    )
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Cita no encontrada")
    await db.delete(a)
    await db.commit()
    return {"message": "Cita eliminada"}
