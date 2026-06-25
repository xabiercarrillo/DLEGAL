"""Tests — Users & Settings (profile, password, firm)"""
import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.tenant import Tenant


@pytest.mark.asyncio
async def test_get_my_profile(client: AsyncClient, auth_headers: dict, admin_user: User):
    r = await client.get("/api/v1/users/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == admin_user.email
    assert "has_openai_key" in data


@pytest.mark.asyncio
async def test_update_my_profile(client: AsyncClient, auth_headers: dict):
    r = await client.put("/api/v1/users/me", json={
        "full_name": "Admin Actualizado",
        "phone": "0991234567",
        "bar_number": "CAP-12345",
        "specialties": "Civil, Laboral",
    }, headers=auth_headers)
    assert r.status_code == 200
    # verify update persisted
    r2 = await client.get("/api/v1/users/me", headers=auth_headers)
    assert r2.json()["full_name"] == "Admin Actualizado"
    assert r2.json()["bar_number"] == "CAP-12345"


@pytest.mark.asyncio
async def test_change_password_success(client: AsyncClient, auth_headers: dict):
    r = await client.put("/api/v1/users/me/password", json={
        "current_password": "Test1234!",
        "new_password": "NewPass5678!",
    }, headers=auth_headers)
    assert r.status_code == 200
    # restore original password for other tests
    r2 = await client.put("/api/v1/users/me/password", json={
        "current_password": "NewPass5678!",
        "new_password": "Test1234!",
    }, headers=auth_headers)
    assert r2.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient, auth_headers: dict):
    r = await client.put("/api/v1/users/me/password", json={
        "current_password": "WrongPassword!",
        "new_password": "NewPass5678!",
    }, headers=auth_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_save_openai_key(client: AsyncClient, auth_headers: dict):
    r = await client.put("/api/v1/users/me", json={
        "openai_api_key": "sk-test-1234567890abcdef",
    }, headers=auth_headers)
    assert r.status_code == 200
    r2 = await client.get("/api/v1/users/me", headers=auth_headers)
    assert r2.json()["has_openai_key"] == True


@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, auth_headers: dict, admin_user: User):
    r = await client.get("/api/v1/users", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    ids = [u["id"] for u in data["items"]]
    assert admin_user.id in ids


@pytest.mark.asyncio
async def test_get_tenant_info(client: AsyncClient, auth_headers: dict, tenant: Tenant):
    r = await client.get("/api/v1/tenants/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "name" in data
    assert "plan" in data
    assert "payment_status" in data


@pytest.mark.asyncio
async def test_update_tenant_info(client: AsyncClient, auth_headers: dict):
    r = await client.put("/api/v1/tenants/me", json={
        "name": "Bufete Actualizado",
        "address": "Calle Palma 123, Asunción",
        "city": "Asunción",
        "phone": "021-555-1234",
    }, headers=auth_headers)
    assert r.status_code == 200
    r2 = await client.get("/api/v1/tenants/me", headers=auth_headers)
    assert r2.json()["name"] == "Bufete Actualizado"
