"""
XLegal — Calendario y Reuniones Virtuales
Google Calendar: sync de audiencias
Zoom: videollamadas con clientes
Google Meet: alternativa sin costo
Calendly: reserva de consultas online
"""
import httpx, uuid
from datetime import datetime, timedelta
from app.core.config import settings


# ═══════════════════════════════════════════════
#  GOOGLE CALENDAR
# ═══════════════════════════════════════════════
class GoogleCalendarService:
    """
    Google Calendar API v3.
    Requiere OAuth 2.0 — el tenant autoriza acceso a su calendario.
    Docs: https://developers.google.com/calendar/api/v3
    """
    BASE = "https://www.googleapis.com/calendar/v3"

    async def create_event(
        self,
        access_token: str,
        title: str,
        start_dt: str,        # ISO 8601: "2024-03-15T10:00:00-04:00"
        end_dt: str,
        description: str = "",
        location: str = "",
        attendees: list = None,   # [{"email": "..."}]
        calendar_id: str = "primary",
        meet_link: bool = False,
    ) -> dict:
        """Crea evento en Google Calendar con optional Google Meet."""
        event = {
            "summary": title,
            "description": description,
            "location": location,
            "start": {"dateTime": start_dt, "timeZone": "America/Asuncion"},
            "end": {"dateTime": end_dt, "timeZone": "America/Asuncion"},
            "reminders": {"useDefault": False, "overrides": [{"method": "popup", "minutes": 60}, {"method": "email", "minutes": 1440}]},
        }
        if attendees:
            event["attendees"] = attendees
        if meet_link:
            event["conferenceData"] = {"createRequest": {"requestId": str(uuid.uuid4()), "conferenceSolutionKey": {"type": "hangoutsMeet"}}}

        params = {"conferenceDataVersion": "1"} if meet_link else {}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    f"{self.BASE}/calendars/{calendar_id}/events",
                    json=event,
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if r.status_code in (200, 201):
                    data = r.json()
                    meet_url = None
                    if meet_link:
                        meet_url = data.get("conferenceData", {}).get("entryPoints", [{}])[0].get("uri")
                    return {
                        "success": True,
                        "event_id": data["id"],
                        "html_link": data.get("htmlLink"),
                        "meet_url": meet_url,
                        "provider": "google_calendar",
                    }
                return {"success": False, "error": f"Google Calendar {r.status_code}: {r.text[:200]}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def list_events(self, access_token: str, time_min: str = None, time_max: str = None,
                          calendar_id: str = "primary") -> dict:
        params = {"singleEvents": "true", "orderBy": "startTime", "maxResults": 50}
        if time_min:
            params["timeMin"] = time_min
        if time_max:
            params["timeMax"] = time_max
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"{self.BASE}/calendars/{calendar_id}/events",
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                return {"success": True, "events": r.json().get("items", [])}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def delete_event(self, access_token: str, event_id: str, calendar_id: str = "primary") -> bool:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.delete(
                    f"{self.BASE}/calendars/{calendar_id}/events/{event_id}",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                return r.status_code in (200, 204)
        except Exception:
            return False

    def get_oauth_url(self, state: str = "") -> str:
        """URL de autorización OAuth para que el usuario conecte su Google Calendar."""
        return (
            "https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id={settings.GOOGLE_CLIENT_ID}"
            f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
            "&response_type=code"
            "&scope=https://www.googleapis.com/auth/calendar"
            "&access_type=offline"
            "&prompt=consent"
            f"&state={state}"
        )

    async def exchange_code(self, code: str) -> dict:
        """Intercambia código OAuth por tokens."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                        "grant_type": "authorization_code",
                        "code": code,
                    },
                )
                data = r.json()
                if "access_token" in data:
                    return {"success": True, **data}
                return {"success": False, "error": data.get("error_description", str(data))}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def refresh_token(self, refresh_token: str) -> dict:
        """Renueva el access_token usando refresh_token."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    },
                )
                data = r.json()
                return {"success": "access_token" in data, **data}
        except Exception as e:
            return {"success": False, "error": str(e)}


