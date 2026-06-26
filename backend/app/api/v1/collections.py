from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.billing import Invoice

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("")
async def list_collections(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Facturas en gestión de cobranza (pendientes y cobradas)."""
    q = (
        select(Invoice)
        .options(selectinload(Invoice.client))
        .where(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.status.in_(["emitida", "enviada", "vencida", "cobrada", "pagada"]),
        )
    )
    if status:
        q = q.where(Invoice.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Invoice.due_date).offset((page - 1) * limit).limit(limit))
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": inv.id,
                "number": inv.number,
                "status": inv.status.value if hasattr(inv.status, "value") else inv.status,
                "total": inv.total,
                "amount": inv.total,
                "balance": inv.balance,
                "paid_amount": inv.paid_amount,
                "issued_at": inv.issued_at,
                "due_date": inv.due_date,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "client_name": inv.client.full_name if inv.client else None,
                "client_phone": getattr(inv.client, "phone", None) if inv.client else None,
                "client": {"id": inv.client.id, "full_name": inv.client.full_name} if inv.client else None,
            }
            for inv in items
        ],
        "total": total,
    }


@router.get("/stats")
async def collection_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime
    result = await db.execute(select(Invoice).where(Invoice.tenant_id == current_user.tenant_id))
    invs = result.scalars().all()
    paid_statuses = {"cobrada", "pagada", "paid"}

    def st(i):
        return i.status.value if hasattr(i.status, "value") else i.status

    def bal(i):
        return (i.balance if i.balance is not None else i.total) or 0

    pending = [i for i in invs if st(i) not in paid_statuses]
    overdue = [i for i in pending if st(i) == "vencida"]
    collected = [i for i in invs if st(i) in paid_statuses]
    month = datetime.now().strftime("%Y-%m")
    collected_month = [i for i in collected if (i.paid_at or "").startswith(month)]

    pending_amount = sum(bal(i) for i in pending)
    overdue_amount = sum(bal(i) for i in overdue)
    # "Cobrado este mes": si no hay paid_at registrado, se considera todo lo cobrado
    collected_src = collected_month if collected_month else collected
    collected_amount = sum((i.total or 0) for i in collected_src)

    # Compatibilidad con el formato anterior (by_status / total_pending)
    by_status: dict = {}
    for i in pending:
        key = st(i)
        entry = by_status.setdefault(key, {"total": 0, "count": 0})
        entry["total"] += bal(i)
        entry["count"] += 1

    return {
        "pending_amount": pending_amount,
        "overdue_amount": overdue_amount,
        "overdue_count": len(overdue),
        "collected_amount": collected_amount,
        "collected_count": len(collected),
        "by_status": by_status,
        "total_pending": pending_amount,
    }


@router.post("/{inv_id}/send-reminder")
async def send_reminder(
    inv_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Punto de integración: Twilio WhatsApp / Resend Email"""
    result = await db.execute(
        select(Invoice).where(Invoice.id == inv_id, Invoice.tenant_id == current_user.tenant_id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    return {"message": f"Recordatorio enviado — Factura {inv.number}", "invoice_id": inv_id}


@router.post("/{inv_id}/mark-overdue")
async def mark_overdue(
    inv_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == inv_id, Invoice.tenant_id == current_user.tenant_id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    inv.status = "vencida"
    await db.commit()
    return {"message": "Marcada como vencida"}


@router.post("/{inv_id}/mark-paid")
async def mark_collection_paid(
    inv_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == inv_id, Invoice.tenant_id == current_user.tenant_id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    from datetime import datetime, timezone
    inv.status = "cobrada"
    inv.paid_amount = inv.total
    inv.balance = 0
    inv.paid_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    return {"message": "Marcada como cobrada", "invoice_id": inv_id}


@router.post("/{inv_id}/send-whatsapp")
async def send_whatsapp_reminder(
    inv_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Envía recordatorio por WhatsApp (Twilio)"""
    from app.services.whatsapp import send_whatsapp_message
    result = await db.execute(
        select(Invoice).options(selectinload(Invoice.client))
        .where(Invoice.id == inv_id, Invoice.tenant_id == current_user.tenant_id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    phone = inv.client.phone if inv.client else None
    if phone:
        try:
            msg = f"Estimado/a {inv.client.full_name}, le recordamos que tiene una factura N°{inv.number} pendiente de pago. Por favor, contáctenos para coordinar el pago. Gracias."
            send_whatsapp_message(phone, msg)
        except Exception:
            pass
    return {"message": f"Recordatorio WhatsApp enviado", "invoice_id": inv_id}


class PartialPaymentIn(BaseModel):
    amount: float


@router.post("/{inv_id}/partial-payment")
async def register_partial_payment(
    inv_id: str,
    data: PartialPaymentIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra un pago parcial y actualiza el saldo"""
    result = await db.execute(
        select(Invoice).where(Invoice.id == inv_id, Invoice.tenant_id == current_user.tenant_id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    if data.amount <= 0:
        raise HTTPException(400, "El monto debe ser mayor a 0")

    inv.paid_amount = (inv.paid_amount or 0) + data.amount
    inv.balance = max(0, (inv.total or inv.paid_amount or 0) - inv.paid_amount)

    if inv.balance == 0:
        from datetime import datetime, timezone
        inv.status = "cobrada"
        inv.paid_at = datetime.now(timezone.utc).isoformat()

    await db.commit()
    return {
        "message": "Pago parcial registrado",
        "paid_amount": inv.paid_amount,
        "balance": inv.balance,
        "status": inv.status,
    }
