import uuid
from sqlalchemy import String, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin
import enum

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    FIRM_ADMIN = "firm_admin"
    LAWYER = "lawyer"
    SECRETARY = "secretary"
    SOLO_LAWYER = "solo_lawyer"
    CLIENT_PORTAL = "client_portal"

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(200))
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.LAWYER)
    phone: Mapped[str | None] = mapped_column(String(30))
    whatsapp_number: Mapped[str | None] = mapped_column(String(30))
    bar_number: Mapped[str | None] = mapped_column(String(50))
    specialties: Mapped[str | None] = mapped_column(String(500))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_email: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    openai_api_key: Mapped[str | None] = mapped_column(String(200))

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
