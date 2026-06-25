from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.tenant import Tenant

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/me")
async def get_my_tenant(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's tenant/firm settings"""
    if not current_user.tenant_id:
        raise HTTPException(404, "Sin estudio asignado")
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Estudio no encontrado")
    return {
        "id": tenant.id,
        "name": tenant.name,
        "legal_name": tenant.legal_name,
        "ruc": tenant.ruc,
        "timbrado": tenant.timbrado,
        "timbrado_expires": tenant.timbrado_expires,
        "address": tenant.address,
        "city": tenant.city,
        "phone": tenant.phone,
        "email": tenant.email,
        "plan": tenant.plan,
        "payment_status": tenant.payment_status,
        "trial_ends_at": tenant.trial_ends_at,
        "subscription_expires_at": tenant.subscription_expires_at,
        "invoice_counter": tenant.invoice_counter,
        "logo_url": tenant.logo_url,
    }


@router.put("/me")
async def update_my_tenant(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update firm settings"""
    allowed_roles = ("firm_admin", "super_admin", "solo_lawyer")
    if current_user.role.value not in allowed_roles:
        raise HTTPException(403, "Solo el administrador puede editar estos datos")
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Estudio no encontrado")
    allowed_fields = {"name", "legal_name", "ruc", "timbrado", "timbrado_expires", "address", "city", "phone", "email"}
    for k, v in data.items():
        if k in allowed_fields and v is not None:
            setattr(tenant, k, v)
    await db.commit()
    return {"message": "Datos del estudio actualizados correctamente"}
