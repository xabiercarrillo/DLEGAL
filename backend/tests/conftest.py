"""
XLegal — Test configuration
Uses SQLite in-memory for fast isolated tests.
"""
import pytest
import pytest_asyncio
import asyncio
import uuid
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.models.client import Client
from app.models.case import Case, CaseStatus

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = async_sessionmaker(engine_test, expire_on_commit=False)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSession() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSession() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ── Session-scoped seed data (created once, reused) ──────────────────────

@pytest_asyncio.fixture(scope="session")
async def seed_data():
    """Create one tenant + admin user for the whole test session."""
    async with TestingSession() as db:
        tid = str(uuid.uuid4())
        uid = str(uuid.uuid4())
        cid = str(uuid.uuid4())
        case_id = str(uuid.uuid4())

        t = Tenant(id=tid, name="Test Bufete", plan="bufete_s", is_active=True, payment_status="active")
        db.add(t)

        u = User(
            id=uid, tenant_id=tid,
            email=f"admin_{tid[:8]}@test.py",
            hashed_password=hash_password("Test1234!"),
            full_name="Admin Test",
            role=UserRole.FIRM_ADMIN,
            is_active=True,
        )
        db.add(u)

        cl = Client(
            id=cid, tenant_id=tid,
            full_name="Juan Pérez", type="individual",
            document_number="1234567", email="juan@test.py",
            phone="0981111111", city="Asunción",
        )
        db.add(cl)

        c = Case(
            id=case_id, tenant_id=tid,
            reference="EXP-001-2024",
            title="Test vs Demandado",
            matter="civil",
            status=CaseStatus.ACTIVE,
            client_id=cid,
            opened_at="2024-01-15",
        )
        db.add(c)
        await db.commit()

    return {
        "tenant_id": tid,
        "user_id": uid,
        "user_email": f"admin_{tid[:8]}@test.py",
        "client_id": cid,
        "case_id": case_id,
    }


@pytest.fixture
def tenant(seed_data):
    class T:
        id = seed_data["tenant_id"]
        name = "Test Bufete"
        plan = "bufete_s"
    return T()


@pytest.fixture
def admin_user(seed_data):
    class U:
        id = seed_data["user_id"]
        email = seed_data["user_email"]
        tenant_id = seed_data["tenant_id"]
    return U()


@pytest.fixture
def auth_headers(seed_data):
    token = create_access_token(seed_data["user_id"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_client_record(seed_data):
    class C:
        id = seed_data["client_id"]
        full_name = "Juan Pérez"
    return C()


@pytest.fixture
def test_case(seed_data):
    class CS:
        id = seed_data["case_id"]
        title = "Test vs Demandado"
        matter = "civil"
    return CS()
