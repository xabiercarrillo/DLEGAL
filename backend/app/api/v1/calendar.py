from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.hearing import Hearing
from app.models.deadline import Deadline
from app.models.appointment import Appointment

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/events")
async def get_calendar_events(
    start: str = Query(...),
    end: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate all events for calendar view: hearings + deadlines + appointments."""
    tid = current_user.tenant_id
    events = []

    # ── Audiencias ───────────────────────────────────────────────────────
    h_res = await db.execute(
        select(Hearing).where(
            Hearing.tenant_id == tid,
            Hearing.scheduled_at >= start,
            Hearing.scheduled_at <= end,
        ).order_by(Hearing.scheduled_at)
    )
    for h in h_res.scalars().all():
        events.append({
            "id": h.id,
            "type": "hearing",
            "title": f"Audiencia: {h.type}",
            "date": h.scheduled_at,
            "scheduled_at": h.scheduled_at,
            "location": h.court,
            "status": h.status,
            "color": "#8b5cf6",
        })

    # ── Plazos vencidos / pendientes ─────────────────────────────────────
    d_res = await db.execute(
        select(Deadline).where(
            Deadline.tenant_id == tid,
            Deadline.due_date >= start[:10],
            Deadline.due_date <= end[:10],
            Deadline.is_completed == False,
        ).order_by(Deadline.due_date)
    )
    for d in d_res.scalars().all():
        events.append({
            "id": d.id,
            "type": "deadline",
            "title": d.title,
            "date": d.due_date,
            "scheduled_at": d.due_date,
            "location": None,
            "status": "pendiente",
            "priority": d.priority,
            "color": "#ef4444",
        })

    # ── Citas ────────────────────────────────────────────────────────────
    a_res = await db.execute(
        select(Appointment).where(
            Appointment.tenant_id == tid,
            Appointment.scheduled_at >= start,
            Appointment.scheduled_at <= end,
        ).order_by(Appointment.scheduled_at)
    )
    for a in a_res.scalars().all():
        events.append({
            "id": a.id,
            "type": "appointment",
            "title": a.title or f"Cita: {a.type}",
            "date": a.scheduled_at,
            "scheduled_at": a.scheduled_at,
            "location": a.location,
            "status": a.status,
            "color": "#3b82f6",
        })

    events.sort(key=lambda x: x.get("date") or "")
    return {"events": events, "total": len(events)}
