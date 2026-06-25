import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin
from typing import Optional

class Mediation(Base, TimestampMixin, TenantMixin):
    __tablename__ = "mediations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pendiente")
    client_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    case_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    mediation_center: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    mediator_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    opposing_party: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    scheduled_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    agreement_reached: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
