from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.models.user import User, UserRole
import uuid

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "lawyer"
    phone: Optional[str] = None
    bar_number: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    bar_number: Optional[str] = None
    specialties: Optional[str] = None
    notify_email: Optional[bool] = None
    notify_whatsapp: Optional[bool] = None
    openai_api_key: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "phone": current_user.phone,
        "whatsapp_number": current_user.whatsapp_number,
        "bar_number": current_user.bar_number,
        "specialties": current_user.specialties,
        "avatar_url": current_user.avatar_url,
        "notify_email": current_user.notify_email,
        "notify_whatsapp": current_user.notify_whatsapp,
        "openai_api_key": "***" if current_user.openai_api_key else None,
        "has_openai_key": bool(current_user.openai_api_key),
        "tenant_id": current_user.tenant_id,
    }


@router.put("/me")
async def update_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = data.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(current_user, k, v)
    await db.commit()
    return {"message": "Perfil actualizado correctamente"}


@router.put("/me/password")
async def change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Contraseña actual incorrecta")
    if len(data.new_password) < 8:
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres")
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Contraseña actualizada correctamente"}


@router.get("")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User).where(User.tenant_id == current_user.tenant_id, User.is_active == True)
    )
    users = result.scalars().all()
    return {
        "items": [
            {
                "id": u.id, "email": u.email, "full_name": u.full_name,
                "role": u.role.value, "phone": u.phone, "bar_number": u.bar_number,
                "is_active": u.is_active,
            }
            for u in users
        ]
    }


@router.post("", status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email ya registrado")

    # Enforce plan user limit
    if current_user.tenant_id:
        from app.models.tenant import Tenant
        from app.core.deps import check_user_limit
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
        tenant = tenant_result.scalar_one_or_none()
        if tenant:
            await check_user_limit(tenant, db)

    user = User(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=UserRole(data.role),
        phone=data.phone,
        bar_number=data.bar_number,
    )
    db.add(user)
    await db.commit()
    return {"id": user.id, "message": "Usuario creado"}


@router.put("/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if user.id == current_user.id:
        raise HTTPException(400, "No podés desactivar tu propia cuenta")
    user.is_active = False
    await db.commit()
    return {"message": "Usuario desactivado"}
