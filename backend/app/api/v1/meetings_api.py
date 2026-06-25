"""
XLegal — API de Reuniones Virtuales
POST /meetings/zoom          → Crea reunión Zoom
GET  /meetings/zoom/{id}     → Info reunión
DELETE /meetings/zoom/{id}   → Cancela reunión
POST /meetings/google-meet   → Crea evento con Google Meet
GET  /meetings/calendly/slots → Slots disponibles (Calendly)
GET  /meetings/calendly/events → Citas agendadas (Calendly)
"""
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.integration import TenantIntegration
from app.services.calendar_sync import google_calendar, zoom, calendly

router = APIRouter(prefix="/meetings", tags=["meetings"])


class ZoomMeetingCreate(BaseModel):
    topic: str
    start_time: str          # "2024-03-15T10:00:00"
    duration_minutes: int = 60
    agenda: str = ""
    hearing_id: Optional[str] = None


class GoogleMeetCreate(BaseModel):
    title: str
    start_dt: str            # ISO 8601 con zona: "2024-03-15T10:00:00-04:00"
    end_dt: str
    description: str = ""
    location: str = ""
    attendees: List[str] = []  # emails
    calendar_id: str = "primary"


async def _get_int(db, tenant_id: str, provider: str) -> TenantIntegration | None:
    r = await db.execute(select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == provider,
        TenantIntegration.is_enabled == True,
    ))
    return r.scalar_one_or_none()


@router.post("/zoom")
async def create_zoom_meeting(
    data: ZoomMeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea reunión Zoom y retorna join_url para compartir con el cliente."""
    integration = await _get_int(db, current_user.tenant_id, "zoom")
    cfg = integration.config or {} if integration else {}

    result = await zoom.create_meeting(
        topic=data.topic,
        start_time=data.start_time,
        duration_minutes=data.duration_minutes,
        agenda=data.agenda,
        account_id=cfg.get("account_id"),
        client_id=cfg.get("client_id"),
        client_secret=cfg.get("client_secret"),
    )
    if not result.get("success"):
        raise HTTPException(400, result.get("error",
            "Zoom no configurado. Ir a Integraciones → Reuniones → Zoom."))

    # If linked to hearing, save zoom info
    if data.hearing_id:
        from app.models.hearing import Hearing
        r = await db.execute(select(Hearing).where(
            Hearing.id == data.hearing_id,
            Hearing.tenant_id == current_user.tenant_id,
        ))
        h = r.scalar_one_or_none()
        if h:
            h.google_event_id = f"zoom:{result['meeting_id']}"
            await db.commit()

    return {
        "meeting_id": result["meeting_id"],
        "join_url": result["join_url"],
        "start_url": result["start_url"],
        "password": result.get("password"),
        "provider": "zoom",
        "message": "Comparte 'join_url' con tu cliente para que se una a la reunión",
    }


@router.delete("/zoom/{meeting_id}")
async def cancel_zoom_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancela una reunión Zoom."""
    integration = await _get_int(db, current_user.tenant_id, "zoom")
    cfg = integration.config or {} if integration else {}
    ok = await zoom.delete_meeting(meeting_id, account_id=cfg.get("account_id"),
                                   client_id=cfg.get("client_id"), client_secret=cfg.get("client_secret"))
    if not ok:
        raise HTTPException(400, "No se pudo cancelar la reunión")
    return {"message": "Reunión Zoom cancelada"}


@router.post("/google-meet")
async def create_google_meet(
    data: GoogleMeetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea evento en Google Calendar con link de Google Meet integrado."""
    integration = await _get_int(db, current_user.tenant_id, "google_calendar")
    if not integration or not integration.access_token:
        raise HTTPException(400,
            "Google Calendar no conectado. Ir a Integraciones → Calendario → Google Calendar → Conectar.")

    # Refresh token if needed
    if integration.refresh_token:
        refresh = await google_calendar.refresh_token(integration.refresh_token)
        if refresh.get("access_token"):
            integration.access_token = refresh["access_token"]
            await db.commit()

    attendees_list = [{"email": e} for e in data.attendees]
    result = await google_calendar.create_event(
        access_token=integration.access_token,
        title=data.title,
        start_dt=data.start_dt,
        end_dt=data.end_dt,
        description=data.description,
        location=data.location,
        attendees=attendees_list or None,
        calendar_id=data.calendar_id,
        meet_link=True,
    )

    if not result.get("success"):
        raise HTTPException(400, result.get("error", "Error al crear evento con Google Meet"))

    return {
        "event_id": result["event_id"],
        "meet_url": result.get("meet_url"),
        "html_link": result.get("html_link"),
        "provider": "google_meet",
        "message": "Evento creado. Comparte 'meet_url' con tu cliente.",
    }


@router.get("/google-calendar/events")
async def list_calendar_events(
    days_ahead: int = Query(30, description="Próximos N días"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista eventos del Google Calendar conectado."""
    integration = await _get_int(db, current_user.tenant_id, "google_calendar")
    if not integration or not integration.access_token:
        return {"events": [], "message": "Google Calendar no conectado"}

    from datetime import timezone
    now = datetime.now(timezone.utc)
    time_min = now.isoformat()
    time_max = (now + timedelta(days=days_ahead)).isoformat()

    result = await google_calendar.list_events(
        integration.access_token, time_min=time_min, time_max=time_max
    )
    return {"events": result.get("events", []), "total": len(result.get("events", []))}


@router.get("/calendly/event-types")
async def calendly_event_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista tipos de eventos configurados en Calendly (consultas, audiencias, etc.)."""
    integration = await _get_int(db, current_user.tenant_id, "calendly")
    if not integration or not integration.access_token:
        return {"event_types": [], "message": "Calendly no conectado. Ir a Integraciones → Reuniones → Calendly."}

    user = await calendly.get_user(integration.access_token)
    if not user:
        return {"event_types": [], "message": "Error al obtener usuario Calendly"}

    types = await calendly.get_event_types(user.get("uri", ""), integration.access_token)
    return {
        "event_types": [{"name": t.get("name"), "slug": t.get("slug"),
                          "booking_url": t.get("scheduling_url"),
                          "duration_minutes": t.get("duration")} for t in types]
    }


@router.get("/calendly/scheduled")
async def calendly_scheduled_events(
    days_ahead: int = Query(30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista citas agendadas vía Calendly."""
    integration = await _get_int(db, current_user.tenant_id, "calendly")
    if not integration or not integration.access_token:
        return {"events": [], "message": "Calendly no conectado"}

    user = await calendly.get_user(integration.access_token)
    from datetime import timezone
    now = datetime.now(timezone.utc)
    events = await calendly.get_scheduled_events(
        user.get("uri", ""), integration.access_token,
        min_start=now.isoformat(),
        max_start=(now + timedelta(days=days_ahead)).isoformat(),
    )
    return {"events": events, "total": len(events)}