# ═══════════════════════════════════════════════
#  ZOOM
# ═══════════════════════════════════════════════
class ZoomService:
    """
    Zoom API — Videollamadas para audiencias virtuales.
    Usa Server-to-Server OAuth (más simple que JWT).
    Docs: https://developers.zoom.us/docs/api
    """
    async def _get_token(self, account_id: str = None, client_id: str = None, client_secret: str = None) -> str:
        acc = account_id or settings.ZOOM_ACCOUNT_ID
        cid = client_id or settings.ZOOM_CLIENT_ID
        csec = client_secret or settings.ZOOM_CLIENT_SECRET
        import base64
        creds = base64.b64encode(f"{cid}:{csec}".encode()).decode()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(
                    f"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={acc}",
                    headers={"Authorization": f"Basic {creds}"},
                )
                return r.json().get("access_token", "")
        except Exception:
            return ""

    async def create_meeting(
        self,
        topic: str,
        start_time: str,  # "2024-03-15T10:00:00"
        duration_minutes: int = 60,
        agenda: str = "",
        account_id: str = None,
        client_id: str = None,
        client_secret: str = None,
    ) -> dict:
        """Crea reunión Zoom y retorna join_url."""
        token = await self._get_token(account_id, client_id, client_secret)
        if not token:
            return {"success": False, "error": "Zoom: no se pudo obtener token. Verificar credenciales."}

        payload = {
            "topic": topic,
            "type": 2,  # Scheduled meeting
            "start_time": start_time,
            "duration": duration_minutes,
            "timezone": "America/Asuncion",
            "agenda": agenda,
            "settings": {
                "host_video": True,
                "participant_video": True,
                "waiting_room": True,
                "auto_recording": "none",
            },
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    "https://api.zoom.us/v2/users/me/meetings",
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = r.json()
                if data.get("id"):
                    return {
                        "success": True,
                        "meeting_id": str(data["id"]),
                        "join_url": data["join_url"],
                        "start_url": data["start_url"],
                        "password": data.get("password", ""),
                        "provider": "zoom",
                    }
                return {"success": False, "error": str(data)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def delete_meeting(self, meeting_id: str, account_id: str = None,
                             client_id: str = None, client_secret: str = None) -> bool:
        token = await self._get_token(account_id, client_id, client_secret)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.delete(f"https://api.zoom.us/v2/meetings/{meeting_id}",
                                        headers={"Authorization": f"Bearer {token}"})
                return r.status_code in (200, 204)
        except Exception:
            return False


# ═══════════════════════════════════════════════
#  CALENDLY
# ═══════════════════════════════════════════════
class CalendlyService:
    """
    Calendly API — Reserva de consultas online.
    Genera links de reserva para que clientes agenden citas.
    Docs: https://developer.calendly.com
    """
    BASE = "https://api.calendly.com"

    async def get_user(self, access_token: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(f"{self.BASE}/users/me",
                                     headers={"Authorization": f"Bearer {access_token}"})
                return r.json().get("resource", {})
        except Exception:
            return {}

    async def get_event_types(self, user_uri: str, access_token: str) -> list:
        """Lista los tipos de eventos configurados en Calendly."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(f"{self.BASE}/event_types",
                                     params={"user": user_uri},
                                     headers={"Authorization": f"Bearer {access_token}"})
                return r.json().get("collection", [])
        except Exception:
            return []

    async def get_scheduled_events(self, user_uri: str, access_token: str,
                                   min_start: str = None, max_start: str = None) -> list:
        """Lista citas reservadas vía Calendly."""
        params = {"user": user_uri, "status": "active"}
        if min_start:
            params["min_start_time"] = min_start
        if max_start:
            params["max_start_time"] = max_start
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(f"{self.BASE}/scheduled_events",
                                     params=params,
                                     headers={"Authorization": f"Bearer {access_token}"})
                return r.json().get("collection", [])
        except Exception:
            return []


google_calendar = GoogleCalendarService()
zoom = ZoomService()
calendly = CalendlyService()
