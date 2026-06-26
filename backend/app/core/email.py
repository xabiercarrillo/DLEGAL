"""
XLegal — Servicio de Email
Proveedor: Resend (https://resend.com) — transaccional y confiable en Paraguay
Fallback: log a consola si no hay API key configurada
"""
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger("xlegal.email")

SUPPORT_PHONE = "0993397400"
FROM_EMAIL = "XLegal <noreply@xlegal.com.py>"


async def send_email(to: str, subject: str, html: str) -> bool:
    """Envía un email vía Resend API. Retorna True si éxito."""
    if not settings.RESEND_API_KEY:
        logger.info("[EMAIL MOCK] To: %s | Subject: %s", to, subject)
        return True  # In dev, just log it

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            )
            return resp.status_code in (200, 201)
    except Exception as e:
        logger.error("[EMAIL ERROR] %s", e)
        return False


def _base_template(title: str, content: str) -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body {{font-family:'Helvetica Neue',sans-serif;background:#f4f4f5;margin:0;padding:20px;}}
  .card {{background:#fff;max-width:560px;margin:auto;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.08);}}
  .header {{background:#1a1a2e;padding:28px 32px;text-align:center;}}
  .logo {{color:#c9a84c;font-size:26px;font-weight:800;letter-spacing:-0.5px;}}
  .logo span {{color:#fff;}}
  .body {{padding:32px;color:#333;line-height:1.6;}}
  h2 {{color:#1a1a2e;margin-top:0;}}
  .btn {{display:inline-block;background:#1a1a2e;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;margin:16px 0;}}
  .footer {{background:#f8f8f8;padding:16px 32px;font-size:12px;color:#999;text-align:center;border-top:1px solid #eee;}}
</style></head><body>
<div class="card">
  <div class="header"><div class="logo">X<span>Legal</span></div></div>
  <div class="body">{content}</div>
  <div class="footer">XLegal — Sistema Jurídico Paraguay 🇵🇾 | Soporte: {SUPPORT_PHONE}<br>
  <small>Este es un mensaje automático, no responder a este correo.</small></div>
</div></body></html>"""


async def send_welcome_email(to: str, name: str, firm: str, trial_ends: str, plan: str) -> bool:
    content = f"""
    <h2>¡Bienvenido a XLegal, {name.split()[0]}! 🎉</h2>
    <p>Tu estudio <strong>{firm}</strong> ya tiene acceso a todos los módulos de XLegal durante <strong>14 días de prueba gratuita</strong>.</p>
    <ul>
      <li>✅ 25 módulos de gestión jurídica</li>
      <li>✅ Calculadora Ley 213/93</li>
      <li>✅ Facturación SET con IVA 10%</li>
      <li>✅ LEXI — Asistente IA legal</li>
      <li>✅ Plan activo: <strong>{plan.upper()}</strong></li>
    </ul>
    <p>Tu período de prueba finaliza el <strong>{trial_ends}</strong>.</p>
    <a class="btn" href="https://app.xlegal.com.py/dashboard">Ir al Sistema →</a>
    <p style="margin-top:24px;font-size:14px;color:#666;">¿Necesitás ayuda? Escribinos por WhatsApp al <strong>{SUPPORT_PHONE}</strong>.</p>
    """
    return await send_email(to, "¡Bienvenido a XLegal — Tu sistema jurídico está listo!", _base_template("Bienvenido", content))


async def send_password_reset_email(to: str, name: str, reset_url: str) -> bool:
    content = f"""
    <h2>Recuperar contraseña</h2>
    <p>Hola {name.split()[0]}, recibimos una solicitud para restablecer tu contraseña.</p>
    <p>Hacé clic en el botón a continuación. Este enlace es válido por <strong>1 hora</strong>.</p>
    <a class="btn" href="{reset_url}">Restablecer contraseña →</a>
    <p style="font-size:13px;color:#999;margin-top:20px;">Si no solicitaste esto, ignorá este mensaje. Tu cuenta sigue segura.</p>
    """
    return await send_email(to, "Restablecer contraseña — XLegal", _base_template("Recuperar contraseña", content))


async def send_deadline_reminder(to: str, name: str, deadlines: list) -> bool:
    items = "".join([
        f"<li><strong>{d['title']}</strong> — vence {d['due_date']} ({d['days_left']} días)</li>"
        for d in deadlines
    ])
    content = f"""
    <h2>⚠️ Plazos próximos a vencer</h2>
    <p>Hola {name.split()[0]}, estos plazos procesales vencen en los próximos 3 días:</p>
    <ul style="line-height:2;">{items}</ul>
    <a class="btn" href="https://app.xlegal.com.py/deadlines">Ver plazos en XLegal →</a>
    """
    return await send_email(to, f"⚠️ {len(deadlines)} plazo(s) próximos a vencer — XLegal", _base_template("Recordatorio de plazos", content))


async def send_hearing_reminder(to: str, name: str, hearings: list) -> bool:
    items = "".join([
        f"<li><strong>{h['title']}</strong> — {h['scheduled_at']} en {h.get('court','')}</li>"
        for h in hearings
    ])
    content = f"""
    <h2>📅 Audiencias mañana</h2>
    <p>Hola {name.split()[0]}, estas audiencias están agendadas para mañana:</p>
    <ul style="line-height:2;">{items}</ul>
    <a class="btn" href="https://app.xlegal.com.py/hearings">Ver audiencias en XLegal →</a>
    """
    return await send_email(to, f"📅 {len(hearings)} audiencia(s) mañana — XLegal", _base_template("Recordatorio de audiencias", content))


async def send_invoice_reminder(to: str, client_name: str, invoices: list, firm_name: str, firm_phone: str) -> bool:
    items = "".join([
        f"<li>Factura N° {i['number']} — ₲ {i['balance']:,.0f} — vence {i.get('due_date','')}</li>"
        for i in invoices
    ])
    content = f"""
    <h2>Recordatorio de pago</h2>
    <p>Estimado/a {client_name}, le informamos que tiene facturas pendientes de pago con <strong>{firm_name}</strong>:</p>
    <ul style="line-height:2;">{items}</ul>
    <p>Para consultas comuníquese al <strong>{firm_phone}</strong>.</p>
    """
    return await send_email(to, f"Recordatorio de pago — {firm_name}", _base_template("Recordatorio de pago", content))
