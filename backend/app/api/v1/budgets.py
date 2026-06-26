from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import uuid
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.budget import Budget

router = APIRouter(prefix="/budgets", tags=["budgets"])


class BudgetCreate(BaseModel):
    title: str
    amount: float
    description: Optional[str] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    case_id: Optional[str] = None
    valid_until: Optional[str] = None
    notes: Optional[str] = None


class BudgetUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
    description: Optional[str] = None
    valid_until: Optional[str] = None
    notes: Optional[str] = None


def budget_to_dict(b: Budget) -> dict:
    return {
        "id": b.id, "title": b.title, "amount": b.amount,
        "status": b.status, "description": b.description,
        "client_id": b.client_id, "case_id": b.case_id,
        "client_name": getattr(b, "client_name", None),
        "valid_until": b.valid_until,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("")
async def list_budgets(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    q = select(Budget).where(Budget.tenant_id == current_user.tenant_id)
    if status:
        q = q.where(Budget.status == status)
    result = await db.execute(q.order_by(Budget.created_at.desc()))
    items = result.scalars().all()
    total_amount = sum(b.amount for b in items if b.status == "aprobado")
    return {"items": [budget_to_dict(b) for b in items], "total": len(items), "total_approved": total_amount}


@router.post("", status_code=201)
async def create_budget(
    data: BudgetCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if data.amount < 0:
        raise HTTPException(422, "El monto no puede ser negativo")
    b = Budget(id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(b)
    await db.commit()
    return {"id": b.id, "message": "Presupuesto creado"}


@router.put("/{budget_id}")
async def update_budget(
    budget_id: str, data: BudgetUpdate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Budget).where(Budget.id == budget_id, Budget.tenant_id == current_user.tenant_id))
    b = result.scalar_one_or_none()
    if not b: raise HTTPException(404, "Presupuesto no encontrado")
    for k, v in data.model_dump(exclude_none=True).items(): setattr(b, k, v)
    await db.commit()
    return {**budget_to_dict(b), "message": "Actualizado"}


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Budget).where(Budget.id == budget_id, Budget.tenant_id == current_user.tenant_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Presupuesto no encontrado")
    await db.delete(b)
    await db.commit()
