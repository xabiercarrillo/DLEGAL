"""Tests — Cases module"""
import pytest
from httpx import AsyncClient
from app.models.case import Case


@pytest.mark.asyncio
async def test_list_cases(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/cases", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_create_case(client: AsyncClient, auth_headers: dict, test_client_record):
    payload = {
        "reference": "TEST-001-2024",
        "title": "Caso de prueba civil",
        "matter": "civil",
        "status": "active",
        "client_id": test_client_record.id,
        "opened_at": "2024-03-01",
        "agreed_fee": 5000000,
    }
    r = await client.post("/api/v1/cases", json=payload, headers=auth_headers)
    assert r.status_code == 201
    assert "id" in r.json()


@pytest.mark.asyncio
async def test_get_case_detail(client: AsyncClient, auth_headers: dict, test_case: Case):
    r = await client.get(f"/api/v1/cases/{test_case.id}/detail", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == test_case.id
    assert "hearings" in data
    assert "deadlines" in data
    assert "tasks" in data


@pytest.mark.asyncio
async def test_update_case_status(client: AsyncClient, auth_headers: dict, test_case: Case):
    r = await client.put(
        f"/api/v1/cases/{test_case.id}",
        json={"status": "trial", "notes": "Juicio iniciado"},
        headers=auth_headers,
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_case_dashboard_stats(client: AsyncClient, auth_headers: dict, test_case: Case):
    r = await client.get("/api/v1/cases/dashboard-stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "active" in data


@pytest.mark.asyncio
async def test_filter_cases_by_matter(client: AsyncClient, auth_headers: dict, test_case: Case):
    r = await client.get("/api/v1/cases?matter=civil", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    for c in data["items"]:
        assert c["matter"] == "civil"


@pytest.mark.asyncio
async def test_archive_case(client: AsyncClient, auth_headers: dict, test_client_record):
    # Create a case to archive
    payload = {
        "reference": "ARCH-001",
        "title": "Caso para archivar",
        "matter": "penal",
        "status": "new",
        "client_id": test_client_record.id,
    }
    r = await client.post("/api/v1/cases", json=payload, headers=auth_headers)
    case_id = r.json()["id"]

    r = await client.delete(f"/api/v1/cases/{case_id}", headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_case_not_found(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/cases/nonexistent-id/detail", headers=auth_headers)
    assert r.status_code == 404
