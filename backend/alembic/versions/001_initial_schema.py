"""Initial schema — XLegal Paraguay

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    XLegal usa create_all en seed.py para el primer deploy.
    Esta migración es un checkpoint para migraciones futuras.
    Si las tablas ya existen (primer despliegue), no hace nada.
    """
    # Tables are created by seed.py via Base.metadata.create_all
    # This migration serves as the baseline for future incremental migrations
    pass


def downgrade() -> None:
    pass
