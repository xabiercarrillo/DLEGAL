"""
XLegal — Audit Log
Registra todas las operaciones críticas: quién hizo qué y cuándo.
Inmutable por diseño (solo INSERT, nunca UPDATE/DELETE).
"""
import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin

class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str | None] = mapped_column(String(36), index=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    user_email: Mapped[str | None] = mapped_column(String(200))  # snapshot
    action: Mapped[str] = mapped_column(String(50))  # CREATE, UPDATE, DELETE, LOGIN, EXPORT
    resource: Mapped[str] = mapped_column(String(50))  # case, client, invoice, etc.
    resource_id: Mapped[str | None] = mapped_column(String(36))
    detail: Mapped[str | None] = mapped_column(Text)  # JSON description
    ip_address: Mapped[str | None] = mapped_column(String(45))
