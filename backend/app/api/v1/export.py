"""
XLegal — Exportación completa de datos
Permite migrar a otro sistema. Retorna JSON con todos los datos del tenant.
Política: datos son del cliente, no de XLegal.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user, require_firm_admin
from app.models.user import User
from app.models.client import Client
from app.models.case import Case
from app.models.hearing import Hearing
from app.models.deadline import Deadline
from app.models.task import Task
from app.models.billing import Invoice, Income, Expense
from app.models.document import Document
from app.models.contact import ProfessionalContact
from datetime import datetime
import json, io

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/full-backup")
async def full_backup(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    """
    Exporta TODOS los datos del estudio en formato JSON.
    Descarga como archivo xlegal_backup_YYYYMMDD.json
    Compatible con re-importación a cualquier sistema.
    """
    tid = current_user.tenant_id
    if not tid:
        raise HTTPException(403, "Sin estudio asignado")

    async def fetch(model, **kwargs):
        q = select(model).where(model.tenant_id == tid)
        return (await db.execute(q)).scalars().all()

    def to_dict(obj):
        """Convierte modelo SQLAlchemy a dict serializable."""
        d = {}
        for col in obj.__table__.columns:
            val = getattr(obj, col.name, None)
            if hasattr(val, 'value'):  # Enum
                val = val.value
            elif isinstance(val, datetime):
                val = val.isoformat()
            d[col.name] = val
        return d

    clients = await fetch(Client)
    cases = await fetch(Case)
    hearings = await fetch(Hearing)
    deadlines = await fetch(Deadline)
    tasks = await fetch(Task)
    invoices = await fetch(Invoice)
    incomes = await fetch(Income)
    expenses = await fetch(Expense)
    contacts = await fetch(ProfessionalContact)

    export = {
        "_meta": {
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "exported_by": current_user.email,
            "tenant_id": tid,
            "format": "xlegal-v1",
            "note": "Sus datos le pertenecen. Este archivo puede importarse a cualquier sistema compatible.",
        },
        "clients": [to_dict(x) for x in clients],
        "cases": [to_dict(x) for x in cases],
        "hearings": [to_dict(x) for x in hearings],
        "deadlines": [to_dict(x) for x in deadlines],
        "tasks": [to_dict(x) for x in tasks],
        "invoices": [to_dict(x) for x in invoices],
        "incomes": [to_dict(x) for x in incomes],
        "expenses": [to_dict(x) for x in expenses],
        "contacts": [to_dict(x) for x in contacts],
    }

    date_str = datetime.utcnow().strftime("%Y%m%d")
    content = json.dumps(export, ensure_ascii=False, indent=2, default=str)

    return StreamingResponse(
        iter([content]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=xlegal_backup_{date_str}.json"},
    )


@router.get("/summary")
async def export_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumen de cuántos registros tiene el tenant (sin datos sensibles)."""
    tid = current_user.tenant_id
    if not tid:
        raise HTTPException(403, "Sin estudio asignado")

    async def count(model):
        from sqlalchemy import func
        r = await db.execute(select(func.count()).select_from(model).where(model.tenant_id == tid))
        return r.scalar() or 0

    return {
        "clients": await count(Client),
        "cases": await count(Case),
        "hearings": await count(Hearing),
        "deadlines": await count(Deadline),
        "tasks": await count(Task),
        "invoices": await count(Invoice),
        "incomes": await count(Income),
        "expenses": await count(Expense),
        "contacts": await count(ProfessionalContact),
    }
