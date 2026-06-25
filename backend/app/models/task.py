import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin

class Task(Base, TimestampMixin, TenantMixin):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"))
    assigned_to: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="pendiente")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    due_date: Mapped[str | None] = mapped_column(String(20))
    estimated_hours: Mapped[float | None] = mapped_column(Float)
    actual_hours: Mapped[float | None] = mapped_column(Float)

    case: Mapped["Case"] = relationship("Case", back_populates="tasks")
    assignee: Mapped["User"] = relationship("User", foreign_keys=[assigned_to])
