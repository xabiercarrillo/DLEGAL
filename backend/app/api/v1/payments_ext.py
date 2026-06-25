"""
XLegal — API de Pagos Externos
POST /payments/checkout      → Crea sesión de pago
GET  /payments               → Historial de transacciones
GET  /payments/{id}          → Detalle transacción
POST /payments/webhook/stripe      → Webhook Stripe
POST /payments/webhook/mercadopago → Webhook Mercado Pago
POST /payments/webhook/bancard     → Webhook Bancard
"""
import uuid, hmac, hashlib, json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.integration import PaymentTransaction, TenantIntegration
from app.services.payments import bancard, mercadopago, stripe, paypal
from app.services.webhooks import dispatch_event, pusher

router = APIRouter(prefix="/payments", tags=["payments"])


class CheckoutRequest(BaseModel):
    amount: float
    currency: str = "PYG"
    description: str
    provider: str = "bancard"   # bancard | mercadopago | stripe | paypal
    invoice_id: Optional[str] = None
    case_id: Optional[str] = None
    client_id: Optional[str] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    customer_email: Optional[str] = None


async def _get_cfg(db, tenant_id: str, provider: str) -> dict:
    r = await db.execute(select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == provider,
        TenantIntegration.is_enabled == True,
    ))
    i = r.scalar_one_or_none()
    return i.config or {} if i else {}


