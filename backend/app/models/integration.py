"""
XLegal — Integraciones por tenant
Cada estudio configura sus propias keys de terceros.
Los valores sensibles se almacenan cifrados en DB.
"""
import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin

class TenantIntegration(Base, TimestampMixin):
    __tablename__ = "tenant_integrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True)

    # Identificador de la integración
    provider: Mapped[str] = mapped_column(String(50), index=True)
    # stripe | mercadopago | bancard | paypal
    # pandadoc | docusign | signnow
    # twilio | sendgrid | vonage
    # google_calendar | zoom | google_meet
    # s3 | r2 | gcs | dropbox
    # openai | anthropic | cohere
    # google_maps | mapbox
    # zapier | make | n8n
    # pusher

    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Credenciales (JSON con keys cifradas en prod con Fernet)
    config: Mapped[dict] = mapped_column(JSON, default=dict)

    # Metadata OAuth si aplica
    access_token: Mapped[str | None] = mapped_column(Text)
    refresh_token: Mapped[str | None] = mapped_column(Text)
    token_expires_at: Mapped[str | None] = mapped_column(String(30))
    scope: Mapped[str | None] = mapped_column(String(500))

    # Webhook URL de esta integración (si aplica)
    webhook_url: Mapped[str | None] = mapped_column(String(500))
    webhook_secret: Mapped[str | None] = mapped_column(String(200))

    notes: Mapped[str | None] = mapped_column(Text)


class OutboundWebhook(Base, TimestampMixin):
    """Webhooks que XLegal dispara hacia sistemas externos (Zapier, n8n, Make)."""
    __tablename__ = "outbound_webhooks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(String(500))
    events: Mapped[str] = mapped_column(Text)  # JSON array: ["case.created", "payment.received"]
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    secret: Mapped[str | None] = mapped_column(String(100))  # HMAC secret
    last_triggered_at: Mapped[str | None] = mapped_column(String(30))
    failure_count: Mapped[int] = mapped_column(default=0)


class ESignRequest(Base, TimestampMixin):
    """Registro de documentos enviados para firma electrónica."""
    __tablename__ = "esign_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True)
    document_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("documents.id"))
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"))
    provider: Mapped[str] = mapped_column(String(30), default="pandadoc")  # pandadoc | docusign | signnow
    external_id: Mapped[str | None] = mapped_column(String(200))  # ID en plataforma externa
    status: Mapped[str] = mapped_column(String(30), default="pending")
    # pending | sent | viewed | signed | completed | declined | expired
    signers: Mapped[str | None] = mapped_column(Text)  # JSON: [{name, email, status}]
    document_url: Mapped[str | None] = mapped_column(String(500))
    audit_trail_url: Mapped[str | None] = mapped_column(String(500))
    completed_at: Mapped[str | None] = mapped_column(String(30))
    expires_at: Mapped[str | None] = mapped_column(String(30))
    notes: Mapped[str | None] = mapped_column(Text)


class PaymentTransaction(Base, TimestampMixin):
    """Historial de transacciones de pago recibidas."""
    __tablename__ = "payment_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True)
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id"))
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"))
    invoice_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("invoices.id"))
    provider: Mapped[str] = mapped_column(String(30))  # stripe | mercadopago | bancard | paypal
    external_id: Mapped[str | None] = mapped_column(String(200))  # charge ID externo
    amount: Mapped[float] = mapped_column(default=0)
    currency: Mapped[str] = mapped_column(String(5), default="PYG")
    status: Mapped[str] = mapped_column(String(30), default="pending")
    # pending | processing | completed | failed | refunded | cancelled
    payment_method: Mapped[str | None] = mapped_column(String(50))  # card | bank_transfer | qr
    description: Mapped[str | None] = mapped_column(String(500))
    tx_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    payment_url: Mapped[str | None] = mapped_column(String(500))
    receipt_url: Mapped[str | None] = mapped_column(String(500))
    paid_at: Mapped[str | None] = mapped_column(String(30))
    error_message: Mapped[str | None] = mapped_column(Text)
