import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin

class Deadline(Base, TimestampMixin, TenantMixin):
    __tablename__ = "deadlines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"))
    lawyer_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50), default="procesal")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    due_date: Mapped[str] = mapped_column(String(20), index=True)
    legal_basis: Mapped[str | None] = mapped_column(String(300))
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[str | None] = mapped_column(String(50))

    case: Mapped["Case"] = relationship("Case", back_populates="deadlines")
    lawyer: Mapped["User"] = relationship("User", foreign_keys=[lawyer_id])
