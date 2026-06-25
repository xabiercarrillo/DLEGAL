from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.models.user import User
from datetime import date

router = APIRouter(prefix="/calculator", tags=["calculator"])

SALARIO_MINIMO_2024 = 2_680_373

class LaboralRequest(BaseModel):
    salario_mensual: float
    fecha_ingreso: str
    fecha_egreso: str
    tipo_egreso: str = "despido_injustificado"
    vacaciones_pendientes_dias: int = 0

class InteresesRequest(BaseModel):
    capital: float
    tasa_anual: float = 24.0
    fecha_inicio: str
    fecha_fin: str
    tipo: str = "simple"

@router.post("/laboral-liquidation")
async def calcular_laboral(data: LaboralRequest, current_user: User = Depends(get_current_user)):
    fecha_ingreso = date.fromisoformat(data.fecha_ingreso)
    fecha_egreso = date.fromisoformat(data.fecha_egreso)
    delta = fecha_egreso - fecha_ingreso
    dias_trabajados = delta.days
    meses_trabajados = dias_trabajados / 30.44
    años_trabajados = dias_trabajados / 365.25

    salario = max(data.salario_mensual, SALARIO_MINIMO_2024)
    salario_diario = salario / 30

    desglose = []

    # Preaviso (Art. 87 CLab)
    if data.tipo_egreso == "despido_injustificado":
        if años_trabajados < 1: preaviso_dias = 30
        elif años_trabajados < 5: preaviso_dias = 45
        else: preaviso_dias = 60
        preaviso = salario_diario * preaviso_dias
        desglose.append({"concepto": f"Preaviso (Art. 87) — {preaviso_dias} días", "monto": preaviso})

        # Indemnización (Art. 91 CLab) — 15 días/año
        indem = salario_diario * 15 * años_trabajados
        desglose.append({"concepto": f"Indemnización (Art. 91) — {años_trabajados:.1f} años", "monto": indem})

    # Vacaciones (Art. 219 CLab)
    if años_trabajados < 5: vac_dias_año = 12
    elif años_trabajados < 10: vac_dias_año = 18
    else: vac_dias_año = 30

    meses_en_año = (fecha_egreso.month - 1 + fecha_egreso.day / 30) % 12
    vac_proporcional = salario_diario * vac_dias_año * (meses_en_año / 12)
    if data.vacaciones_pendientes_dias > 0:
        vac_pendientes = salario_diario * data.vacaciones_pendientes_dias
        desglose.append({"concepto": f"Vacaciones pendientes — {data.vacaciones_pendientes_dias} días", "monto": vac_pendientes})
    desglose.append({"concepto": f"Vacaciones proporcionales (Art. 219)", "monto": vac_proporcional})

    # Aguinaldo proporcional (Art. 243 CLab)
    meses_en_año_actual = fecha_egreso.month + fecha_egreso.day / 30
    aguinaldo = salario / 12 * min(meses_en_año_actual, 12)
    desglose.append({"concepto": "Aguinaldo proporcional (Art. 243)", "monto": aguinaldo})

    total_bruto = sum(i["monto"] for i in desglose)
    iips = salario * 0.09  # IPS 9%

    return {
        "salario_base": salario,
        "salario_diario": round(salario_diario, 0),
        "años_trabajados": round(años_trabajados, 2),
        "meses_trabajados": round(meses_trabajados, 1),
        "dias_trabajados": dias_trabajados,
        "desglose": [{"concepto": i["concepto"], "monto": round(i["monto"], 0)} for i in desglose],
        "total_bruto": round(total_bruto, 0),
        "iips": round(iips, 0),
        "total_neto": round(total_bruto - iips, 0),
        "salario_minimo_referencia": SALARIO_MINIMO_2024,
        "nota": "Cálculo según Ley N° 213/93. Solo orientativo.",
    }

@router.post("/interests")
async def calcular_intereses(data: InteresesRequest, current_user: User = Depends(get_current_user)):
    fecha_inicio = date.fromisoformat(data.fecha_inicio)
    fecha_fin = date.fromisoformat(data.fecha_fin)
    dias = (fecha_fin - fecha_inicio).days
    tasa_diaria = data.tasa_anual / 100 / 365

    if data.tipo == "simple":
        intereses = data.capital * tasa_diaria * dias
        total = data.capital + intereses
    else:
        total = data.capital * (1 + tasa_diaria) ** dias
        intereses = total - data.capital

    return {
        "capital": data.capital,
        "tasa_anual": data.tasa_anual,
        "tipo": data.tipo,
        "dias": dias,
        "intereses": round(intereses, 0),
        "total": round(total, 0),
    }
