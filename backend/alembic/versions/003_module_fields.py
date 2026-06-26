"""Campos faltantes de módulos: audiencias, plazos, mediaciones — XLegal

Revision ID: 003_module_fields
Revises: 002_integrations
Create Date: 2026-06-26 00:00:00.000000

Agrega columnas que el frontend ya utilizaba pero el modelo no persistía:
- hearings.judge        (juez/magistrado)
- deadlines.legal_basis (base legal del plazo)
- mediations.case_number(N° de expediente)
Y hace nullable hearings.case_id (audiencias sin caso asignado).
Idempotente: usa IF [NOT] EXISTS para poder correr sobre BD ya parcheada.
"""
from alembic import op

revision = '003_module_fields'
down_revision = '002_integrations'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE hearings ADD COLUMN IF NOT EXISTS judge VARCHAR(200)")
    op.execute("ALTER TABLE hearings ALTER COLUMN case_id DROP NOT NULL")
    op.execute("ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS legal_basis VARCHAR(300)")
    op.execute("ALTER TABLE mediations ADD COLUMN IF NOT EXISTS case_number VARCHAR(100)")


def downgrade() -> None:
    op.execute("ALTER TABLE hearings DROP COLUMN IF EXISTS judge")
    op.execute("ALTER TABLE deadlines DROP COLUMN IF EXISTS legal_basis")
    op.execute("ALTER TABLE mediations DROP COLUMN IF EXISTS case_number")
    # case_id se deja nullable (no se revierte para no romper filas sin caso)
