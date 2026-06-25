import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin


class WritingTemplate(Base, TimestampMixin, TenantMixin):
    __tablename__ = "writing_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Override del TenantMixin: las plantillas públicas/globales (is_public=True)
    # no pertenecen a ningún tenant, por eso tenant_id es nullable en este modelo.
    tenant_id: Mapped[str | None] = mapped_column(String(36), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(300))
    category: Mapped[str] = mapped_column(String(50), default="general")  # demanda, contestacion, recurso, contrato, nota, otro
    area: Mapped[str] = mapped_column(String(50), default="civil")  # civil, laboral, penal, familia
    content: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    use_count: Mapped[int] = mapped_column(default=0)
