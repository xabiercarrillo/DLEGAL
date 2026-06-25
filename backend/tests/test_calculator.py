"""Tests — Calculadora jurídica Paraguay (Ley 213/93)"""
import pytest
from httpx import AsyncClient

SALARIO_MINIMO = 2_680_373


@pytest.mark.asyncio
async def test_liquidacion_sin_causa(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/v1/calculator/laboral-liquidation", json={
        "salario_mensual": SALARIO_MINIMO,
        "fecha_ingreso": "2021-01-01",
        "fecha_egreso": "2024-01-01",
        "tipo_egreso": "despido_injustificado",
        "vacaciones_pendientes_dias": 15,
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "desglose" in data
    # calculator returns total_bruto or total_neto
    total = data.get("total_bruto") or data.get("total_neto") or data.get("total", 0)
    assert total > SALARIO_MINIMO, f"Expected total > {SALARIO_MINIMO}, got {total}. Keys: {list(data.keys())}"


@pytest.mark.asyncio
async def test_liquidacion_renuncia(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/v1/calculator/laboral-liquidation", json={
        "salario_mensual": 5_000_000,
        "fecha_ingreso": "2022-01-01",
        "fecha_egreso": "2024-01-01",
        "tipo_egreso": "renuncia",
        "vacaciones_pendientes_dias": 10,
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    total = data.get("total_bruto") or data.get("total_neto") or data.get("total", 0)
    assert total >= 0


@pytest.mark.asyncio
async def test_intereses_legales(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/v1/calculator/interests", json={
        "capital": 10_000_000,
        "tasa_anual": 24.0,
        "fecha_inicio": "2023-01-01",
        "fecha_fin": "2024-01-01",
        "tipo": "simple",
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    total = data.get("total") or data.get("total_con_intereses") or data.get("amount", 0)
    assert total >= 10_000_000


@pytest.mark.asyncio
async def test_liquidacion_salario_elevado(client: AsyncClient, auth_headers: dict):
    r = await client.post("/api/v1/calculator/laboral-liquidation", json={
        "salario_mensual": 10_000_000,
        "fecha_ingreso": "2014-01-01",
        "fecha_egreso": "2024-01-01",
        "tipo_egreso": "despido_injustificado",
        "vacaciones_pendientes_dias": 20,
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    total = data.get("total_bruto") or data.get("total_neto") or data.get("total", 0)
    assert total > 0
