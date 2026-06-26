from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
import csv, io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.billing import Income, Expense, Invoice
from app.models.case import Case
from app.models.client import Client
from datetime import datetime

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/financial-summary")
async def financial_summary(
    year: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    y = year or datetime.now().year
    tid = current_user.tenant_id

    total_income = (await db.execute(
        select(func.sum(Income.amount)).where(
            Income.tenant_id == tid,
            Income.income_date.startswith(str(y)),
        )
    )).scalar() or 0

    total_expenses = (await db.execute(
        select(func.sum(Expense.amount)).where(
            Expense.tenant_id == tid,
            Expense.expense_date.startswith(str(y)),
        )
    )).scalar() or 0

    pending = (await db.execute(
        select(func.sum(Invoice.balance)).where(
            Invoice.tenant_id == tid,
            Invoice.status.in_(["emitida", "enviada", "vencida"]),
        )
    )).scalar() or 0

    return {
        "year": y,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net": total_income - total_expenses,
        "pending_invoices": pending,
    }


@router.get("/cases-by-matter")
async def cases_by_matter(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Case.matter, func.count().label("count"))
        .where(Case.tenant_id == current_user.tenant_id, Case.is_archived == False)
        .group_by(Case.matter)
        .order_by(func.count().desc())
    )
    return {"data": [{"matter": r.matter, "count": r.count} for r in result]}


@router.get("/cases-by-status")
async def cases_by_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Case.status, func.count().label("count"))
        .where(Case.tenant_id == current_user.tenant_id, Case.is_archived == False)
        .group_by(Case.status)
    )
    return {"data": [{"status": r.status.value if hasattr(r.status, "value") else r.status, "count": r.count} for r in result]}


@router.get("/income-by-month")
async def income_by_month(
    year: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    y = year or datetime.now().year
    result = await db.execute(
        select(
            func.substring(Income.income_date, 1, 7).label("month"),
            func.sum(Income.amount).label("total"),
        )
        .where(Income.tenant_id == current_user.tenant_id, Income.income_date.startswith(str(y)))
        .group_by("month")
        .order_by("month")
    )
    return {"year": y, "data": [{"month": r.month, "total": r.total or 0} for r in result]}


@router.get("/top-clients")
async def top_clients(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Client.full_name, func.count(Case.id).label("cases"))
        .join(Case, Case.client_id == Client.id)
        .where(Client.tenant_id == current_user.tenant_id, Case.is_archived == False)
        .group_by(Client.full_name)
        .order_by(func.count(Case.id).desc())
        .limit(limit)
    )
    return {"data": [{"client": r.full_name, "cases": r.cases} for r in result]}


@router.get("/export/income-csv")
async def export_income_csv(
    year: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export income data as CSV"""
    from app.models.client import Client
    y = year or datetime.now().year
    result = await db.execute(
        select(Income).where(Income.tenant_id == current_user.tenant_id, Income.income_date.startswith(str(y)))
        .order_by(Income.income_date.desc())
    )
    items = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Fecha", "Descripcion", "Categoria", "Monto (Gs.)", "Metodo de Pago"])
    for i in items:
        writer.writerow([
            i.income_date, i.description, i.category or "",
            f"{i.amount:.0f}", i.payment_method or ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ingresos_{y}.csv"}
    )


@router.get("/export/expenses-csv")
async def export_expenses_csv(
    year: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export expenses as CSV"""
    y = year or datetime.now().year
    result = await db.execute(
        select(Expense).where(Expense.tenant_id == current_user.tenant_id, Expense.expense_date.startswith(str(y)))
        .order_by(Expense.expense_date.desc())
    )
    items = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Fecha", "Descripcion", "Categoria", "Monto (Gs.)", "Facturable"])
    for i in items:
        writer.writerow([
            i.expense_date, i.description, i.category or "",
            f"{i.amount:.0f}", "Si" if i.is_reimbursable else "No"
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=gastos_{y}.csv"}
    )


def _csv_response(rows: list, header: list, filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(header)
    for r in rows:
        writer.writerow(r)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/financial-csv")
async def export_financial_csv(
    year: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reporte Financiero: ingresos, gastos y resultado neto del año."""
    y = year or datetime.now().year
    tid = current_user.tenant_id
    total_income = (await db.execute(
        select(func.sum(Income.amount)).where(Income.tenant_id == tid, Income.income_date.startswith(str(y)))
    )).scalar() or 0
    total_expenses = (await db.execute(
        select(func.sum(Expense.amount)).where(Expense.tenant_id == tid, Expense.expense_date.startswith(str(y)))
    )).scalar() or 0
    pending = (await db.execute(
        select(func.sum(Invoice.balance)).where(
            Invoice.tenant_id == tid, Invoice.status.in_(["emitida", "enviada", "vencida"])
        )
    )).scalar() or 0
    rows = [
        ["Ingresos", f"{total_income:.0f}"],
        ["Gastos", f"{total_expenses:.0f}"],
        ["Resultado neto", f"{(total_income - total_expenses):.0f}"],
        ["Facturas por cobrar", f"{pending:.0f}"],
    ]
    return _csv_response(rows, ["Concepto", f"Monto Gs. ({y})"], f"reporte_financiero_{y}.csv")


@router.get("/export/cases-csv")
async def export_cases_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cartera de Casos: estado actual de todos los expedientes."""
    result = await db.execute(
        select(Case).where(Case.tenant_id == current_user.tenant_id, Case.is_archived == False)
        .order_by(Case.opened_at.desc())
    )
    cases = result.scalars().all()
    rows = []
    for c in cases:
        status = c.status.value if hasattr(c.status, "value") else c.status
        rows.append([c.reference, c.title, c.matter, status, c.court or "", c.opened_at or "", f"{c.agreed_fee:.0f}" if c.agreed_fee else ""])
    return _csv_response(
        rows,
        ["Referencia", "Caratula", "Materia", "Estado", "Juzgado", "Apertura", "Honorario Gs."],
        "cartera_casos.csv",
    )


@router.get("/export/clients-csv")
async def export_clients_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Nómina de Clientes: listado completo."""
    result = await db.execute(
        select(Client).where(Client.tenant_id == current_user.tenant_id, Client.is_active == True)
        .order_by(Client.full_name)
    )
    clients = result.scalars().all()
    rows = [[
        c.full_name, c.type, c.document_number or c.ruc or "",
        c.email or "", c.phone or "", c.city or "", c.department or "",
    ] for c in clients]
    return _csv_response(
        rows,
        ["Nombre", "Tipo", "Documento", "Email", "Telefono", "Ciudad", "Departamento"],
        "nomina_clientes.csv",
    )


@router.get("/export/accounting-csv")
async def export_accounting_csv(
    year: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Libro Diario: asientos contables del período."""
    from app.models.accounting import AccountingEntry
    y = year or datetime.now().year
    result = await db.execute(
        select(AccountingEntry).where(
            AccountingEntry.tenant_id == current_user.tenant_id,
            AccountingEntry.entry_date.startswith(str(y)),
        ).order_by(AccountingEntry.entry_date, AccountingEntry.entry_number)
    )
    entries = result.scalars().all()
    rows = [[
        e.entry_number, e.entry_date, e.concept,
        e.account_debit, e.account_credit, f"{e.amount:.0f}", e.currency,
    ] for e in entries]
    return _csv_response(
        rows,
        ["Asiento", "Fecha", "Concepto", "Debe", "Haber", "Monto", "Moneda"],
        f"libro_diario_{y}.csv",
    )
