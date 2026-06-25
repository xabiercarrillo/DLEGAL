"""Tests — Goals, Contacts, Appointments, Reports, Library, Templates, AI"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_goals(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/v1/goals", json={
        "title": "Meta ingresos Q1",
        "type": "ingresos",
        "target_value": 50_000_000,
        "unit": "₲",
        "start_date": "2025-01-01",
        "end_date": "2025-03-31",
    }, headers=auth_headers)
    assert r.status_code == 201
    gid = r.json()["id"]
    r2 = await client.get("/api/v1/goals", headers=auth_headers)
    assert r2.status_code == 200
    ids = [g["id"] for g in r2.json()["items"]]
    assert gid in ids


@pytest.mark.asyncio
async def test_update_goal_progress(client: AsyncClient, auth_headers: dict):
    cr = await client.post("/api/v1/goals", json={
        "title": "Meta casos",
        "type": "casos",
        "target_value": 20,
        "unit": "casos",
        "start_date": "2025-01-01",
        "end_date": "2025-12-31",
    }, headers=auth_headers)
    gid = cr.json()["id"]
    r = await client.put(f"/api/v1/goals/{gid}", json={"current_value": 5}, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["progress_pct"] == 25.0


@pytest.mark.asyncio
async def test_create_contact(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/v1/contacts", json={
        "name": "Dr. Carlos Juez",
        "type": "juez",
        "court": "Juzgado Civil 1°",
        "specialty": "Derecho Civil",
        "phone": "021-444-5678",
    }, headers=auth_headers)
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_favorite_contact(client: AsyncClient, auth_headers: dict):
    cr = await client.post("/api/v1/contacts", json={
        "name": "Dra. Ana Perito", "type": "perito",
    }, headers=auth_headers)
    cid = cr.json()["id"]
    r = await client.post(f"/api/v1/contacts/{cid}/favorite", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["is_favorite"] == True
    r2 = await client.post(f"/api/v1/contacts/{cid}/favorite", headers=auth_headers)
    assert r2.json()["is_favorite"] == False


@pytest.mark.asyncio
async def test_create_appointment(client: AsyncClient, auth_headers: dict, test_client_record):
    r = await client.post("/api/v1/appointments", json={
        "title": "Consulta inicial",
        "scheduled_at": "2025-04-05T14:00:00",
        "client_id": test_client_record.id,
        "type": "consulta_inicial",
        "duration_minutes": 60,
        "location": "Oficina central",
        "fee": 300000,
    }, headers=auth_headers)
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_financial_summary(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/reports/financial-summary?year=2025", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_income" in data or "income" in data or "data" in data


@pytest.mark.asyncio
async def test_cases_by_matter(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/reports/cases-by-matter", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    # could return list or {"data": [...]}
    items = data if isinstance(data, list) else data.get("data", data)
    assert isinstance(items, list)


@pytest.mark.asyncio
async def test_income_by_month(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/reports/income-by-month?year=2025", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    items = data if isinstance(data, list) else data.get("data", [])
    assert isinstance(items, list)


@pytest.mark.asyncio
async def test_library_list(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/library", headers=auth_headers)
    assert r.status_code == 200
    assert "items" in r.json()


@pytest.mark.asyncio
async def test_library_filter_by_area(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/library?area=laboral", headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_list_templates(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/templates", headers=auth_headers)
    assert r.status_code == 200
    assert "items" in r.json()


@pytest.mark.asyncio
async def test_create_and_delete_template(client: AsyncClient, auth_headers: dict):
    cr = await client.post("/api/v1/templates", json={
        "title": "Modelo de prueba",
        "category": "escrito",
        "area": "civil",
        "content": "En la ciudad de Asunción, [FECHA], comparece [NOMBRE] ...",
        "description": "Modelo para pruebas",
    }, headers=auth_headers)
    assert cr.status_code == 201
    tid = cr.json()["id"]
    dr = await client.delete(f"/api/v1/templates/{tid}", headers=auth_headers)
    assert dr.status_code == 200


@pytest.mark.asyncio
async def test_ai_chat_fallback(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/v1/ai/chat", json={
        "messages": [{"role": "user", "content": "¿Cuáles son los plazos procesales en Paraguay?"}]
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "response" in data
    assert len(data["response"]) > 10
