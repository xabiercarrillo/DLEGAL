from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.contact import ProfessionalContact
import uuid

router = APIRouter(prefix="/contacts", tags=["contacts"])

CONTACT_TYPES = ["colega", "juez", "perito", "notario", "fiscal", "secretario", "procurador", "actuario", "otro"]


class ContactCreate(BaseModel):
    name: str
    type: str = "colega"
    specialty: Optional[str] = None
    court: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    specialty: Optional[str] = None
    court: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


def contact_to_dict(c: ProfessionalContact) -> dict:
    return {
        "id": c.id, "name": c.name, "type": c.type,
        "specialty": c.specialty, "court": c.court,
        "email": c.email, "phone": c.phone, "whatsapp": c.whatsapp,
        "address": c.address, "notes": c.notes,
        "is_favorite": c.is_favorite,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("")
async def list_contacts(
    search: Optional[str] = None,
    type: Optional[str] = None,
    favorites_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(ProfessionalContact).where(ProfessionalContact.tenant_id == current_user.tenant_id)
    if search:
        q = q.where(
            or_(
                ProfessionalContact.name.ilike(f"%{search}%"),
                ProfessionalContact.specialty.ilike(f"%{search}%"),
                ProfessionalContact.court.ilike(f"%{search}%"),
            )
        )
    if type:
        q = q.where(ProfessionalContact.type == type)
    if favorites_only:
        q = q.where(ProfessionalContact.is_favorite == True)
    result = await db.execute(q.order_by(ProfessionalContact.is_favorite.desc(), ProfessionalContact.name))
    items = result.scalars().all()
    return {"items": [contact_to_dict(c) for c in items], "types": CONTACT_TYPES}


@router.post("", status_code=201)
async def create_contact(
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = ProfessionalContact(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        **data.model_dump(),
    )
    db.add(c)
    await db.commit()
    return {"id": c.id, "message": "Contacto creado"}


@router.put("/{contact_id}")
async def update_contact(
    contact_id: str,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProfessionalContact).where(
            ProfessionalContact.id == contact_id,
            ProfessionalContact.tenant_id == current_user.tenant_id,
        )
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Contacto no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    await db.commit()
    return {"message": "Contacto actualizado"}


@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProfessionalContact).where(
            ProfessionalContact.id == contact_id,
            ProfessionalContact.tenant_id == current_user.tenant_id,
        )
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Contacto no encontrado")
    await db.delete(c)
    await db.commit()
    return {"message": "Contacto eliminado"}


@router.post("/{contact_id}/favorite")
async def toggle_favorite(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProfessionalContact).where(
            ProfessionalContact.id == contact_id,
            ProfessionalContact.tenant_id == current_user.tenant_id,
        )
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Contacto no encontrado")
    c.is_favorite = not c.is_favorite
    await db.commit()
    return {"is_favorite": c.is_favorite}
