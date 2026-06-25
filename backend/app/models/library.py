import uuid
from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin


class LegalNorm(Base, TimestampMixin):
    __tablename__ = "legal_norms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category: Mapped[str] = mapped_column(String(50), default="ley")  # ley, codigo, decreto, resolucion, convenio
    code: Mapped[str] = mapped_column(String(50))  # "Ley 213/93", "Art. 92 CC", etc.
    title: Mapped[str] = mapped_column(String(500))
    summary: Mapped[str | None] = mapped_column(Text)
    full_text: Mapped[str | None] = mapped_column(Text)
    area: Mapped[str] = mapped_column(String(50), default="laboral")  # laboral, civil, penal, comercial, tributario
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    official_url: Mapped[str | None] = mapped_column(String(500))
