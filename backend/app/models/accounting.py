import uuid
from sqlalchemy import String, Boolean, Text, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin
from typing import Optional

class AccountingEntry(Base, TimestampMixin, TenantMixin):
    __tablename__ = "accounting_entries"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entry_number: Mapped[str] = mapped_column(String(20))
    entry_date: Mapped[str] = mapped_column(String(20), index=True)
    concept: Mapped[str] = mapped_column(String(500))
    account_debit: Mapped[str] = mapped_column(String(100))
    account_credit: Mapped[str] = mapped_column(String(100))
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(5), default="PYG")
    reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class ReimbursableExpense(Base, TimestampMixin, TenantMixin):
    __tablename__ = "reimbursable_expenses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    description: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(50), default="judicial")
    amount: Mapped[float] = mapped_column(Float)
    expense_date: Mapped[str] = mapped_column(String(20))
    is_billed: Mapped[bool] = mapped_column(Boolean, default=False)
    case_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    client_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    invoice_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
