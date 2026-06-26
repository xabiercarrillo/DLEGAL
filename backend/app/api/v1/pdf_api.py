"""
XLegal — API de Generación de PDFs
POST /pdf/invoice/{id}      → Genera PDF de factura
POST /pdf/contract          → Genera PDF de contrato desde template
POST /pdf/from-html         → Genera PDF desde HTML personalizado
POST /pdf/convert           → Convierte DOCX → PDF (CloudConvert)
"""
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.billing import Invoice, InvoiceItem
from app.models.client import Client
from app.models.integration import TenantIntegration
from app.core.crypto import decrypt_secret
from app.services.pdf_gen import generate_pdf, html_invoice, html_contract

router = APIRouter(prefix="/pdf", tags=["pdf"])


async def _get_pdf_provider(db, tenant_id: str) -> tuple[str, str | None]:
    """Returns (provider, api_key) based on tenant config or default."""
    for provider in ("docraptor", "pdfshift"):
        r = await db.execute(select(TenantIntegration).where(
            TenantIntegration.tenant_id == tenant_id,
            TenantIntegration.provider == provider,
            TenantIntegration.is_enabled == True,
        ))
        i = r.scalar_one_or_none()
        if i and (i.config or {}).get("api_key"):
            return provider, decrypt_secret(i.config["api_key"])
    return "local", None


class ContractRequest(BaseModel):
    title: str
    parties: List[dict]  # [{name, role, document, address, alias}]
    clauses: List[dict]  # [{title, content}]
    date: Optional[str] = None


class HTMLtoPDF(BaseModel):
    html: str
    filename: str = "documento.pdf"


@router.get("/invoice/{invoice_id}")
async def generate_invoice_pdf(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera PDF de factura con membrete del estudio jurídico."""
    # Load invoice
    r = await db.execute(select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.tenant_id == current_user.tenant_id,
    ))
    inv = r.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")

    # Load client
    client_data = {}
    if inv.client_id:
        rc = await db.execute(select(Client).where(Client.id == inv.client_id))
        cl = rc.scalar_one_or_none()
        if cl:
            client_data = {
                "full_name": cl.full_name,
                "document_number": cl.document_number,
                "address": cl.address or "",
                "email": cl.email or "",
            }

    # Load items
    ri = await db.execute(select(InvoiceItem).where(InvoiceItem.invoice_id == invoice_id))
    items_data = [{"description": i.description, "quantity": i.quantity or 1,
                   "unit_price": i.unit_price or 0, "amount": i.amount or 0}
                  for i in ri.scalars().all()]

    # Tenant/firm data
    from app.models.tenant import Tenant
    rt = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = rt.scalar_one_or_none()
    firm_data = {
        "name": tenant.name if tenant else "Estudio Jurídico",
        "legal_name": getattr(tenant, "legal_name", "") or "",
        "ruc": getattr(tenant, "ruc", "") or "",
        "address": getattr(tenant, "address", "") or "Asunción, Paraguay",
        "phone": getattr(tenant, "phone", "") or "",
        "email": getattr(tenant, "email", "") or "",
        "city": getattr(tenant, "city", "Asunción") or "Asunción",
    }

    inv_data = {
        "number": inv.invoice_number or inv.id[:8].upper(),
        "timbrado": getattr(inv, "timbrado", "") or "XXXXX",
        "issued_at": inv.issued_at.strftime("%d/%m/%Y") if inv.issued_at else "—",
        "invoice_type": "B",
        "subtotal": float(inv.subtotal or 0),
        "iva_rate": float(getattr(inv, "iva_rate", 10) or 10),
        "iva_amount": float(inv.iva_amount or 0),
        "total": float(inv.total or 0),
        "notes": inv.notes or "",
    }

    html = html_invoice(inv_data, firm_data, client_data, items_data)
    provider, api_key = await _get_pdf_provider(db, current_user.tenant_id)
    pdf_bytes = await generate_pdf(html, provider=provider, api_key=api_key)

    if not pdf_bytes:
        raise HTTPException(500, "No se pudo generar el PDF. Instalar WeasyPrint o configurar DocRaptor/PDFShift.")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=factura_{inv_data['number']}.pdf"},
    )


@router.post("/contract")
async def generate_contract_pdf(
    data: ContractRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera PDF de contrato jurídico desde template."""
    from app.models.tenant import Tenant
    rt = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = rt.scalar_one_or_none()
    firm_data = {
        "name": tenant.name if tenant else "Estudio Jurídico",
        "address": getattr(tenant, "address", "Asunción, Paraguay") or "Asunción, Paraguay",
        "phone": getattr(tenant, "phone", "") or "",
    }
    html = html_contract(data.title, data.parties, data.clauses, firm_data, data.date)
    provider, api_key = await _get_pdf_provider(db, current_user.tenant_id)
    pdf_bytes = await generate_pdf(html, provider=provider, api_key=api_key)
    if not pdf_bytes:
        raise HTTPException(500, "No se pudo generar el PDF")

    safe_name = data.title[:30].replace(" ", "_").lower()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=contrato_{safe_name}.pdf"},
    )


@router.post("/from-html")
async def html_to_pdf(
    data: HTMLtoPDF,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convierte HTML personalizado a PDF."""
    provider, api_key = await _get_pdf_provider(db, current_user.tenant_id)
    pdf_bytes = await generate_pdf(data.html, provider=provider, api_key=api_key)
    if not pdf_bytes:
        raise HTTPException(500, "No se pudo generar el PDF")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={data.filename}"},
    )


@router.post("/convert-docx")
async def convert_docx_to_pdf_endpoint(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convierte archivo Word (.docx) a PDF usando CloudConvert."""
    if not file.filename.endswith((".docx", ".doc")):
        raise HTTPException(400, "Solo se aceptan archivos .docx/.doc")

    # Check for CloudConvert config
    r = await db.execute(select(TenantIntegration).where(
        TenantIntegration.tenant_id == current_user.tenant_id,
        TenantIntegration.provider == "cloudconvert",
        TenantIntegration.is_enabled == True,
    ))
    integration = r.scalar_one_or_none()
    api_key = decrypt_secret((integration.config or {}).get("api_key")) if integration else None
    if not api_key:
        raise HTTPException(400, "CloudConvert no configurado. Ir a Integraciones → PDF → CloudConvert.")

    from app.services.pdf_gen import convert_docx_to_pdf
    docx_bytes = await file.read()
    pdf_bytes = await convert_docx_to_pdf(docx_bytes, api_key=api_key)
    if not pdf_bytes:
        raise HTTPException(500, "Error al convertir el documento")

    pdf_name = file.filename.replace(".docx", ".pdf").replace(".doc", ".pdf")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={pdf_name}"},
    )
