import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin

class Appointment(Base, TimestampMixin, TenantMixin):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id"))
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"))
    lawyer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(50), default="consulta_inicial")
    status: Mapped[str] = mapped_column(String(30), default="programada")
    title: Mapped[str] = mapped_column(String(300))
    scheduled_at: Mapped[str] = mapped_column(String(50))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    location: Mapped[str | None] = mapped_column(String(300))
    notes: Mapped[str | None] = mapped_column(Text)
    fee: Mapped[float | None] = mapped_column(Float)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    remind_24h: Mapped[bool] = mapped_column(Boolean, default=True)
    google_event_id: Mapped[str | None] = mapped_column(String(200))

    client: Mapped["Client"] = relationship("Client", foreign_keys=[client_id])
    lawyer: Mapped["User"] = relationship("User", foreign_keys=[lawyer_id])
