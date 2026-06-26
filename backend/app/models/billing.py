from __future__ import annotations
import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, Float, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin
import enum

class InvoiceStatus(str, enum.Enum):
    BORRADOR = "borrador"; EMITIDA = "emitida"; ENVIADA = "enviada"
    COBRADA = "cobrada"; VENCIDA = "vencida"; ANULADA = "anulada"

class Invoice(Base, TimestampMixin, TenantMixin):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(String(36), ForeignKey("clients.id"))
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"))
    invoice_type: Mapped[str] = mapped_column(String(5), default="B")  # A, B, C, E
    number: Mapped[str] = mapped_column(String(30), index=True)
    timbrado: Mapped[str | None] = mapped_column(String(20))
    timbrado_expires: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[InvoiceStatus] = mapped_column(String(20), default=InvoiceStatus.BORRADOR)
    subtotal: Mapped[float] = mapped_column(Float, default=0)
    iva_rate: Mapped[float] = mapped_column(Float, default=10.0)
    iva_amount: Mapped[float] = mapped_column(Float, default=0)
    total: Mapped[float] = mapped_column(Float, default=0)
    paid_amount: Mapped[float] = mapped_column(Float, default=0)
    balance: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String(5), default="PYG")
    issued_at: Mapped[str | None] = mapped_column(String(20))
    due_date: Mapped[str | None] = mapped_column(String(20))
    paid_at: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)
    lawyer_id: Mapped[str | None] = mapped_column(String(36))
    is_billable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_billed: Mapped[bool] = mapped_column(Boolean, default=False)

    client: Mapped["Client"] = relationship("Client", foreign_keys=[client_id])
    items: Mapped[list["InvoiceItem"]] = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"))
    description: Mapped[str] = mapped_column(String(500))
    quantity: Mapped[float] = mapped_column(Float, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    amount: Mapped[float] = mapped_column(Float, default=0)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")

class Income(Base, TimestampMixin, TenantMixin):
    __tablename__ = "incomes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id"))
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"))
    invoice_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("invoices.id"))
    description: Mapped[str] = mapped_column(String(500))
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(5), default="PYG")
    payment_method: Mapped[str] = mapped_column(String(50), default="efectivo")
    income_date: Mapped[str] = mapped_column(String(20), index=True)
    category: Mapped[str] = mapped_column(String(50), default="honorarios")
    notes: Mapped[str | None] = mapped_column(Text)
    lawyer_id: Mapped[str | None] = mapped_column(String(36))
    is_billable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_billed: Mapped[bool] = mapped_column(Boolean, default=False)

    client: Mapped["Client"] = relationship("Client", foreign_keys=[client_id])
    case: Mapped["Case"] = relationship("Case", foreign_keys=[case_id])


class Expense(Base, TimestampMixin, TenantMixin):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"))
    description: Mapped[str] = mapped_column(String(500))
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(5), default="PYG")
    category: Mapped[str] = mapped_column(String(50), default="oficina")
    expense_date: Mapped[str] = mapped_column(String(20), index=True)
    payment_method: Mapped[str] = mapped_column(String(50), default="efectivo")
    is_reimbursable: Mapped[bool] = mapped_column(Boolean, default=False)
    receipt_url: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    lawyer_id: Mapped[str | None] = mapped_column(String(36))
    is_billable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_billed: Mapped[bool] = mapped_column(Boolean, default=False)

    case: Mapped["Case"] = relationship("Case", foreign_keys=[case_id])
