import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TenantMixin:
    """
    Mixin para aislamiento multi-tenant por tenant_id.
    Todos los modelos que usen este mixin deben filtrar por tenant_id en CADA query.
    No usa ForeignKey para evitar overhead en tablas de alta escritura.
    La integridad referencial es garantizada a nivel aplicación (deps.py).
    """
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
