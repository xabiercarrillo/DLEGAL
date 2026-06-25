"""
XLegal — API de Integraciones
CRUD para configurar integraciones por tenant.
Las keys se guardan en DB (cifrado en producción con Fernet).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_firm_admin
from app.models.user import User
from app.models.integration import TenantIntegration, OutboundWebhook
from app.services.webhooks import AVAILABLE_EVENTS
import uuid, json

router = APIRouter(prefix="/integrations", tags=["integrations"])

SUPPORTED_PROVIDERS = {
    # Pagos
    "bancard":        {"category": "payments",      "name": "Bancard",          "fields": ["private_key","public_key","base_url"], "flag": "🇵🇾"},
    "mercadopago":    {"category": "payments",      "name": "Mercado Pago",     "fields": ["access_token"],                          "flag": "🌎"},
    "stripe":         {"category": "payments",      "name": "Stripe",           "fields": ["secret_key","publishable_key","webhook_secret"], "flag": "🌎"},
    "paypal":         {"category": "payments",      "name": "PayPal",           "fields": ["client_id","client_secret"],              "flag": "🌎"},
    # Firma electrónica
    "pandadoc":       {"category": "esign",         "name": "PandaDoc",         "fields": ["api_key"],                               "flag": "✍️"},
    "docusign":       {"category": "esign",         "name": "DocuSign",         "fields": ["integration_key","account_id","user_id"], "flag": "✍️"},
    "signnow":        {"category": "esign",         "name": "SignNow",          "fields": ["client_id","client_secret"],              "flag": "✍️"},
    # Comunicación
    "twilio":         {"category": "messaging",     "name": "Twilio WhatsApp",  "fields": ["account_sid","auth_token","whatsapp_number","sms_number"], "flag": "💬"},
    "vonage":         {"category": "messaging",     "name": "Vonage SMS",       "fields": ["api_key","api_secret"],                  "flag": "💬"},
    "sendgrid":       {"category": "email",         "name": "SendGrid",         "fields": ["api_key"],                               "flag": "📧"},
    "mailgun":        {"category": "email",         "name": "Mailgun",          "fields": ["api_key","domain"],                      "flag": "📧"},
    "pusher":         {"category": "realtime",      "name": "Pusher",           "fields": ["app_id","key","secret","cluster"],       "flag": "⚡"},
    # IA
    "openai":         {"category": "ai",            "name": "OpenAI",           "fields": ["api_key","model"],                       "flag": "🤖"},
    "anthropic":      {"category": "ai",            "name": "Anthropic Claude", "fields": ["api_key"],                               "flag": "🤖"},
    "cohere":         {"category": "ai",            "name": "Cohere",           "fields": ["api_key"],                               "flag": "🤖"},
    # Almacenamiento
    "s3":             {"category": "storage",       "name": "AWS S3",           "fields": ["access_key_id","secret_access_key","bucket","region"], "flag": "☁️"},
    "r2":             {"category": "storage",       "name": "Cloudflare R2",    "fields": ["account_id","access_key","secret_key","bucket"], "flag": "☁️"},
    "gcs":            {"category": "storage",       "name": "Google Cloud Storage","fields": ["bucket","credentials_json"],          "flag": "☁️"},
    # Calendario y Reuniones
    "google_calendar":{"category": "calendar",      "name": "Google Calendar",  "fields": ["client_id","client_secret","redirect_uri"],"flag": "📅"},
    "zoom":           {"category": "meetings",      "name": "Zoom",             "fields": ["account_id","client_id","client_secret"], "flag": "📹"},
    "calendly":       {"category": "meetings",      "name": "Calendly",         "fields": ["access_token"],                          "flag": "📅"},
    # PDF
    "docraptor":      {"category": "pdf",           "name": "DocRaptor",        "fields": ["api_key"],                               "flag": "📄"},
    "pdfshift":       {"category": "pdf",           "name": "PDFShift",         "fields": ["api_key"],                               "flag": "📄"},
    "cloudconvert":   {"category": "pdf",           "name": "CloudConvert",     "fields": ["api_key"],                               "flag": "📄"},
    # Mapas
    "google_maps":    {"category": "maps",          "name": "Google Maps",      "fields": ["api_key"],                               "flag": "🗺️"},
    "mapbox":         {"category": "maps",          "name": "Mapbox",           "fields": ["token"],                                 "flag": "🗺️"},
}


class IntegrationUpsert(BaseModel):
    provider: str
    is_enabled: bool = True
    config: dict = {}
    notes: Optional[str] = None


class WebhookCreate(BaseModel):
    name: str
    url: str
    events: list
    secret: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────
def _mask_config(config: dict) -> dict:
    """Oculta valores sensibles para mostrar al frontend."""
    masked = {}
    for k, v in config.items():
        if isinstance(v, str) and len(v) > 6 and any(s in k.lower() for s in ("key","secret","token","password","sid")):
            masked[k] = v[:4] + "****" + v[-2:]
        else:
            masked[k] = v
    return masked


async def _get_integration(db, tenant_id: str, provider: str) -> TenantIntegration | None:
    result = await db.execute(
        select(TenantIntegration).where(
            TenantIntegration.tenant_id == tenant_id,
            TenantIntegration.provider == provider,
        )
    )
    return result.scalar_one_or_none()


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.get("/providers")
async def list_providers():
    """Lista todos los proveedores soportados con metadata."""
    return {
        "providers": {
            k: {**v, "provider": k}
            for k, v in SUPPORTED_PROVIDERS.items()
        },
        "available_events": AVAILABLE_EVENTS,
    }


@router.get("")
async def list_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista integraciones configuradas del tenant."""
    result = await db.execute(
        select(TenantIntegration).where(TenantIntegration.tenant_id == current_user.tenant_id)
    )
    integrations = result.scalars().all()
    return {
        "items": [
            {
                "id": i.id,
                "provider": i.provider,
                "is_enabled": i.is_enabled,
                "config": _mask_config(i.config or {}),
                "notes": i.notes,
                "has_oauth": bool(i.access_token),
                "category": SUPPORTED_PROVIDERS.get(i.provider, {}).get("category"),
                "name": SUPPORTED_PROVIDERS.get(i.provider, {}).get("name", i.provider),
                "updated_at": i.updated_at.isoformat() if i.updated_at else None,
            }
            for i in integrations
        ]
    }


