import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin

class Hearing(Base, TimestampMixin, TenantMixin):
    __tablename__ = "hearings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"))
    lawyer_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(50), default="ordinaria")
    status: Mapped[str] = mapped_column(String(30), default="programada")
    title: Mapped[str] = mapped_column(String(300))
    scheduled_at: Mapped[str] = mapped_column(String(50))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    court: Mapped[str | None] = mapped_column(String(300))
    room: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    result: Mapped[str | None] = mapped_column(Text)
    google_event_id: Mapped[str | None] = mapped_column(String(200))

    case: Mapped["Case"] = relationship("Case", back_populates="hearings")
    lawyer: Mapped["User"] = relationship("User", foreign_keys=[lawyer_id])
