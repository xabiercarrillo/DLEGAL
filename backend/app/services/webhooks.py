"""
XLegal — Webhooks Outbound y Tiempo Real

Outbound: dispara eventos a Zapier, Make (Integromat), n8n
Pusher: notificaciones en tiempo real al frontend (sin polling)

Eventos disponibles:
  case.created | case.updated | case.closed
  client.created
  payment.received | payment.failed
  document.signed | document.uploaded
  hearing.scheduled | deadline.due_soon
  invoice.created | invoice.paid
"""
import httpx, hmac, hashlib, json
from datetime import datetime, timezone
from app.core.config import settings

# Catálogo de eventos disponibles para suscripción
AVAILABLE_EVENTS = [
    "case.created", "case.updated", "case.closed", "case.archived",
    "client.created", "client.updated",
    "payment.received", "payment.failed", "payment.refunded",
    "document.signed", "document.uploaded", "document.deleted",
    "invoice.created", "invoice.paid", "invoice.overdue",
    "hearing.scheduled", "hearing.completed",
    "deadline.created", "deadline.due_soon", "deadline.completed",
    "task.completed",
    "esign.sent", "esign.signed", "esign.completed",
]


async def dispatch_event(
    tenant_id: str,
    event: str,
    payload: dict,
    db=None,
) -> list:
    """
    Dispara un evento a todos los webhooks activos del tenant.
    Retorna lista de resultados de envío.
    """
    if not db:
        return []

    from sqlalchemy import select
    from app.models.integration import OutboundWebhook

    q = select(OutboundWebhook).where(
        OutboundWebhook.tenant_id == tenant_id,
        OutboundWebhook.is_active == True,
    )
    result = await db.execute(q)
    webhooks = result.scalars().all()

    results = []
    for wh in webhooks:
        # Check if this webhook subscribes to this event
        try:
            subscribed = json.loads(wh.events or "[]")
        except Exception:
            subscribed = []

        if event not in subscribed and "*" not in subscribed:
            continue

        result = await _send_webhook(wh, event, payload)
        results.append(result)

        # Update last triggered
        wh.last_triggered_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        if not result["success"]:
            wh.failure_count = (wh.failure_count or 0) + 1
        else:
            wh.failure_count = 0

    if db and results:
        await db.commit()

    return results


async def _send_webhook(webhook, event: str, payload: dict) -> dict:
    """Envía un webhook con firma HMAC para verificación."""
    body = {
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": payload,
        "source": "xlegal",
    }
    body_str = json.dumps(body, ensure_ascii=False)

    headers = {
        "Content-Type": "application/json",
        "X-XLegal-Event": event,
        "X-XLegal-Timestamp": body["timestamp"],
        "User-Agent": "XLegal-Webhook/2.0",
    }

    # HMAC signature for verification
    if webhook.secret:
        sig = hmac.new(
            webhook.secret.encode(),
            body_str.encode(),
            hashlib.sha256,
        ).hexdigest()
        headers["X-XLegal-Signature"] = f"sha256={sig}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(webhook.url, content=body_str, headers=headers)
            return {
                "success": r.status_code < 400,
                "status_code": r.status_code,
                "webhook_id": webhook.id,
                "url": webhook.url,
            }
    except Exception as e:
        return {"success": False, "error": str(e), "webhook_id": webhook.id, "url": webhook.url}


# ═══════════════════════════════════════════════
#  PUSHER — Tiempo Real
# ═══════════════════════════════════════════════
class PusherService:
    """
    Pusher Channels — Notificaciones en tiempo real al frontend.
    Alternativa open-source: Soketi (self-hosted).
    Docs: https://pusher.com/docs/channels
    """

    def _auth_string(self, channel: str, event: str, data: str) -> dict:
        """Genera auth signature para Pusher."""
        import time, hmac, hashlib, base64
        body = json.dumps({"name": event, "channel": channel, "data": data})
        timestamp = str(int(time.time()))
        md5_body = hashlib.md5(body.encode()).hexdigest()
        str_to_sign = "\n".join(["POST", "/apps/" + settings.PUSHER_APP_ID + "/events", f"auth_key={settings.PUSHER_KEY}&auth_timestamp={timestamp}&auth_version=1.0&body_md5={md5_body}"])
        signature = hmac.new(settings.PUSHER_SECRET.encode(), str_to_sign.encode(), hashlib.sha256).hexdigest()
        return {"auth_key": settings.PUSHER_KEY, "auth_timestamp": timestamp, "auth_version": "1.0",
                "body_md5": md5_body, "auth_signature": signature}

    async def trigger(self, channel: str, event: str, data: dict) -> bool:
        """
        Dispara evento en tiempo real al frontend.
        channel: "private-tenant-{tenant_id}"
        event: "deadline.due_soon" | "payment.received" | etc.
        """
        if not settings.PUSHER_APP_ID:
            return False  # Pusher no configurado
        try:
            data_str = json.dumps(data, ensure_ascii=False)
            payload = {"name": event, "channel": channel, "data": data_str}
            auth = self._auth_string(channel, event, data_str)

            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.post(
                    f"https://api-{settings.PUSHER_CLUSTER}.pusher.com/apps/{settings.PUSHER_APP_ID}/events",
                    json=payload,
                    params=auth,
                )
                return r.status_code == 200
        except Exception:
            return False

    async def notify_tenant(self, tenant_id: str, event: str, data: dict) -> bool:
        """Helper: notifica a todos los usuarios de un tenant."""
        return await self.trigger(f"private-tenant-{tenant_id}", event, data)


pusher = PusherService()
