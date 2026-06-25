import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin, TenantMixin

class Document(Base, TimestampMixin, TenantMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"))
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id"))
    uploaded_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(300))
    original_name: Mapped[str] = mapped_column(String(300))
    file_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int | None] = mapped_column(Integer)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50), default="general")
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_with_client: Mapped[bool] = mapped_column(Boolean, default=False)
    document_type: Mapped[str | None] = mapped_column(String(80))
    file_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(String(500))
