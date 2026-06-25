"""Tests — Auth module"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    r = await client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "XLegal API"
    assert data["country"] == "Paraguay 🇵🇾"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, seed_data: dict):
    r = await client.post("/api/v1/auth/login", json={
        "email": seed_data["user_email"],
        "password": "Test1234!",
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == seed_data["user_email"]
    assert data["user"]["role"] == "firm_admin"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, seed_data: dict):
    r = await client.post("/api/v1/auth/login", json={
        "email": seed_data["user_email"],
        "password": "WrongPass!",
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": "noexiste@test.py",
        "password": "Test1234!",
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers: dict, seed_data: dict):
    r = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == seed_data["user_email"]


@pytest.mark.asyncio
async def test_protected_without_token(client: AsyncClient):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_protected_with_invalid_token(client: AsyncClient):
    r = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid-token"})
    assert r.status_code == 401
