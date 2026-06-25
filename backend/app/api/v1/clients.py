from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.case import Case
from app.models.billing import Income, Invoice
import uuid

router = APIRouter(prefix="/clients", tags=["clients"])

class ClientCreate(BaseModel):
    full_name: str
    type: str = "individual"
    document_type: str = "ci"
    document_number: Optional[str] = None
    ruc: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    department: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(ClientCreate):
    full_name: Optional[str] = None

def client_to_dict(c: Client) -> dict:
    return {
        "id": c.id, "type": c.type, "full_name": c.full_name,
        "document_type": c.document_type, "document_number": c.document_number,
        "ruc": c.ruc, "email": c.email, "phone": c.phone, "whatsapp": c.whatsapp,
        "address": c.address, "city": c.city, "department": c.department,
        "notes": c.notes, "is_active": c.is_active,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }

@router.get("")
async def list_clients(
    search: Optional[str] = None,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    q = select(Client).where(Client.tenant_id == current_user.tenant_id, Client.is_active == True)
    if search:
        q = q.where(or_(
            Client.full_name.ilike(f"%{search}%"),
            Client.email.ilike(f"%{search}%"),
            Client.document_number.ilike(f"%{search}%"),
        ))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Client.full_name).offset((page-1)*limit).limit(limit))
    return {"items": [client_to_dict(c) for c in result.scalars().all()], "total": total, "page": page, "pages": max(1,(total+limit-1)//limit)}

@router.get("/{client_id}")
async def get_client(client_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.tenant_id == current_user.tenant_id))
    c = result.scalar_one_or_none()
    if not c: raise HTTPException(404, "Cliente no encontrado")
    return client_to_dict(c)

@router.post("", status_code=201)
async def create_client(data: ClientCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = Client(id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(client)
    await db.commit()
    return {"id": client.id, "message": "Cliente creado"}

@router.put("/{client_id}")
async def update_client(client_id: str, data: ClientUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.tenant_id == current_user.tenant_id))
    c = result.scalar_one_or_none()
    if not c: raise HTTPException(404, "Cliente no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    await db.commit()
    return {"message": "Actualizado"}


@router.get("/{client_id}/detail")
async def get_client_detail(client_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.tenant_id == current_user.tenant_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    cases_r = await db.execute(
        select(Case).where(Case.client_id == client_id, Case.tenant_id == current_user.tenant_id, Case.is_archived == False)
        .order_by(Case.created_at.desc()).limit(20)
    )
    cases = cases_r.scalars().all()

    income_r = await db.execute(
        select(func.sum(Income.amount)).where(Income.client_id == client_id, Income.tenant_id == current_user.tenant_id)
    )
    total_income = income_r.scalar() or 0

    pending_r = await db.execute(
        select(func.sum(Invoice.balance)).where(
            Invoice.client_id == client_id,
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.status.in_(["emitida", "enviada", "vencida", "pending"])
        )
    )
    pending_amount = pending_r.scalar() or 0

    from app.models.case import CaseStatus
    client_data = {
        "id": client.id, "full_name": client.full_name,
        "client_type": client.client_type if hasattr(client, "client_type") else client.type,
        "email": client.email, "phone": client.phone, "ruc": client.ruc, 
        "city": client.city, "address": client.address, "notes": client.notes,
        "is_active": client.is_active, "created_at": client.created_at.isoformat() if client.created_at else None,
        "cases": [{
            "id": c.id, "title": c.title, "reference": c.reference,
            "status": c.status.value if hasattr(c.status, "value") else c.status,
            "matter": c.matter, "created_at": c.created_at.isoformat() if c.created_at else None,
        } for c in cases],
        "total_income": total_income,
        "pending_amount": pending_amount,
        "cases_count": len(cases),
    }
    return client_data

@router.delete("/{client_id}")
async def delete_client(client_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.tenant_id == current_user.tenant_id))
    c = result.scalar_one_or_none()
    if not c: raise HTTPException(404, "Cliente no encontrado")
    c.is_active = False
    await db.commit()
    return {"message": "Cliente eliminado"}
