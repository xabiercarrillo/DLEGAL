"""
XLegal — Servicio de Pagos Multi-Provider

Bancard: procesador local Paraguay (Vpos)
Mercado Pago: líder regional, muy usado en PY
Stripe: internacional, tarjeta débito/crédito
PayPal: alternativa internacional

Flujo:
  1. Cliente elige proveedor en frontend
  2. create_checkout() → retorna URL de pago
  3. Cliente paga en plataforma externa
  4. Webhook confirma → registrar en DB, marcar factura
"""
import hashlib, hmac, json, httpx
from datetime import datetime, timezone
from app.core.config import settings


# ═══════════════════════════════════════════════
#  BANCARD — Paraguay (Vpos)
# ═══════════════════════════════════════════════
class BancardService:
    """
    Bancard Vpos — Procesador de pagos líder en Paraguay.
    Docs: https://developers.bancard.com.py
    """
    BASE_URL = settings.BANCARD_BASE_URL

    @staticmethod
    def _generate_token(private_key: str, shop_process_id: str, amount: str, currency: str) -> str:
        """Genera token de seguridad Bancard (MD5)."""
        raw = f"{private_key}{shop_process_id}pay{amount}{currency}"
        return hashlib.md5(raw.encode()).hexdigest()

    @staticmethod
    def _refund_token(private_key: str, shop_process_id: str) -> str:
        raw = f"{private_key}{shop_process_id}refund"
        return hashlib.md5(raw.encode()).hexdigest()

    async def create_single_buy(
        self,
        shop_process_id: str,
        amount: float,
        description: str,
        return_url: str,
        cancel_url: str,
        private_key: str = None,
        public_key: str = None,
    ) -> dict:
        """
        Crea un pago único en Bancard Vpos.
        Retorna process_id y URL de redirección al checkout de Bancard.
        """
        pk = private_key or settings.BANCARD_PRIVATE_KEY
        pub = public_key or settings.BANCARD_PUBLIC_KEY
        amount_str = f"{amount:.2f}"
        token = self._generate_token(pk, shop_process_id, amount_str, "PYG")

        payload = {
            "public_key": pub,
            "operation": {
                "token": token,
                "shop_process_id": shop_process_id,
                "currency": "PYG",
                "amount": amount_str,
                "additional_data": "",
                "description": description[:255],
                "return_url": return_url,
                "cancel_url": cancel_url,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=15.0, verify=True) as client:
                r = await client.post(
                    f"{self.BASE_URL}/vpos/api/0.3/single_buy",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                data = r.json()
                if data.get("status") == "success":
                    process_id = data["process_id"]
                    checkout_url = f"{self.BASE_URL}/payment/card/pay?process_id={process_id}&public_key={pub}"
                    return {
                        "success": True,
                        "process_id": process_id,
                        "checkout_url": checkout_url,
                        "provider": "bancard",
                    }
                return {"success": False, "error": str(data.get("messages", "Error Bancard")), "provider": "bancard"}
        except Exception as e:
            return {"success": False, "error": str(e), "provider": "bancard"}

    async def verify_payment(self, shop_process_id: str, private_key: str = None) -> dict:
        """Verifica el estado de un pago en Bancard."""
        pk = private_key or settings.BANCARD_PRIVATE_KEY
        pub = settings.BANCARD_PUBLIC_KEY
        token = self._generate_token(pk, shop_process_id, "0.00", "PYG")
        payload = {"public_key": pub, "operation": {"token": token, "shop_process_id": shop_process_id}}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(f"{self.BASE_URL}/vpos/api/0.3/single_buy/confirmations", json=payload)
                return r.json()
        except Exception as e:
            return {"error": str(e)}


# ═══════════════════════════════════════════════
#  MERCADO PAGO
# ═══════════════════════════════════════════════
class MercadoPagoService:
    """
    Mercado Pago Paraguay — Checkout Pro + QR.
    Docs: https://www.mercadopago.com.py/developers
    """
    BASE_URL = "https://api.mercadopago.com"

    async def create_preference(
        self,
        title: str,
        amount: float,
        external_reference: str,
        back_urls: dict,
        access_token: str = None,
        payer_email: str = None,
    ) -> dict:
        """
        Crea preferencia de pago → retorna init_point (URL de checkout).
        back_urls: {"success": "...", "failure": "...", "pending": "..."}
        """
        token = access_token or settings.MERCADOPAGO_ACCESS_TOKEN
        payload = {
            "items": [{"title": title, "quantity": 1, "unit_price": amount, "currency_id": "PYG"}],
            "back_urls": back_urls,
            "auto_return": "approved",
            "external_reference": external_reference,
            "statement_descriptor": "XLegal",
        }
        if payer_email:
            payload["payer"] = {"email": payer_email}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    f"{self.BASE_URL}/checkout/preferences",
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = r.json()
                if "id" in data:
                    return {
                        "success": True,
                        "preference_id": data["id"],
                        "checkout_url": data.get("init_point"),
                        "sandbox_url": data.get("sandbox_init_point"),
                        "provider": "mercadopago",
                    }
                return {"success": False, "error": data.get("message", "Error MP"), "provider": "mercadopago"}
        except Exception as e:
            return {"success": False, "error": str(e), "provider": "mercadopago"}

    async def get_payment(self, payment_id: str, access_token: str = None) -> dict:
        token = access_token or settings.MERCADOPAGO_ACCESS_TOKEN
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"{self.BASE_URL}/v1/payments/{payment_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                return r.json()
        except Exception as e:
            return {"error": str(e)}


# ═══════════════════════════════════════════════
#  STRIPE
# ═══════════════════════════════════════════════
class StripeService:
    """
    Stripe — Tarjeta internacional.
    Docs: https://stripe.com/docs/api
    """
    BASE_URL = "https://api.stripe.com/v1"

    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str = "pyg",
        description: str = "",
        metadata: dict = None,
        secret_key: str = None,
    ) -> dict:
        key = secret_key or settings.STRIPE_SECRET_KEY
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    f"{self.BASE_URL}/payment_intents",
                    data={
                        "amount": amount_cents,
                        "currency": currency,
                        "description": description,
                        "metadata[source]": "xlegal",
                        **({"metadata[ref]": metadata.get("ref", "")} if metadata else {}),
                    },
                    auth=(key, ""),
                )
                data = r.json()
                if "id" in data:
                    return {
                        "success": True,
                        "payment_intent_id": data["id"],
                        "client_secret": data["client_secret"],
                        "provider": "stripe",
                    }
                return {"success": False, "error": data.get("error", {}).get("message"), "provider": "stripe"}
        except Exception as e:
            return {"success": False, "error": str(e), "provider": "stripe"}

    async def create_checkout_session(
        self,
        amount_cents: int,
        currency: str,
        description: str,
        success_url: str,
        cancel_url: str,
        customer_email: str = None,
        secret_key: str = None,
    ) -> dict:
        key = secret_key or settings.STRIPE_SECRET_KEY
        data = {
            "mode": "payment",
            "payment_method_types[]": "card",
            "line_items[0][price_data][currency]": currency,
            "line_items[0][price_data][unit_amount]": amount_cents,
            "line_items[0][price_data][product_data][name]": description,
            "line_items[0][quantity]": "1",
            "success_url": success_url,
            "cancel_url": cancel_url,
        }
        if customer_email:
            data["customer_email"] = customer_email
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(f"{self.BASE_URL}/checkout/sessions", data=data, auth=(key, ""))
                resp = r.json()
                if "id" in resp:
                    return {"success": True, "session_id": resp["id"], "checkout_url": resp["url"], "provider": "stripe"}
                return {"success": False, "error": resp.get("error", {}).get("message"), "provider": "stripe"}
        except Exception as e:
            return {"success": False, "error": str(e), "provider": "stripe"}

    @staticmethod
    def verify_webhook(payload: bytes, sig_header: str, webhook_secret: str = None) -> dict | None:
        """Verifica firma de webhook de Stripe."""
        secret = webhook_secret or settings.STRIPE_WEBHOOK_SECRET
        try:
            import time
            parts = {k: v for k, v in (p.split("=", 1) for p in sig_header.split(","))}
            timestamp = parts.get("t", "")
            sig = parts.get("v1", "")
            signed_payload = f"{timestamp}.{payload.decode()}"
            expected = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected, sig):
                return None
            return json.loads(payload)
        except Exception:
            return None


