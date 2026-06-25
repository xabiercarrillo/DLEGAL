"""
XLegal — Dispatcher Unificado de Notificaciones
Determina el canal correcto según preferencias del usuario:
  email → Resend (principal) → SendGrid (fallback) → Mailgun (fallback)
  whatsapp → Twilio WhatsApp
  sms → Twilio SMS → Vonage (fallback)
  push → Pusher (tiempo real)
  webhook → dispatch_event()
"""
from app.core.email import (
    send_deadline_reminder, send_hearing_reminder,
    send_invoice_reminder, send_welcome_email
)
from app.services.whatsapp import (
    twilio_wa, msg_deadline_reminder, msg_hearing_reminder,
    msg_payment_received, msg_document_signed, msg_invoice_reminder
)
from app.services.webhooks import pusher, dispatch_event


async def notify_deadline(user_data: dict, deadlines: list, tenant_id: str = None, db=None):
    """Notifica plazos próximos por todos los canales activos del usuario."""
    tasks = []
    if user_data.get("notify_email") and user_data.get("email"):
        dl_data = [{"title": d.get("title"), "due_date": d.get("due_date"), "days_left": d.get("days_left", 0)} for d in deadlines]
        await send_deadline_reminder(user_data["email"], user_data.get("full_name", ""), dl_data)

    if user_data.get("notify_whatsapp") and user_data.get("whatsapp_number"):
        for d in deadlines[:3]:  # Max 3 por WhatsApp
            msg = msg_deadline_reminder(user_data.get("full_name", ""), d.get("title", ""), d.get("days_left", 0))
            await twilio_wa.send_message(user_data["whatsapp_number"], msg)

    if tenant_id:
        await pusher.notify_tenant(tenant_id, "deadline.due_soon", {
            "count": len(deadlines),
            "deadlines": [{"title": d.get("title"), "days_left": d.get("days_left")} for d in deadlines[:5]],
        })

    if db and tenant_id:
        await dispatch_event(tenant_id, "deadline.due_soon", {"user": user_data.get("email"), "count": len(deadlines)}, db)


async def notify_payment_received(client_data: dict, amount: float, currency: str,
                                   firm_name: str, tenant_id: str = None, db=None):
    """Notifica pago recibido al cliente."""
    if client_data.get("email"):
        from app.core.email import send_email, _base_template
        html = f"<h2>✅ Pago recibido</h2><p>Estimado/a {client_data.get('full_name','')}, confirmamos el pago de {'₲ ' + f'{amount:,.0f}' if currency == 'PYG' else f'{currency} {amount:,.2f}'} en {firm_name}.</p>"
        await send_email(client_data["email"], f"✅ Pago confirmado — {firm_name}", _base_template("Pago recibido", html))

    if client_data.get("whatsapp"):
        msg = msg_payment_received(client_data.get("full_name", ""), amount, currency, firm_name)
        await twilio_wa.send_message(client_data["whatsapp"], msg)

    if db and tenant_id:
        await dispatch_event(tenant_id, "payment.received", {
            "client": client_data.get("full_name"), "amount": amount, "currency": currency,
        }, db)

    if tenant_id:
        await pusher.notify_tenant(tenant_id, "payment.received", {"amount": amount, "currency": currency,
                                                                     "client": client_data.get("full_name")})


async def notify_document_signed(client_data: dict, doc_name: str, firm_name: str,
                                  tenant_id: str = None, db=None):
    """Notifica cuando un documento fue firmado."""
    if client_data.get("whatsapp"):
        msg = msg_document_signed(client_data.get("full_name", ""), doc_name, firm_name)
        await twilio_wa.send_message(client_data["whatsapp"], msg)

    if db and tenant_id:
        await dispatch_event(tenant_id, "document.signed", {
            "client": client_data.get("full_name"), "document": doc_name,
        }, db)

    if tenant_id:
        await pusher.notify_tenant(tenant_id, "esign.signed", {"document": doc_name, "client": client_data.get("full_name")})