@router.post("/checkout")
async def create_checkout(
    data: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crea sesión de pago con el proveedor seleccionado.
    Retorna checkout_url para redirigir al cliente.
    """
    cfg = await _get_cfg(db, current_user.tenant_id, data.provider)
    shop_id = str(uuid.uuid4().hex[:12])
    base_url = data.success_url or f"{settings.APP_URL}/pagos"
    success_url = data.success_url or f"{base_url}/gracias?ref={shop_id}"
    cancel_url  = data.cancel_url  or f"{base_url}/cancelado?ref={shop_id}"

    result = {"success": False, "error": "Proveedor no disponible"}

    if data.provider == "bancard":
        pk = cfg.get("private_key") or settings.BANCARD_PRIVATE_KEY
        pub = cfg.get("public_key") or settings.BANCARD_PUBLIC_KEY
        if not pk:
            raise HTTPException(400, "Bancard no configurado. Ir a Integraciones → Pagos → Bancard.")
        result = await bancard.create_single_buy(
            shop_process_id=shop_id,
            amount=data.amount,
            description=data.description[:255],
            return_url=success_url,
            cancel_url=cancel_url,
            private_key=pk,
            public_key=pub,
        )

    elif data.provider == "mercadopago":
        token = cfg.get("access_token") or settings.MERCADOPAGO_ACCESS_TOKEN
        if not token:
            raise HTTPException(400, "Mercado Pago no configurado. Ir a Integraciones → Pagos → Mercado Pago.")
        result = await mercadopago.create_preference(
            title=data.description,
            amount=data.amount,
            external_reference=shop_id,
            back_urls={"success": success_url, "failure": cancel_url, "pending": success_url},
            access_token=token,
            payer_email=data.customer_email,
        )

    elif data.provider == "stripe":
        sk = cfg.get("secret_key") or settings.STRIPE_SECRET_KEY
        if not sk:
            raise HTTPException(400, "Stripe no configurado. Ir a Integraciones → Pagos → Stripe.")
        # Stripe usa centavos para la mayoría de divisas; PYG no tiene decimales
        amount_cents = int(data.amount) if data.currency == "PYG" else int(data.amount * 100)
        result = await stripe.create_checkout_session(
            amount_cents=amount_cents,
            currency=data.currency.lower(),
            description=data.description,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=data.customer_email,
            secret_key=sk,
        )

    elif data.provider == "paypal":
        cid = cfg.get("client_id") or settings.PAYPAL_CLIENT_ID
        csec = cfg.get("client_secret") or settings.PAYPAL_CLIENT_SECRET
        if not cid:
            raise HTTPException(400, "PayPal no configurado. Ir a Integraciones → Pagos → PayPal.")
        result = await paypal.create_order(
            amount=data.amount,
            currency=data.currency,
            description=data.description,
            return_url=success_url,
            cancel_url=cancel_url,
            client_id=cid,
            client_secret=csec,
        )

    if not result.get("success"):
        raise HTTPException(400, result.get("error", f"Error al crear pago con {data.provider}"))

    # Create transaction record
    tx = PaymentTransaction(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        client_id=data.client_id,
        case_id=data.case_id,
        invoice_id=data.invoice_id,
        provider=data.provider,
        external_id=result.get("process_id") or result.get("preference_id") or result.get("session_id") or result.get("order_id"),
        amount=data.amount,
        currency=data.currency,
        status="pending",
        description=data.description,
        payment_url=result.get("checkout_url"),
        metadata={"shop_id": shop_id, "provider_result": {k: v for k, v in result.items() if k != "success"}},
    )
    db.add(tx)
    await db.commit()

    return {
        "transaction_id": tx.id,
        "checkout_url": result.get("checkout_url") or result.get("sandbox_url"),
        "provider": data.provider,
        "amount": data.amount,
        "currency": data.currency,
        "status": "pending",
        "message": f"Redirigir al cliente a checkout_url para completar el pago vía {data.provider.title()}",
    }


@router.get("")
async def list_transactions(
    status: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista transacciones de pago del tenant."""
    q = select(PaymentTransaction).where(PaymentTransaction.tenant_id == current_user.tenant_id)
    if status:
        q = q.where(PaymentTransaction.status == status)
    if provider:
        q = q.where(PaymentTransaction.provider == provider)
    q = q.order_by(PaymentTransaction.created_at.desc()).limit(limit)
    r = await db.execute(q)
    items = r.scalars().all()
    return {"items": [{
        "id": t.id,
        "provider": t.provider,
        "external_id": t.external_id,
        "amount": t.amount,
        "currency": t.currency,
        "status": t.status,
        "description": t.description,
        "payment_url": t.payment_url,
        "paid_at": t.paid_at,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in items]}


@router.get("/summary")
async def payments_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumen de pagos por proveedor y estado."""
    from sqlalchemy import func
    r = await db.execute(
        select(
            PaymentTransaction.provider,
            PaymentTransaction.status,
            func.count().label("count"),
            func.sum(PaymentTransaction.amount).label("total"),
        )
        .where(PaymentTransaction.tenant_id == current_user.tenant_id)
        .group_by(PaymentTransaction.provider, PaymentTransaction.status)
    )
    rows = r.all()
    return {"summary": [{"provider": p, "status": s, "count": c, "total": float(t or 0)} for p,s,c,t in rows]}


# ═══════════════════════════════════════════════════════════════════
#  WEBHOOKS INBOUND (plataformas → XLegal)
# ═══════════════════════════════════════════════════════════════════
async def _mark_paid(db, external_id: str, provider: str, raw: dict = None):
    """Marca transacción como pagada y dispara eventos."""
    r = await db.execute(select(PaymentTransaction).where(
        PaymentTransaction.external_id == external_id,
        PaymentTransaction.provider == provider,
    ))
    tx = r.scalar_one_or_none()
    if tx and tx.status == "pending":
        tx.status = "completed"
        tx.paid_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        if raw:
            tx.tx_metadata = {**(tx.tx_metadata or {}), "webhook_data": str(raw)[:500]}
        await db.commit()

        # Update linked invoice if exists
        if tx.invoice_id:
            from app.models.billing import Invoice
            ri = await db.execute(select(Invoice).where(Invoice.id == tx.invoice_id))
            inv = ri.scalar_one_or_none()
            if inv:
                inv.status = "paid"
                inv.paid_at = tx.paid_at
                await db.commit()

        # Dispatch outbound webhooks + Pusher
        await dispatch_event(tx.tenant_id, "payment.received", {
            "amount": tx.amount, "currency": tx.currency,
            "provider": provider, "transaction_id": tx.id,
        }, db)
        await pusher.notify_tenant(tx.tenant_id, "payment.received", {
            "amount": tx.amount, "currency": tx.currency,
        })
    return tx


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook Stripe → confirma pagos en tiempo real."""
    body = await request.body()
    sig = request.headers.get("stripe-signature", "")
    event = stripe.verify_webhook(body, sig, settings.STRIPE_WEBHOOK_SECRET)
    if not event:
        raise HTTPException(400, "Firma inválida")

    evt_type = event.get("type", "")
    if evt_type in ("payment_intent.succeeded", "checkout.session.completed"):
        obj = event["data"]["object"]
        ext_id = obj.get("id")
        await _mark_paid(db, ext_id, "stripe", event)

    return {"received": True}


@router.post("/webhook/mercadopago")
async def mercadopago_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook Mercado Pago → IPN de pagos aprobados."""
    body = await request.json()
    topic = body.get("topic") or body.get("type", "")
    resource_id = body.get("id") or body.get("data", {}).get("id")

    if topic in ("payment", "payment_intent") and resource_id:
        await _mark_paid(db, str(resource_id), "mercadopago", body)

    return {"received": True}


@router.post("/webhook/bancard")
async def bancard_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook Bancard Vpos → confirmación de pago."""
    body = await request.json()
    op = body.get("operation", {})
    shop_process_id = op.get("shop_process_id")
    resp_code = op.get("response_code", "")

    if shop_process_id and resp_code in ("00", "S-100"):  # aprobado
        await _mark_paid(db, shop_process_id, "bancard", body)

    return {"received": True}
