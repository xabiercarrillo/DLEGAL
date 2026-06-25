"""
XLegal — Dependencias de autenticación y autorización.
- get_current_user: cualquier usuario autenticado
- get_current_active_tenant: valida tenant activo + suscripción vigente
- require_firm_admin: solo administradores del estudio
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from datetime import datetime, timezone

bearer = HTTPBearer()

SUPER_ADMIN_EMAIL = "xabiercarrillo@gmail.com"

PLAN_MAX_USERS = {
    "solo": 1,
    "bufete_s": 5,
    "bufete_m": 10,
    "bufete_l": -1,  # unlimited
}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado o inactivo")
    return user


async def get_current_active_tenant(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Tenant:
    """
    Retorna el tenant activo del usuario.
    - Super admin puede acceder sin tenant
    - Tenants inactivos, cancelados o con trial expirado reciben 403
    """
    if current_user.email == SUPER_ADMIN_EMAIL or current_user.role == UserRole.SUPER_ADMIN:
        return None  # Super admin no tiene tenant

    if not current_user.tenant_id:
        raise HTTPException(403, "Usuario sin estudio asignado. Contacte: 0993397400")

    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(403, "Estudio no encontrado")

    if not tenant.is_active:
        raise HTTPException(403, "Su cuenta ha sido suspendida. Contacte: 0993397400")

    if tenant.payment_status == "cancelled":
        raise HTTPException(403, "Su suscripción fue cancelada. Contacte: 0993397400")

    # Check trial expiration
    if tenant.payment_status == "trial" and tenant.trial_ends_at:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if today > tenant.trial_ends_at:
            raise HTTPException(
                403,
                f"Su período de prueba venció el {tenant.trial_ends_at}. "
                "Para continuar contacte: 0993397400 (WhatsApp disponible)"
            )

    return tenant


async def require_firm_admin(current_user: User = Depends(get_current_user)) -> User:
    """Solo FIRM_ADMIN, SOLO_LAWYER o SUPER_ADMIN pueden administrar el tenant."""
    allowed = (UserRole.FIRM_ADMIN, UserRole.SUPER_ADMIN, UserRole.SOLO_LAWYER)
    if current_user.role not in allowed and current_user.email != SUPER_ADMIN_EMAIL:
        raise HTTPException(403, "Se requiere perfil de Administrador del estudio")
    return current_user


async def check_user_limit(tenant: Tenant, db: AsyncSession) -> None:
    """Verifica que el plan permita agregar más usuarios."""
    from sqlalchemy import func
    from app.models.user import User as UserModel
    max_users = PLAN_MAX_USERS.get(tenant.plan, 1)
    if max_users == -1:
        return  # bufete_l: unlimited
    count_result = await db.execute(
        select(func.count()).select_from(UserModel).where(
            UserModel.tenant_id == tenant.id,
            UserModel.is_active == True
        )
    )
    current_count = count_result.scalar() or 0
    if current_count >= max_users:
        raise HTTPException(
            403,
            f"Su plan '{tenant.plan}' permite máximo {max_users} usuario(s). "
            "Para ampliar contacte: 0993397400"
        )
