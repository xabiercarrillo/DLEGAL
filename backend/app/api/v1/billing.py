from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.billing import Invoice, InvoiceItem, InvoiceStatus, Income, Expense
from app.models.client import Client
from app.models.case import Case
import uuid

router = APIRouter(tags=["billing"])

# ─── INVOICES ─────────────────────────────────────────────────
class InvoiceItemIn(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float

class InvoiceCreate(BaseModel):
    client_id: str
    case_id: Optional[str] = None
    invoice_type: str = "B"
    timbrado: Optional[str] = None
    timbrado_expires: Optional[str] = None
    # Modo detallado (líneas) — opcional
    items: Optional[List[InvoiceItemIn]] = None
    # Modo simple (lo que envía el formulario): un monto total con IVA incluido
    description: Optional[str] = None
    amount: Optional[float] = None
    vat_rate: Optional[float] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    issued_at: Optional[str] = None
    issue_date: Optional[str] = None  # alias del formulario

def inv_to_dict(inv: Invoice) -> dict:
    first_desc = inv.items[0].description if inv.items else (inv.notes or "")
    return {
        "id": inv.id, "number": inv.number, "invoice_type": inv.invoice_type,
        "status": inv.status if isinstance(inv.status, str) else inv.status.value,
        "client_id": inv.client_id, "case_id": inv.case_id,
        "subtotal": inv.subtotal, "iva_rate": inv.iva_rate, "iva_amount": inv.iva_amount,
        "total": inv.total, "paid_amount": inv.paid_amount, "balance": inv.balance,
        "currency": inv.currency, "issued_at": inv.issued_at, "due_date": inv.due_date,
        "timbrado": inv.timbrado, "notes": inv.notes,
        # Alias para el frontend (lee amount / vat_rate / issue_date / description / timbrado_number)
        "amount": inv.total, "vat_rate": inv.iva_rate, "issue_date": inv.issued_at,
        "description": first_desc, "timbrado_number": inv.timbrado,
        "paid_at": inv.paid_at,
        "client": {"id": inv.client.id, "full_name": inv.client.full_name, "ruc": getattr(inv.client, "ruc", None)} if inv.client else None,
        "items": [{"description": i.description, "quantity": i.quantity, "unit_price": i.unit_price, "amount": i.amount} for i in inv.items],
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }

@router.get("/invoices")
async def list_invoices(
    status: Optional[str] = None, search: Optional[str] = None,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    q = select(Invoice).options(selectinload(Invoice.client), selectinload(Invoice.items)).where(Invoice.tenant_id == current_user.tenant_id)
    if status: q = q.where(Invoice.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Invoice.created_at.desc()).offset((page-1)*limit).limit(limit))
    return {"items": [inv_to_dict(i) for i in result.scalars().all()], "total": total, "page": page, "pages": max(1,(total+limit-1)//limit)}

@router.post("/invoices", status_code=201)
async def create_invoice(data: InvoiceCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not data.client_id:
        raise HTTPException(422, "Debe seleccionar un cliente para la factura")

    rate = data.vat_rate if data.vat_rate is not None else 10.0
    if rate < 0:
        raise HTTPException(422, "La tasa de IVA no puede ser negativa")

    # Líneas de la factura: modo detallado o monto simple (IVA incluido)
    line_items: list[dict] = []
    if data.items:
        # Modo detallado: unit_price es neto, el IVA se agrega encima
        subtotal = sum(i.quantity * i.unit_price for i in data.items)
        if subtotal < 0:
            raise HTTPException(422, "El monto no puede ser negativo")
        iva = round(subtotal * rate / 100, 2)
        total = subtotal + iva
        line_items = [{"description": i.description, "quantity": i.quantity,
                       "unit_price": i.unit_price, "amount": i.quantity * i.unit_price} for i in data.items]
    else:
        # Modo simple: amount es el TOTAL con IVA incluido
        total = float(data.amount or 0)
        if total < 0:
            raise HTTPException(422, "El monto no puede ser negativo")
        iva = round(total * rate / (100 + rate), 2) if rate else 0.0
        subtotal = round(total - iva, 2)
        line_items = [{"description": data.description or "Servicios profesionales",
                       "quantity": 1, "unit_price": subtotal, "amount": subtotal}]

    # Numerador de factura por tenant
    from app.models.tenant import Tenant
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    counter = 1
    if tenant:
        counter = tenant.invoice_counter
        tenant.invoice_counter = counter + 1
    number = f"{counter:07d}"

    inv = Invoice(
        id=str(uuid.uuid4()), tenant_id=current_user.tenant_id,
        number=number, client_id=data.client_id, case_id=data.case_id,
        invoice_type=data.invoice_type, timbrado=data.timbrado,
        timbrado_expires=data.timbrado_expires,
        subtotal=subtotal, iva_rate=rate, iva_amount=iva, total=total,
        balance=total, due_date=data.due_date, notes=data.notes,
        issued_at=(data.issued_at or data.issue_date), status=InvoiceStatus.EMITIDA,
    )
    db.add(inv)
    await db.flush()

    for item in line_items:
        db.add(InvoiceItem(
            id=str(uuid.uuid4()), invoice_id=inv.id,
            description=item["description"], quantity=item["quantity"],
            unit_price=item["unit_price"], amount=item["amount"],
        ))

    await db.commit()
    return {"id": inv.id, "number": number, "total": total, "message": "Factura creada"}

@router.post("/invoices/{inv_id}/mark-paid")
async def mark_paid(inv_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Invoice).where(Invoice.id == inv_id, Invoice.tenant_id == current_user.tenant_id))
    inv = result.scalar_one_or_none()
    if not inv: raise HTTPException(404, "Factura no encontrada")
    inv.paid_amount = inv.total
    inv.balance = 0
    inv.status = InvoiceStatus.COBRADA
    from datetime import datetime, timezone
    inv.paid_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    return {"message": "Marcada como cobrada"}

# ─── INCOME ───────────────────────────────────────────────────
class IncomeCreate(BaseModel):
    description: str
    amount: float
    income_date: str
    payment_method: str = "efectivo"
    category: str = "honorarios"
    client_id: Optional[str] = None
    case_id: Optional[str] = None
    invoice_id: Optional[str] = None
    notes: Optional[str] = None

@router.get("/income")
async def list_income(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    q = select(Income).where(Income.tenant_id == current_user.tenant_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(
        q.options(selectinload(Income.client), selectinload(Income.case))
         .order_by(Income.income_date.desc()).offset((page-1)*limit).limit(limit)
    )
    items = result.scalars().all()
    return {"items": [{
        "id": i.id, "description": i.description, "amount": i.amount,
        "income_date": i.income_date, "payment_method": i.payment_method,
        "category": i.category, "client_id": i.client_id, "case_id": i.case_id,
        "notes": i.notes, "created_at": i.created_at.isoformat() if i.created_at else None,
        "client_name": (i.client.full_name if i.client else None),
        "case_title": (i.case.title if i.case else None),
    } for i in items], "total": total}

@router.delete("/income/{income_id}", status_code=204)
async def delete_income(income_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Income).where(Income.id == income_id, Income.tenant_id == current_user.tenant_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "No encontrado")
    await db.delete(obj)
    await db.commit()

@router.get("/income/stats")
async def income_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    res_m = await db.execute(
        select(func.coalesce(func.sum(Income.amount), 0), func.count(Income.id))
        .where(Income.tenant_id == current_user.tenant_id, Income.created_at >= month_start)
    )
    row_m = res_m.first()
    total_month = row_m[0] or 0
    count_month = row_m[1] or 0
    res_t = await db.execute(select(func.sum(Income.amount)).where(Income.tenant_id == current_user.tenant_id))
    total = res_t.scalar() or 0
    return {"total_month": total_month, "count_month": count_month, "total": total}

@router.post("/income", status_code=201)
async def create_income(data: IncomeCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.amount < 0:
        raise HTTPException(422, "El monto no puede ser negativo")
    inc = Income(id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(inc)
    await db.commit()
    return {"id": inc.id, "message": "Ingreso registrado"}

# ─── EXPENSES ─────────────────────────────────────────────────
class ExpenseCreate(BaseModel):
    description: str
    amount: float
    expense_date: str
    category: str = "oficina"
    case_id: Optional[str] = None
    is_reimbursable: bool = False
    notes: Optional[str] = None

@router.get("/expenses")
async def list_expenses(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    q = select(Expense).where(Expense.tenant_id == current_user.tenant_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(
        q.options(selectinload(Expense.case))
         .order_by(Expense.expense_date.desc()).offset((page-1)*limit).limit(limit)
    )
    items = result.scalars().all()
    def _exp_row(e):
        return {"id": e.id, "description": e.description, "amount": e.amount, "expense_date": e.expense_date,
                "category": e.category, "is_reimbursable": e.is_reimbursable, "notes": e.notes,
                "case_id": e.case_id, "payment_method": getattr(e, "payment_method", "efectivo"),
                "case_title": (e.case.title if e.case else None)}
    return {"items": [_exp_row(e) for e in items], "total": total}

@router.post("/expenses", status_code=201)
async def create_expense(data: ExpenseCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.amount < 0:
        raise HTTPException(422, "El monto no puede ser negativo")
    exp = Expense(id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(exp)
    await db.commit()
    return {"id": exp.id, "message": "Gasto registrado"}

# ─── BUDGETS ──────────────────────────────────────────────────
# Los endpoints de presupuestos viven en budgets.py (router dedicado con
# create/list/update/delete y filtros). Se eliminaron de aquí para evitar
# la colisión de rutas /budgets que provocaba 422 al crear presupuestos.


@router.get("/invoices/{invoice_id}/pdf")
async def export_invoice_pdf(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate printable invoice as HTML (for browser print-to-PDF)"""
    from fastapi.responses import HTMLResponse
    
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.client), selectinload(Invoice.items))
        .where(Invoice.id == invoice_id, Invoice.tenant_id == current_user.tenant_id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    
    client_name = inv.client.full_name if inv.client else "Sin cliente"
    ruc = inv.client.ruc if inv.client else ""
    _status_val = inv.status.value if hasattr(inv.status, "value") else inv.status
    is_paid = _status_val in ("paid", "pagada", "cobrada")
    
    rows = ""
    for item in (inv.items or []):
        subtotal = (item.quantity or 1) * (item.unit_price or 0)
        rows += f"<tr><td>{item.description}</td><td style='text-align:center'>{item.quantity or 1}</td><td style='text-align:right'>₲ {subtotal:,.0f}</td></tr>"
    
    iva_amount = inv.iva_amount or (inv.total * inv.iva_rate / (100 + inv.iva_rate))
    net_amount = inv.subtotal or (inv.total - iva_amount)
    
    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura {inv.number or inv.id[:8]}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a2e; background: #fff; max-width: 800px; margin: auto; }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #1a1a2e; }}
  .logo {{ font-size: 28px; font-weight: 700; color: #1a1a2e; }}
  .logo span {{ color: #c9a84c; }}
  .inv-title {{ text-align: right; }}
  .inv-title h1 {{ font-size: 24px; font-weight: 700; color: #1a1a2e; }}
  .inv-title p {{ color: #666; font-size: 13px; margin-top: 4px; }}
  .badge {{ display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; background: {'#dcfce7; color: #166534' if is_paid else '#fef9c3; color: #854d0e'}; }}
  .info {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }}
  .info-box {{ background: #f8f9fa; padding: 16px; border-radius: 8px; }}
  .info-box h3 {{ font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 8px; letter-spacing: 0.5px; }}
  .info-box p {{ font-size: 14px; font-weight: 600; }}
  .info-box small {{ font-size: 12px; color: #666; display: block; margin-top: 2px; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
  thead {{ background: #1a1a2e; color: #fff; }}
  thead th {{ padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; }}
  tbody tr:nth-child(even) {{ background: #f8f9fa; }}
  tbody td {{ padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #eee; }}
  .totals {{ margin-left: auto; width: 260px; }}
  .totals tr td {{ padding: 6px 10px; font-size: 13px; }}
  .totals tr td:last-child {{ text-align: right; font-weight: 600; }}
  .totals tr.total-row td {{ font-size: 16px; font-weight: 700; border-top: 2px solid #1a1a2e; padding-top: 10px; }}
  .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }}
  @media print {{ body {{ padding: 20px; }} .no-print {{ display: none; }} }}
</style>
</head>
<body>
<div class="no-print" style="background:#1a1a2e;color:#fff;padding:10px 20px;margin:-40px -40px 30px;display:flex;align-items:center;justify-content:space-between">
  <span style="font-size:14px">Vista previa de factura</span>
  <button onclick="window.print()" style="background:#c9a84c;color:#1a1a2e;border:none;padding:8px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px">🖨️ Imprimir / Guardar PDF</button>
</div>
<div class="header">
  <div>
    <div class="logo">X<span>L</span>egal</div>
    <p style="color:#666;font-size:13px;margin-top:4px">Sistema de Gestión Legal</p>
  </div>
  <div class="inv-title">
    <h1>FACTURA</h1>
    <p>N° {inv.number or inv.id[:8].upper()}</p>
    <p>Timbrado: {getattr(inv, 'timbrado_number', None) or '—'}</p>
    <div class="badge">{'PAGADA' if is_paid else 'PENDIENTE'}</div>
  </div>
</div>

<div class="info">
  <div class="info-box">
    <h3>Facturar a</h3>
    <p>{client_name}</p>
    <small>RUC: {ruc or '—'}</small>
  </div>
  <div class="info-box">
    <h3>Detalles</h3>
    <p>Fecha: {inv.issued_at or '—'}</p>
    <small>Vencimiento: {inv.due_date or '—'}</small>
    <small>Tipo: {inv.invoice_type or 'A'}</small>
  </div>
</div>

<table>
  <thead>
    <tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Importe</th></tr>
  </thead>
  <tbody>
    {rows if rows else f'<tr><td colspan="3" style="text-align:center;color:#999">{inv.description or "Servicios profesionales"}</td></tr>'}
  </tbody>
</table>

<table class="totals">
  <tr><td>Subtotal (neto):</td><td>₲ {net_amount:,.0f}</td></tr>
  <tr><td>IVA ({inv.iva_rate or 10}%):</td><td>₲ {iva_amount:,.0f}</td></tr>
  <tr class="total-row"><td>TOTAL:</td><td>₲ {inv.total:,.0f}</td></tr>
  {'<tr><td style="color:#666">A cuenta:</td><td style="color:#666">- ₲ ' + f"{(inv.total - inv.balance):,.0f}" + '</td></tr><tr><td style="color:#e55">SALDO:</td><td style="color:#e55">₲ ' + f"{inv.balance:,.0f}" + '</td></tr>' if inv.balance and inv.balance and inv.balance < inv.total else ''}
</table>

<div class="footer">
  <p>XLegal — Sistema de Gestión Legal para Paraguay</p>
  <p style="margin-top:4px">Soporte: 0993397400</p>
</div>
</body>
</html>"""
    
    return HTMLResponse(content=html)



@router.delete("/expenses/{expense_id}", status_code=204)
async def delete_expense(expense_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Expense).where(Expense.id == expense_id, Expense.tenant_id == current_user.tenant_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "No encontrado")
    await db.delete(obj)
    await db.commit()
