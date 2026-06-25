"""
Gastos Reembolsables — gastos judiciales, aranceles, tasas que el abogado
adelanta y luego factura al cliente.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/reimbursable", tags=["reimbursable"])

# ── Inline model (tabla simple, no requiere modelo SQLAlchemy separado) ─────
# Reusa la tabla expenses con is_reimbursable=True como flag
# Para evitar dependencia de modelo dedicado, usamos la tabla de expenses
from app.models.billing import Expense


class ReimbursableCreate(BaseModel):
    description: str
    amount: float
    expense_date: str
    category: str = "judicial"
    case_id: Optional[str] = None
    notes: Optional[str] = None


def exp_to_dict(e: Expense) -> dict:
    return {
        "id": e.id,
        "description": e.description,
        "amount": e.amount,
        "expense_date": e.expense_date,
        "category": e.category,
        "case_id": e.case_id,
        "case_title": getattr(e, "case_title", None),
        "notes": e.notes,
        "is_billed": getattr(e, "is_billed", False),
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@router.get("")
async def list_reimbursable(
    is_billed: Optional[bool] = None,
    case_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Expense).where(
        Expense.tenant_id == current_user.tenant_id,
        Expense.is_reimbursable == True,
    )
    if is_billed is not None:
        q = q.where(Expense.is_billed == is_billed)
    if case_id:
        q = q.where(Expense.case_id == case_id)
    result = await db.execute(q.order_by(Expense.expense_date.desc()).limit(limit))
    items = result.scalars().all()
    pending_total = sum(e.amount for e in items if not getattr(e, "is_billed", False))
    return {
        "items": [exp_to_dict(e) for e in items],
        "total": len(items),
        "pending_total": pending_total,
    }


@router.post("", status_code=201)
async def create_reimbursable(
    data: ReimbursableCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    e = Expense(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        lawyer_id=current_user.id,
        description=data.description,
        amount=data.amount,
        expense_date=data.expense_date,
        category=data.category,
        case_id=data.case_id,
        notes=data.notes,
        is_reimbursable=True,
        is_billable=True,
        is_billed=False,
        payment_method="efectivo",
    )
    db.add(e)
    await db.commit()
    return {"id": e.id, "message": "Gasto reembolsable registrado"}


@router.post("/{expense_id}/mark-billed")
async def mark_billed(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.tenant_id == current_user.tenant_id,
            Expense.is_reimbursable == True,
        )
    )
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(404, "Gasto no encontrado")
    e.is_billed = True
    await db.commit()
    return {"message": "Marcado como facturado"}


@router.delete("/{expense_id}", status_code=204)
async def delete_reimbursable(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.tenant_id == current_user.tenant_id,
            Expense.is_reimbursable == True,
        )
    )
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(404, "Gasto no encontrado")
    await db.delete(e)
    await db.commit()
