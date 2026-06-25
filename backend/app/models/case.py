import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, Float, Date, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin
import enum

class CaseStatus(str, enum.Enum):
    NEW = "new"; ACTIVE = "active"; INVESTIGATION = "investigation"
    NEGOTIATION = "negotiation"; TRIAL = "trial"; APPEAL = "appeal"
    RESOLUTION = "resolution"; CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"; CLOSED_SETTLED = "closed_settled"; ARCHIVED = "archived"

class CasePriority(str, enum.Enum):
    LOW = "low"; MEDIUM = "medium"; HIGH = "high"; URGENT = "urgent"; CRITICAL = "critical"

class Case(Base, TimestampMixin, TenantMixin):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reference: Mapped[str] = mapped_column(String(50), index=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[CaseStatus] = mapped_column(SAEnum(CaseStatus), default=CaseStatus.NEW)
    priority: Mapped[CasePriority] = mapped_column(SAEnum(CasePriority), default=CasePriority.MEDIUM)
    matter: Mapped[str] = mapped_column(String(50), default="civil")
    client_id: Mapped[str] = mapped_column(String(36), ForeignKey("clients.id"))
    lawyer_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    court: Mapped[str | None] = mapped_column(String(300))
    court_file_number: Mapped[str | None] = mapped_column(String(100))
    opposing_party: Mapped[str | None] = mapped_column(String(300))
    opposing_lawyer: Mapped[str | None] = mapped_column(String(300))
    agreed_fee: Mapped[float | None] = mapped_column(Float)
    opened_at: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    client: Mapped["Client"] = relationship("Client", back_populates="cases")
    lawyer: Mapped["User"] = relationship("User", foreign_keys=[lawyer_id])
    hearings: Mapped[list["Hearing"]] = relationship("Hearing", back_populates="case")
    deadlines: Mapped[list["Deadline"]] = relationship("Deadline", back_populates="case")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="case")
