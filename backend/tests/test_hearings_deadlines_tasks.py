"""Tests — Hearings, Deadlines, Tasks"""
import pytest
from httpx import AsyncClient
from app.models.case import Case


@pytest.mark.asyncio
async def test_create_hearing(client: AsyncClient, auth_headers: dict, test_case: Case):
    r = await client.post("/api/v1/hearings", json={
        "case_id": test_case.id,
        "title": "Audiencia preliminar",
        "scheduled_at": "2025-04-15T09:00:00",
        "type": "preliminar",
        "court": "Juzgado Civil 1° - Asunción",
    }, headers=auth_headers)
    assert r.status_code == 201
    assert "id" in r.json()


@pytest.mark.asyncio
async def test_list_hearings(client: AsyncClient, auth_headers: dict, test_case: Case):
    # create one first
    await client.post("/api/v1/hearings", json={
        "case_id": test_case.id, "title": "Audiencia oral",
        "scheduled_at": "2025-05-01T10:00:00", "type": "oral",
    }, headers=auth_headers)
    r = await client.get("/api/v1/hearings", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_update_hearing(client: AsyncClient, auth_headers: dict, test_case: Case):
    cr = await client.post("/api/v1/hearings", json={
        "case_id": test_case.id, "title": "Audiencia para actualizar",
        "scheduled_at": "2025-06-01T08:00:00", "type": "ordinaria",
    }, headers=auth_headers)
    hid = cr.json()["id"]
    r = await client.put(f"/api/v1/hearings/{hid}", json={
        "status": "realizada", "result": "Se dispuso plazo de prueba"
    }, headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_delete_hearing(client: AsyncClient, auth_headers: dict, test_case: Case):
    cr = await client.post("/api/v1/hearings", json={
        "case_id": test_case.id, "title": "Audiencia a eliminar",
        "scheduled_at": "2025-07-01T09:00:00", "type": "ordinaria",
    }, headers=auth_headers)
    hid = cr.json()["id"]
    r = await client.delete(f"/api/v1/hearings/{hid}", headers=auth_headers)
    assert r.status_code == 200


# ── Deadlines ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_deadline(client: AsyncClient, auth_headers: dict, test_case: Case):
    r = await client.post("/api/v1/deadlines", json={
        "title": "Contestar demanda",
        "due_date": "2025-04-30",
        "case_id": test_case.id,
        "type": "procesal",
        "priority": "high",
    }, headers=auth_headers)
    assert r.status_code == 201
    assert "id" in r.json()


@pytest.mark.asyncio
async def test_list_deadlines_pending(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/deadlines?is_completed=false", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    for d in data["items"]:
        assert d["is_completed"] == False


@pytest.mark.asyncio
async def test_complete_deadline(client: AsyncClient, auth_headers: dict, test_case: Case):
    cr = await client.post("/api/v1/deadlines", json={
        "title": "Plazo a completar",
        "due_date": "2025-05-15",
        "type": "procesal",
        "priority": "medium",
    }, headers=auth_headers)
    did = cr.json()["id"]
    r = await client.post(f"/api/v1/deadlines/{did}/complete", headers=auth_headers)
    assert r.status_code == 200
    # verify completed
    lr = await client.get("/api/v1/deadlines?is_completed=true", headers=auth_headers)
    ids = [d["id"] for d in lr.json()["items"]]
    assert did in ids


# ── Tasks ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_task(client: AsyncClient, auth_headers: dict, test_case: Case):
    r = await client.post("/api/v1/tasks", json={
        "title": "Redactar escrito de demanda",
        "case_id": test_case.id,
        "priority": "high",
        "status": "pendiente",
        "due_date": "2025-04-10",
        "estimated_hours": 4.0,
    }, headers=auth_headers)
    assert r.status_code == 201
    assert "id" in r.json()


@pytest.mark.asyncio
async def test_complete_task(client: AsyncClient, auth_headers: dict):
    cr = await client.post("/api/v1/tasks", json={
        "title": "Tarea de prueba",
        "priority": "low",
        "status": "pendiente",
    }, headers=auth_headers)
    tid = cr.json()["id"]
    r = await client.post(f"/api/v1/tasks/{tid}/complete", headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_list_tasks_by_status(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/tasks?status=pendiente", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    for t in data["items"]:
        assert t["status"] == "pendiente"
