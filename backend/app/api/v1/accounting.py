from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import uuid
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.accounting import AccountingEntry, ReimbursableExpense

router = APIRouter(prefix="", tags=["accounting"])

# ── Accounting Entries ───────────────────────────────────────────────────

class EntryCreate(BaseModel):
    entry_date: str
    concept: str
    account_debit: str
    account_credit: str
    amount: float
    currency: str = "PYG"
    reference: Optional[str] = None
    notes: Optional[str] = None


@router.get("/accounting/entries")
async def list_entries(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    q = select(AccountingEntry).where(AccountingEntry.tenant_id == current_user.tenant_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(AccountingEntry.entry_date.desc()).offset((page-1)*limit).limit(limit))
    items = result.scalars().all()
    return {
        "items": [{"id": e.id, "entry_date": e.entry_date, "concept": e.concept,
                   "account_debit": e.account_debit, "account_credit": e.account_credit,
                   "amount": e.amount, "currency": e.currency} for e in items],
        "total": total,
    }


@router.post("/accounting/entries", status_code=201)
async def create_entry(
    data: EntryCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if data.amount < 0:
        raise HTTPException(422, "El monto no puede ser negativo")
    # Auto-generate entry number
    count = (await db.execute(
        select(func.count()).select_from(AccountingEntry).where(AccountingEntry.tenant_id == current_user.tenant_id)
    )).scalar() or 0
    entry_number = f"AS-{count+1:04d}"
    e = AccountingEntry(
        id=str(uuid.uuid4()), tenant_id=current_user.tenant_id,
        entry_number=entry_number, **data.model_dump(),
    )
    db.add(e)
    await db.commit()
    return {"id": e.id, "entry_number": entry_number, "message": "Asiento creado"}


@router.delete("/accounting/entries/{entry_id}", status_code=204)
async def delete_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(AccountingEntry).where(
        AccountingEntry.id == entry_id, AccountingEntry.tenant_id == current_user.tenant_id
    ))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(404, "Asiento no encontrado")
    await db.delete(e)
    await db.commit()


@router.get("/accounting/summary")
async def accounting_summary(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """Resultado contable: ingresos (Haber cta. 4.x) menos egresos (Debe cta. 5.x)."""
    result = await db.execute(select(AccountingEntry).where(AccountingEntry.tenant_id == current_user.tenant_id))
    entries = result.scalars().all()
    ingresos = sum(e.amount for e in entries if (e.account_credit or "").strip().startswith("4"))
    egresos = sum(e.amount for e in entries if (e.account_debit or "").strip().startswith("5"))
    return {
        "ingresos": ingresos,
        "egresos": egresos,
        "resultado": ingresos - egresos,
        "total_entries": len(entries),
    }


# ── Reimbursable Expenses ────────────────────────────────────────────────

class ReimbCreate(BaseModel):
    description: str
    category: str = "judicial"
    amount: float
    expense_date: str
    case_id: Optional[str] = None
    client_id: Optional[str] = None
    notes: Optional[str] = None


@router.get("/accounting/reimbursable")
async def list_reimbursable(
    is_billed: Optional[bool] = None,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    q = select(ReimbursableExpense).where(ReimbursableExpense.tenant_id == current_user.tenant_id)
    if is_billed is not None:
        q = q.where(ReimbursableExpense.is_billed == is_billed)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(ReimbursableExpense.expense_date.desc()).offset((page-1)*limit).limit(limit))
    items = result.scalars().all()
    return {
        "items": [{"id": r.id, "description": r.description, "category": r.category,
                   "amount": r.amount, "expense_date": r.expense_date, "is_billed": r.is_billed,
                   "case_id": r.case_id, "client_id": r.client_id} for r in items],
        "total": total,
    }


@router.post("/accounting/reimbursable", status_code=201)
async def create_reimbursable(
    data: ReimbCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    r = ReimbursableExpense(
        id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, **data.model_dump(),
    )
    db.add(r)
    await db.commit()
    return {"id": r.id, "message": "Gasto reembolsable creado"}


@router.post("/accounting/reimbursable/{rid}/bill")
async def bill_reimbursable(
    rid: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ReimbursableExpense).where(
        ReimbursableExpense.id == rid, ReimbursableExpense.tenant_id == current_user.tenant_id
    ))
    r = result.scalar_one_or_none()
    if not r: raise HTTPException(404, "Gasto no encontrado")
    r.is_billed = True
    await db.commit()
    return {"message": "Marcado como facturado"}