@router.put("/{provider}")
async def upsert_integration(
    provider: str,
    data: IntegrationUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    """Crea o actualiza una integración del tenant."""
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(400, f"Proveedor no soportado: {provider}. Disponibles: {list(SUPPORTED_PROVIDERS)}")

    existing = await _get_integration(db, current_user.tenant_id, provider)
    if existing:
        existing.is_enabled = data.is_enabled
        # Merge config: only update non-empty values (preserve masked fields)
        new_cfg = {k: v for k, v in data.config.items() if v and "****" not in str(v)}
        existing.config = {**(existing.config or {}), **new_cfg}
        existing.notes = data.notes
    else:
        integration = TenantIntegration(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            provider=provider,
            is_enabled=data.is_enabled,
            config=data.config,
            notes=data.notes,
        )
        db.add(integration)

    await db.commit()
    return {"message": f"Integración {SUPPORTED_PROVIDERS[provider]['name']} guardada", "provider": provider}


@router.delete("/{provider}")
async def delete_integration(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    """Elimina configuración de una integración."""
    existing = await _get_integration(db, current_user.tenant_id, provider)
    if not existing:
        raise HTTPException(404, "Integración no encontrada")
    await db.delete(existing)
    await db.commit()
    return {"message": f"Integración {provider} eliminada"}


@router.post("/{provider}/test")
async def test_integration(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    """Prueba que las credenciales de una integración sean válidas."""
    integration = await _get_integration(db, current_user.tenant_id, provider)
    if not integration or not integration.is_enabled:
        raise HTTPException(404, "Integración no configurada o deshabilitada")

    cfg = integration.config or {}
    result = {"provider": provider, "success": False, "message": "Prueba no implementada para este proveedor"}

    if provider == "pandadoc":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get("https://api.pandadoc.com/public/v1/documents?count=1",
                                     headers={"Authorization": f"API-Key {cfg.get('api_key','')}"})
                result = {"success": r.status_code in (200,201), "message": "PandaDoc conectado" if r.status_code in (200,201) else f"Error {r.status_code}"}
        except Exception as e:
            result = {"success": False, "message": str(e)}

    elif provider == "stripe":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get("https://api.stripe.com/v1/account", auth=(cfg.get("secret_key",""), ""))
                result = {"success": r.status_code == 200, "message": "Stripe conectado" if r.status_code == 200 else f"Error {r.status_code}"}
        except Exception as e:
            result = {"success": False, "message": str(e)}

    elif provider == "openai":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get("https://api.openai.com/v1/models",
                                     headers={"Authorization": f"Bearer {cfg.get('api_key','')}"})
                result = {"success": r.status_code == 200, "message": "OpenAI conectado" if r.status_code == 200 else f"Error {r.status_code}"}
        except Exception as e:
            result = {"success": False, "message": str(e)}

    elif provider == "google_maps":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get("https://maps.googleapis.com/maps/api/geocode/json",
                                     params={"address": "Asuncion Paraguay", "key": cfg.get("api_key","")})
                ok = r.json().get("status") == "OK"
                result = {"success": ok, "message": "Google Maps conectado" if ok else r.json().get("status","Error")}
        except Exception as e:
            result = {"success": False, "message": str(e)}

    return {"provider": provider, **result}


# ── Webhooks Outbound ──────────────────────────────────────────────────────
@router.get("/webhooks/outbound")
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    result = await db.execute(
        select(OutboundWebhook).where(OutboundWebhook.tenant_id == current_user.tenant_id)
    )
    whs = result.scalars().all()
    return {"items": [{
        "id": w.id, "name": w.name, "url": w.url,
        "events": json.loads(w.events or "[]"),
        "is_active": w.is_active,
        "last_triggered_at": w.last_triggered_at,
        "failure_count": w.failure_count,
    } for w in whs]}


@router.post("/webhooks/outbound")
async def create_webhook(
    data: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    # Validate events
    invalid = [e for e in data.events if e not in AVAILABLE_EVENTS and e != "*"]
    if invalid:
        raise HTTPException(400, f"Eventos inválidos: {invalid}. Disponibles: {AVAILABLE_EVENTS}")

    wh = OutboundWebhook(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        name=data.name,
        url=str(data.url),
        events=json.dumps(data.events),
        secret=data.secret,
        is_active=True,
    )
    db.add(wh)
    await db.commit()
    return {"message": "Webhook creado", "id": wh.id, "available_events": AVAILABLE_EVENTS}


@router.delete("/webhooks/outbound/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    result = await db.execute(
        select(OutboundWebhook).where(
            OutboundWebhook.id == webhook_id,
            OutboundWebhook.tenant_id == current_user.tenant_id,
        )
    )
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(404, "Webhook no encontrado")
    await db.delete(wh)
    await db.commit()
    return {"message": "Webhook eliminado"}


@router.post("/webhooks/outbound/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    """Dispara un evento de prueba al webhook."""
    result = await db.execute(
        select(OutboundWebhook).where(
            OutboundWebhook.id == webhook_id,
            OutboundWebhook.tenant_id == current_user.tenant_id,
        )
    )
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(404, "Webhook no encontrado")

    from app.services.webhooks import _send_webhook
    test_result = await _send_webhook(wh, "test.ping", {
        "message": "Prueba de conexión desde XLegal",
        "tenant_id": current_user.tenant_id,
    })
    return test_result


# ── OAuth flows ────────────────────────────────────────────────────────────
@router.get("/oauth/google-calendar/url")
async def google_calendar_oauth_url(current_user: User = Depends(require_firm_admin)):
    """Genera URL de autorización OAuth para Google Calendar."""
    from app.services.calendar_sync import google_calendar
    url = google_calendar.get_oauth_url(state=current_user.tenant_id)
    return {"url": url, "message": "Redirigir al usuario a esta URL para autorizar acceso al calendario"}


@router.post("/oauth/google-calendar/callback")
async def google_calendar_oauth_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    """Recibe el código OAuth de Google y guarda los tokens."""
    from app.services.calendar_sync import google_calendar
    result = await google_calendar.exchange_code(code)
    if not result.get("success"):
        raise HTTPException(400, result.get("error", "Error OAuth"))

    # Save tokens
    existing = await _get_integration(db, current_user.tenant_id, "google_calendar")
    if not existing:
        existing = TenantIntegration(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            provider="google_calendar",
        )
        db.add(existing)

    existing.is_enabled = True
    existing.access_token = result.get("access_token")
    existing.refresh_token = result.get("refresh_token")
    existing.scope = result.get("scope")
    await db.commit()
    return {"message": "Google Calendar conectado exitosamente"}
