"""
XLegal — Database con aislamiento por schema PostgreSQL.
Cada tenant recibe su propio schema (t_<tenant_id_short>).
Row-level isolation via tenant_id para operaciones estándar.
Schema isolation disponible para entornos que lo requieran.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tenant_schema(schema_name: str) -> bool:
    """
    Crear schema PostgreSQL aislado para un nuevo tenant.
    Llamado automáticamente al registrar un nuevo cliente.
    El schema_name se guarda en Tenant.db_schema.
    """
    if not schema_name or not schema_name.startswith("t_"):
        return False
    # Sanitize: only alphanumeric and underscore
    safe_name = "".join(c for c in schema_name if c.isalnum() or c == "_")
    try:
        async with engine.begin() as conn:
            await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{safe_name}"'))
            # Grant to the xlegal user
            await conn.execute(text(f'GRANT ALL ON SCHEMA "{safe_name}" TO xlegal'))
        return True
    except Exception as e:
        print(f"⚠️  Schema creation failed for {safe_name}: {e}")
        return False


async def drop_tenant_schema(schema_name: str) -> bool:
    """Eliminar schema de un tenant cancelado (con CASCADE)."""
    if not schema_name or not schema_name.startswith("t_"):
        return False
    safe_name = "".join(c for c in schema_name if c.isalnum() or c == "_")
    try:
        async with engine.begin() as conn:
            await conn.execute(text(f'DROP SCHEMA IF EXISTS "{safe_name}" CASCADE'))
        return True
    except Exception as e:
        print(f"⚠️  Schema drop failed for {safe_name}: {e}")
        return False
