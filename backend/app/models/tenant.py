import uuid
from sqlalchemy import String, Boolean, Integer, Float, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin
from datetime import datetime, timezone


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200))
    legal_name: Mapped[str | None] = mapped_column(String(300))
    ruc: Mapped[str | None] = mapped_column(String(20))
    timbrado: Mapped[str | None] = mapped_column(String(20))
    timbrado_expires: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(String(300))
    city: Mapped[str | None] = mapped_column(String(100), default="Asunción")
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(200))
    logo_url: Mapped[str | None] = mapped_column(String(500))

    # Plan & Subscription
    plan: Mapped[str] = mapped_column(String(20), default="solo")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    trial_ends_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    subscription_started_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    subscription_expires_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    last_payment_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    next_payment_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    payment_status: Mapped[str] = mapped_column(String(20), default="trial")  # trial, active, overdue, cancelled
    payment_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # DB isolation: each tenant gets its own PostgreSQL schema
    db_schema: Mapped[str | None] = mapped_column(String(60), nullable=True)

    # Billing config
    invoice_counter: Mapped[int] = mapped_column(Integer, default=1)

    # Admin contact
    admin_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    admin_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    admin_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Source / notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    referral_source: Mapped[str | None] = mapped_column(String(100), nullable=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
