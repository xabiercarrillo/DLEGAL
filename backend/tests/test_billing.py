"""Tests — Billing: invoices, income, expenses"""
import pytest
from httpx import AsyncClient
from app.models.client import Client


@pytest.mark.asyncio
async def test_create_invoice(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    r = await client.post("/api/v1/invoices", json={
        "client_id": test_client_record.id,
        "invoice_type": "B",
        "items": [
            {"description": "Honorarios profesionales — caso civil", "quantity": 1, "unit_price": 2000000},
            {"description": "Gastos judiciales", "quantity": 1, "unit_price": 150000},
        ],
        "issued_at": "2025-03-01",
        "due_date": "2025-03-31",
        "notes": "Honorarios mes de marzo",
    }, headers=auth_headers)
    assert r.status_code == 201
    data = r.json()
    assert "id" in data
    assert "number" in data


@pytest.mark.asyncio
async def test_list_invoices(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    # ensure there's at least one
    await client.post("/api/v1/invoices", json={
        "client_id": test_client_record.id,
        "items": [{"description": "Honorarios", "quantity": 1, "unit_price": 1000000}],
        "issued_at": "2025-03-01",
    }, headers=auth_headers)
    r = await client.get("/api/v1/invoices", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_mark_invoice_paid(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    cr = await client.post("/api/v1/invoices", json={
        "client_id": test_client_record.id,
        "items": [{"description": "Honorarios", "quantity": 1, "unit_price": 3000000}],
        "issued_at": "2025-03-05",
        "status": "emitida",
    }, headers=auth_headers)
    inv_id = cr.json()["id"]
    r = await client.post(f"/api/v1/invoices/{inv_id}/mark-paid", headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_invoice_pdf_url(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    cr = await client.post("/api/v1/invoices", json={
        "client_id": test_client_record.id,
        "items": [{"description": "Asesoría", "quantity": 1, "unit_price": 500000}],
        "issued_at": "2025-03-10",
    }, headers=auth_headers)
    inv_id = cr.json()["id"]
    # PDF endpoint should return HTML or PDF
    r = await client.get(f"/api/v1/invoices/{inv_id}/pdf", headers=auth_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_create_income(client: AsyncClient, auth_headers: dict, test_client_record: Client):
    r = await client.post("/api/v1/income", json={
        "client_id": test_client_record.id,
        "description": "Cobro honorarios civil",
        "amount": 2000000,
        "payment_method": "transferencia",
        "income_date": "2025-03-10",
        "category": "honorarios",
    }, headers=auth_headers)
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_income_stats(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/income/stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_month" in data or "total" in data


@pytest.mark.asyncio
async def test_create_expense(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/v1/expenses", json={
        "description": "Tasas judiciales",
        "amount": 75000,
        "category": "judicial",
        "expense_date": "2025-03-05",
        "is_reimbursable": True,
    }, headers=auth_headers)
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_list_expenses(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/expenses", headers=auth_headers)
    assert r.status_code == 200
    assert "items" in r.json()
