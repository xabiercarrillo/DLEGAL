"""Tests — Clients module"""
import pytest
from httpx import AsyncClient
from app.models.client import Client


@pytest.mark.asyncio
async def test_list_clients_empty(client: AsyncClient, auth_headers: dict, tenant):
    r = await client.get("/api/v1/clients", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_create_client_individual(client: AsyncClient, auth_headers: dict):
    payload = {
        "full_name": "María García",
        "type": "individual",
        "document_number": "9876543",
        "email": "maria@test.py",
        "phone": "0982222222",
        "city": "Asunción",
    }
    r = await client.post("/api/v1/clients", json=payload, headers=auth_headers)
    assert r.status_code == 201
    assert "id" in r.json()


@pytest.mark.asyncio
async def test_create_client_company(client: AsyncClient, auth_headers: dict):
    payload = {
        "full_name": "Empresa SA",
        "type": "company",
        "ruc": "80123456-7",
        "email": "empresa@test.py",
        "city": "Asunción",
    }
    r = await client.post("/api/v1/clients", json=payload, headers=auth_headers)
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_list_clients_with_data(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    r = await client.get("/api/v1/clients", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    ids = [c["id"] for c in data["items"]]
    assert test_client_record.id in ids


@pytest.mark.asyncio
async def test_get_client_detail(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    r = await client.get(f"/api/v1/clients/{test_client_record.id}/detail", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == test_client_record.id
    assert "cases" in data
    assert "total_income" in data


@pytest.mark.asyncio
async def test_update_client(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    r = await client.put(
        f"/api/v1/clients/{test_client_record.id}",
        json={"phone": "0991234567", "city": "Ciudad del Este"},
        headers=auth_headers,
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_get_client_not_found(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/clients/nonexistent-id/detail", headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_search_clients(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    r = await client.get("/api/v1/clients?search=Juan", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert any("Juan" in c["full_name"] for c in data["items"])
