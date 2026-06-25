"""
XLegal — WhatsApp + SMS Multi-Provider
Twilio WhatsApp Business API (principal en Paraguay)
Vonage API (alternativa)
Twilio SMS (fallback)

Templates aprobados por Meta (obligatorio para mensajes salientes WhatsApp).
"""
import httpx
from app.core.config import settings


class TwilioWhatsAppService:
    """
    Twilio WhatsApp Business API.
    Requisito: número aprobado por Meta + templates pre-aprobados.
    Docs: https://www.twilio.com/docs/whatsapp
    """
    BASE_URL = "https://api.twilio.com/2010-04-01"

    async def send_message(
        self,
        to_number: str,
        message: str,
        from_number: str = None,
        account_sid: str = None,
        auth_token: str = None,
    ) -> dict:
        """
        Envía mensaje WhatsApp.
        to_number: número E.164 ej. +595981234567
        """
        sid = account_sid or settings.TWILIO_ACCOUNT_SID
        token = auth_token or settings.TWILIO_AUTH_TOKEN
        from_wa = from_number or settings.TWILIO_WHATSAPP_NUMBER

        # Normalize number
        if not to_number.startswith("whatsapp:"):
            # Paraguay: 09XXXXXXXX → +595 9XXXXXXXX
            if to_number.startswith("09"):
                to_number = "+595" + to_number[1:]
            elif not to_number.startswith("+"):
                to_number = "+595" + to_number
            to_number = f"whatsapp:{to_number}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    f"{self.BASE_URL}/Accounts/{sid}/Messages.json",
                    data={"From": from_wa, "To": to_number, "Body": message},
                    auth=(sid, token),
                )
                data = r.json()
                if data.get("sid"):
                    return {"success": True, "message_sid": data["sid"], "status": data.get("status")}
                return {"success": False, "error": data.get("message", "Error Twilio")}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def send_sms(self, to_number: str, message: str,
                       account_sid: str = None, auth_token: str = None) -> dict:
        """Envía SMS vía Twilio (fallback si no tiene WhatsApp)."""
        sid = account_sid or settings.TWILIO_ACCOUNT_SID
        token = auth_token or settings.TWILIO_AUTH_TOKEN
        from_sms = settings.TWILIO_SMS_NUMBER

        if not from_sms:
            return {"success": False, "error": "TWILIO_SMS_NUMBER no configurado"}

        if to_number.startswith("09"):
            to_number = "+595" + to_number[1:]
        elif not to_number.startswith("+"):
            to_number = "+595" + to_number

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    f"{self.BASE_URL}/Accounts/{sid}/Messages.json",
                    data={"From": from_sms, "To": to_number, "Body": message},
                    auth=(sid, token),
                )
                data = r.json()
                return {"success": bool(data.get("sid")), "message_sid": data.get("sid"), "error": data.get("message")}
        except Exception as e:
            return {"success": False, "error": str(e)}


class VonageService:
    """
    Vonage (ex-Nexmo) — Alternativa a Twilio para SMS.
    Docs: https://developer.vonage.com
    """
    async def send_sms(self, to_number: str, message: str,
                       api_key: str = None, api_secret: str = None,
                       from_name: str = "XLegal") -> dict:
        key = api_key or settings.VONAGE_API_KEY
        secret = api_secret or settings.VONAGE_API_SECRET
        if not key:
            return {"success": False, "error": "Vonage no configurado"}

        if to_number.startswith("09"):
            to_number = "595" + to_number[1:]

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    "https://rest.nexmo.com/sms/json",
                    data={"api_key": key, "api_secret": secret, "to": to_number, "from": from_name, "text": message},
                )
                data = r.json()
                msgs = data.get("messages", [{}])
                if msgs[0].get("status") == "0":
                    return {"success": True, "message_id": msgs[0].get("message-id")}
                return {"success": False, "error": msgs[0].get("error-text", "Error Vonage")}
        except Exception as e:
            return {"success": False, "error": str(e)}


# ── Mensajes template XLegal ─────────────────────────────────────────────
def msg_deadline_reminder(name: str, title: str, days: int) -> str:
    return (
        f"⚖️ *XLegal — Recordatorio*\n\n"
        f"Hola {name.split()[0]}, el plazo *{title}* vence en {days} día(s).\n\n"
        f"📱 Ingresá a tu sistema: xlegal.com.py\n"
        f"📞 Soporte: 0993397400"
    )

def msg_hearing_reminder(name: str, title: str, date_str: str, court: str = "") -> str:
    court_line = f"🏛️ {court}\n" if court else ""
    return (
        f"⚖️ *XLegal — Audiencia mañana*\n\n"
        f"Hola {name.split()[0]},\n"
        f"📅 *{title}*\n"
        f"🕐 {date_str}\n"
        f"{court_line}\n"
        f"📱 xlegal.com.py | 📞 0993397400"
    )

def msg_payment_received(client_name: str, amount: float, currency: str, firm_name: str) -> str:
    amount_fmt = f"₲ {amount:,.0f}" if currency == "PYG" else f"{currency} {amount:,.2f}"
    return (
        f"✅ *Pago recibido*\n\n"
        f"Estimado/a {client_name},\n"
        f"Confirmamos recepción de {amount_fmt} en *{firm_name}*.\n\n"
        f"Gracias por su confianza.\n📞 0993397400"
    )

def msg_document_signed(client_name: str, doc_name: str, firm_name: str) -> str:
    return (
        f"✅ *Documento firmado*\n\n"
        f"Hola {client_name},\nEl documento *{doc_name}* ha sido firmado correctamente.\n\n"
        f"📥 Recibirás copia por email.\n"
        f"— {firm_name} | 📞 0993397400"
    )

def msg_invoice_reminder(client_name: str, amount: float, due_date: str, firm_name: str) -> str:
    return (
        f"💳 *Recordatorio de pago — {firm_name}*\n\n"
        f"Estimado/a {client_name},\n"
        f"Tiene una factura pendiente de ₲ {amount:,.0f} con vencimiento {due_date}.\n\n"
        f"Para consultas: 📞 0993397400"
    )

def msg_new_document(client_name: str, doc_name: str, sign_url: str = "") -> str:
    sign_line = f"\n✍️ Firmar: {sign_url}" if sign_url else ""
    return (
        f"📄 *Nuevo documento disponible*\n\n"
        f"Hola {client_name}, tenés un documento listo para revisar:\n"
        f"*{doc_name}*{sign_line}\n\n"
        f"📱 xlegal.com.py | 📞 0993397400"
    )


# ── Instancias ─────────────────────────────────
twilio_wa = TwilioWhatsAppService()
vonage = VonageService()


async def send_whatsapp(to: str, message: str, cfg: dict = None) -> dict:
    """
    Envía WhatsApp usando configuración del tenant o global.
    cfg: {"account_sid": ..., "auth_token": ..., "whatsapp_number": ...}
    """
    if cfg:
        return await twilio_wa.send_message(
            to, message,
            from_number=cfg.get("whatsapp_number"),
            account_sid=cfg.get("account_sid"),
            auth_token=cfg.get("auth_token"),
        )
    return await twilio_wa.send_message(to, message)