# ═══════════════════════════════════════════════
#  PAYPAL
# ═══════════════════════════════════════════════
class PayPalService:
    """
    PayPal — Pago alternativo internacional.
    Docs: https://developer.paypal.com
    """
    BASE_URL = "https://api-m.paypal.com"  # sandbox: api-m.sandbox.paypal.com

    async def _get_token(self, client_id: str = None, client_secret: str = None) -> str:
        cid = client_id or settings.PAYPAL_CLIENT_ID
        csec = client_secret or settings.PAYPAL_CLIENT_SECRET
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{self.BASE_URL}/v1/oauth2/token",
                data="grant_type=client_credentials",
                auth=(cid, csec),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            return r.json().get("access_token", "")

    async def create_order(self, amount: float, currency: str, description: str,
                           return_url: str, cancel_url: str,
                           client_id: str = None, client_secret: str = None) -> dict:
        try:
            token = await self._get_token(client_id, client_secret)
            payload = {
                "intent": "CAPTURE",
                "purchase_units": [{"amount": {"currency_code": currency, "value": f"{amount:.2f}"}, "description": description}],
                "application_context": {"return_url": return_url, "cancel_url": cancel_url},
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    f"{self.BASE_URL}/v2/checkout/orders",
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = r.json()
                if data.get("id"):
                    approve_url = next((l["href"] for l in data.get("links", []) if l["rel"] == "approve"), None)
                    return {"success": True, "order_id": data["id"], "checkout_url": approve_url, "provider": "paypal"}
                return {"success": False, "error": str(data), "provider": "paypal"}
        except Exception as e:
            return {"success": False, "error": str(e), "provider": "paypal"}


# ── Instancias ────────────────────────────────
bancard = BancardService()
mercadopago = MercadoPagoService()
stripe = StripeService()
paypal = PayPalService()
