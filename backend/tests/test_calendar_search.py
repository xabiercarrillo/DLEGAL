"""Tests — Calendar aggregation and global search"""
import pytest
from httpx import AsyncClient
from app.models.case import Case
from app.models.client import Client


@pytest.mark.asyncio
async def test_calendar_events_empty(client: AsyncClient, auth_headers: dict):
    r = await client.get(
        "/api/v1/calendar/events?start=2025-01-01T00:00:00&end=2025-01-31T23:59:59",
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert "events" in data
    assert isinstance(data["events"], list)


@pytest.mark.asyncio
async def test_calendar_events_with_data(client: AsyncClient, auth_headers: dict, test_case: Case):
    # Create hearing in April 2025
    await client.post("/api/v1/hearings", json={
        "case_id": test_case.id,
        "title": "Audiencia calendario test",
        "scheduled_at": "2025-04-10T10:00:00",
        "type": "preliminar",
    }, headers=auth_headers)
    # Create deadline in April 2025
    await client.post("/api/v1/deadlines", json={
        "title": "Plazo calendario test",
        "due_date": "2025-04-20",
        "type": "procesal",
        "priority": "high",
    }, headers=auth_headers)

    r = await client.get(
        "/api/v1/calendar/events?start=2025-04-01T00:00:00&end=2025-04-30T23:59:59",
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 2
    types = [e["type"] for e in data["events"]]
    assert "hearing" in types
    assert "deadline" in types


@pytest.mark.asyncio
async def test_calendar_events_type_colors(client: AsyncClient, auth_headers: dict, test_case: Case):
    """Events must have correct color codes by type."""
    await client.post("/api/v1/hearings", json={
        "case_id": test_case.id,
        "title": "Audiencia colores",
        "scheduled_at": "2025-05-10T10:00:00",
        "type": "oral",
    }, headers=auth_headers)
    r = await client.get(
        "/api/v1/calendar/events?start=2025-05-01&end=2025-05-31",
        headers=auth_headers,
    )
    assert r.status_code == 200
    for evt in r.json()["events"]:
        if evt["type"] == "hearing":
            assert evt["color"] == "#8b5cf6"
        elif evt["type"] == "deadline":
            assert evt["color"] == "#ef4444"
        elif evt["type"] == "appointment":
            assert evt["color"] == "#3b82f6"


# ── Search ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_global_search_cases(client: AsyncClient, auth_headers: dict, test_case: Case):
    r = await client.get("/api/v1/search?q=Test vs", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "results" in data
    case_results = [res for res in data["results"] if res["type"] == "case"]
    assert any(test_case.id == c["id"] for c in case_results)


@pytest.mark.asyncio
async def test_global_search_clients(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    r = await client.get("/api/v1/search?q=Juan", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    client_results = [res for res in data["results"] if res["type"] == "client"]
    assert len(client_results) >= 1


@pytest.mark.asyncio
async def test_global_search_short_query(client: AsyncClient, auth_headers: dict):
    """Queries less than 2 chars should be rejected."""
    r = await client.get("/api/v1/search?q=a", headers=auth_headers)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_global_search_no_results(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/search?q=zzzzqqqxxx", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 0
    assert data["results"] == []
