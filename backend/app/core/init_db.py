"""
XLegal — Inicialización de datos al arrancar
Crea Super Admin si no existe. Se llama en startup event.
"""
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import hash_password
from app.core.config import settings

SUPER_ADMIN_EMAIL = "xabiercarrillo@gmail.com"


async def create_initial_data(db: AsyncSession) -> None:
    """Crea datos iniciales: Super Admin. Idempotente (se puede llamar múltiples veces)."""
    from app.models.user import User, UserRole

    # Check if super admin already exists
    result = await db.execute(select(User).where(User.email == SUPER_ADMIN_EMAIL))
    if result.scalar_one_or_none():
        return  # Already seeded

    # Create Super Admin
    super_admin = User(
        id=str(uuid.uuid4()),
        tenant_id=None,
        email=SUPER_ADMIN_EMAIL,
        hashed_password=hash_password(settings.FIRST_SUPERUSER_PASSWORD),
        full_name="Super Admin XLegal",
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )
    db.add(super_admin)
    await db.commit()
    print(f"[XLegal] ✅ Super Admin creado: {SUPER_ADMIN_EMAIL}")
