import uuid
from sqlalchemy import String, Boolean, Text, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin
import enum

class GoalType(str, enum.Enum):
    INCOME = "ingresos"; CASES = "casos"; CLIENTS = "clientes"
    HOURS = "horas"; INVOICES = "facturas"
    BILLING = "facturacion"; CUSTOM = "personalizado"

class Goal(Base, TimestampMixin, TenantMixin):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Texto libre (no enum nativo) para aceptar cualquier tipo definido en el frontend:
    # ingresos, casos, clientes, horas, facturas, etc.
    type: Mapped[str] = mapped_column(String(30), default="ingresos")
    title: Mapped[str] = mapped_column(String(300))
    target_value: Mapped[float] = mapped_column(Float)
    current_value: Mapped[float] = mapped_column(Float, default=0)
    unit: Mapped[str] = mapped_column(String(20), default="₲")
    start_date: Mapped[str] = mapped_column(String(20))
    end_date: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    @property
    def progress_pct(self) -> float:
        if self.target_value == 0:
            return 0
        return min(100, round((self.current_value / self.target_value) * 100, 1))
