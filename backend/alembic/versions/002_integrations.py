"""Integration tables v2 — XLegal

Revision ID: 002_integrations
Revises: 001_initial
Create Date: 2024-03-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '002_integrations'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Crea las tablas de integraciones v2 si no existen."""

    # tenant_integrations
    op.execute("""
        CREATE TABLE IF NOT EXISTS tenant_integrations (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id VARCHAR(36) NOT NULL,
            provider VARCHAR(50) NOT NULL,
            is_enabled BOOLEAN DEFAULT TRUE,
            config JSON,
            notes TEXT,
            access_token TEXT,
            refresh_token TEXT,
            token_expires_at VARCHAR(30),
            scope TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id, provider)
        )
    """)

    # outbound_webhooks
    op.execute("""
        CREATE TABLE IF NOT EXISTS outbound_webhooks (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id VARCHAR(36) NOT NULL,
            name VARCHAR(200) NOT NULL,
            url TEXT NOT NULL,
            events TEXT,
            secret VARCHAR(200),
            is_active BOOLEAN DEFAULT TRUE,
            failure_count INTEGER DEFAULT 0,
            last_triggered_at VARCHAR(30),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)

    # esign_requests
    op.execute("""
        CREATE TABLE IF NOT EXISTS esign_requests (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id VARCHAR(36) NOT NULL,
            document_id VARCHAR(36),
            provider VARCHAR(30) NOT NULL,
            external_id VARCHAR(200),
            status VARCHAR(50) DEFAULT 'pending',
            signers TEXT,
            expires_at VARCHAR(30),
            completed_at VARCHAR(30),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)

    # payment_transactions
    op.execute("""
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id VARCHAR(36) NOT NULL,
            client_id VARCHAR(36),
            case_id VARCHAR(36),
            invoice_id VARCHAR(36),
            provider VARCHAR(30) NOT NULL,
            external_id VARCHAR(200),
            amount FLOAT NOT NULL,
            currency VARCHAR(10) DEFAULT 'PYG',
            status VARCHAR(30) DEFAULT 'pending',
            description TEXT,
            payment_url TEXT,
            paid_at VARCHAR(30),
            tx_metadata JSON,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)

    # Add whatsapp_number to users if not exists
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30),
        ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN DEFAULT FALSE
    """)

    # Add whatsapp to clients if not exists
    op.execute("""
        ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS payment_transactions")
    op.execute("DROP TABLE IF EXISTS esign_requests")
    op.execute("DROP TABLE IF EXISTS outbound_webhooks")
    op.execute("DROP TABLE IF EXISTS tenant_integrations")

    # Add shared_with_client to documents if not exists
    op.execute("""
        ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS document_type VARCHAR(80),
        ADD COLUMN IF NOT EXISTS file_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS description VARCHAR(500)
    """)
