"""
XLegal — API de Firma Electrónica
POST /esign/send          → Envía documento para firma
GET  /esign/{id}          → Estado del proceso de firma
GET  /esign/{id}/url      → URL de firma para un signatario
POST /esign/{id}/resend   → Reenvía recordatorio
GET  /esign/{id}/download → Descarga PDF firmado
GET  /esign              → Lista todas las solicitudes de firma
POST /esign/webhook/{provider} → Webhook inbound de plataformas e-sign
"""
import uuid, os, json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.integration import ESignRequest, TenantIntegration
from app.core.crypto import decrypt_secret
from app.models.document import Document
from app.services.esign import pandadoc, docusign
from app.services.notifications import notify_document_signed

router = APIRouter(prefix="/esign", tags=["e-signature"])


class Signer(BaseModel):
    name: str
    email: EmailStr
    role: str = "signer"           # signer | approver | viewer
    routing_order: int = 1


class ESignSendRequest(BaseModel):
    document_id: str               # ID del documento en XLegal
    signers: List[Signer]
    provider: str = "pandadoc"     # pandadoc | docusign
    subject: str = "Documento para firma"
    message: str = ""
    expires_days: int = 30


class ESignSendFromPDF(BaseModel):
    """Para enviar un PDF externo (no en sistema) directamente a firma."""
    file_base64: str               # PDF en base64
    filename: str
    signers: List[Signer]
    provider: str = "pandadoc"
    subject: str = "Documento para firma"
    message: str = ""
    case_id: Optional[str] = None


# Mapea estados específicos del proveedor a estados canónicos del frontend
_STATUS_NORMALIZE = {
    "document.draft": "pending",
    "document.uploaded": "pending",
    "document.sent": "sent",
    "document.viewed": "viewed",
    "document.waiting_approval": "viewed",
    "document.completed": "completed",
    "document.declined": "declined",
    "document.voided": "voided",
    "document.expired": "expired",
    "sent": "sent",
    "delivered": "viewed",
    "completed": "completed",
    "declined": "declined",
    "voided": "voided",
}


def _norm_status(s: str | None) -> str:
    if not s:
        return "pending"
    return _STATUS_NORMALIZE.get(s, s)


async def _get_tenant_integration(db, tenant_id: str, provider: str) -> TenantIntegration | None:
    r = await db.execute(select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == provider,
        TenantIntegration.is_enabled == True,
    ))
    return r.scalar_one_or_none()


@router.post("/send")
async def send_for_signature(
    data: ESignSendRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Envía un documento existente para firma electrónica."""
    # Get document
    r = await db.execute(select(Document).where(
        Document.id == data.document_id,
        Document.tenant_id == current_user.tenant_id,
    ))
    doc = r.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")

    # Get integration config
    integration = await _get_tenant_integration(db, current_user.tenant_id, data.provider)
    api_key = None
    if integration:
        api_key = decrypt_secret((integration.config or {}).get("api_key"))

    # Send based on provider
    result = {"success": False, "error": "Proveedor no configurado"}

    if data.provider == "pandadoc":
        if not api_key and not __import__("app.core.config", fromlist=["settings"]).settings.PANDADOC_API_KEY:
            raise HTTPException(400, "PandaDoc no configurado. Ir a Integraciones → Firma Electrónica → PandaDoc.")

        recipients = [
            {"email": s.email, "first_name": s.name.split()[0], "last_name": " ".join(s.name.split()[1:]) or ".",
             "role": s.role, "routing_order": s.routing_order}
            for s in data.signers
        ]
        result = await pandadoc.create_document_from_pdf(
            pdf_path=doc.file_path,
            document_name=doc.name,
            recipients=recipients,
            message=data.message,
            api_key=api_key,
        )
        if result.get("success"):
            send_r = await pandadoc.send_document(result["document_id"], data.message, api_key=api_key)
            result["sent"] = send_r.get("success", False)

    elif data.provider == "docusign":
        if not integration or not integration.access_token:
            raise HTTPException(400, "DocuSign requiere autorización OAuth. Ir a Integraciones → DocuSign → Conectar.")
        signers_ds = [{"name": s.name, "email": s.email, "routing_order": s.routing_order} for s in data.signers]
        account_id = (integration.config or {}).get("account_id", "")
        result = await docusign.create_envelope(
            pdf_path=doc.file_path,
            document_name=doc.name,
            signers=signers_ds,
            email_subject=data.subject,
            account_id=account_id,
            access_token=integration.access_token,
        )

    if not result.get("success"):
        raise HTTPException(400, result.get("error", "Error al enviar para firma"))

    # Create ESignRequest record
    from datetime import timedelta
    expires = (datetime.now(timezone.utc) + timedelta(days=data.expires_days)).strftime("%Y-%m-%d")
    esign = ESignRequest(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        document_id=data.document_id,
        provider=data.provider,
        external_id=result.get("document_id") or result.get("envelope_id"),
        status="sent",
        signers=json.dumps([{"name": s.name, "email": s.email, "status": "pending"} for s in data.signers]),
        expires_at=expires,
    )
    db.add(esign)
    await db.commit()

    return {
        "id": esign.id,
        "external_id": esign.external_id,
        "status": "sent",
        "provider": data.provider,
        "signers": data.signers,
        "message": f"Documento enviado a {len(data.signers)} firmante(s) vía {data.provider.title()}",
    }


@router.get("")
async def list_esign_requests(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas las solicitudes de firma del tenant."""
    q = select(ESignRequest).where(ESignRequest.tenant_id == current_user.tenant_id)
    if status:
        q = q.where(ESignRequest.status == status)
    q = q.order_by(ESignRequest.created_at.desc()).limit(100)
    r = await db.execute(q)
    items = r.scalars().all()
    return {"items": [{
        "id": i.id,
        "document_id": i.document_id,
        "provider": i.provider,
        "external_id": i.external_id,
        "status": _norm_status(i.status),
        "signers": json.loads(i.signers or "[]"),
        "expires_at": i.expires_at,
        "completed_at": i.completed_at,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    } for i in items]}


@router.get("/{esign_id}/status")
async def get_esign_status(
    esign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Consulta estado actualizado del proceso de firma (llama a la API del proveedor)."""
    r = await db.execute(select(ESignRequest).where(
        ESignRequest.id == esign_id,
        ESignRequest.tenant_id == current_user.tenant_id,
    ))
    esign = r.scalar_one_or_none()
    if not esign:
        raise HTTPException(404, "Solicitud de firma no encontrada")

    # Query provider for live status
    integration = await _get_tenant_integration(db, current_user.tenant_id, esign.provider)
    api_key = decrypt_secret((integration.config or {}).get("api_key")) if integration else None

    live_status = {}
    if esign.provider == "pandadoc" and esign.external_id:
        live_status = await pandadoc.get_document_status(esign.external_id, api_key=api_key)
        if live_status.get("success") and live_status.get("status") != esign.status:
            old_status = esign.status
            esign.status = live_status["status"]
            if live_status["status"] == "document.completed":
                esign.completed_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            await db.commit()

    return {
        "id": esign_id,
        "status": _norm_status(esign.status),
        "external_id": esign.external_id,
        "provider": esign.provider,
        "signers": json.loads(esign.signers or "[]"),
        "live_status": live_status,
        "completed_at": esign.completed_at,
    }


@router.get("/{esign_id}/signing-url")
async def get_signing_url(
    esign_id: str,
    signer_email: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera URL de firma directa para un signatario específico."""
    r = await db.execute(select(ESignRequest).where(
        ESignRequest.id == esign_id,
        ESignRequest.tenant_id == current_user.tenant_id,
    ))
    esign = r.scalar_one_or_none()
    if not esign:
        raise HTTPException(404, "Solicitud no encontrada")
    if not esign.external_id:
        raise HTTPException(400, "El documento aún no fue enviado al proveedor")

    integration = await _get_tenant_integration(db, current_user.tenant_id, esign.provider)
    api_key = decrypt_secret((integration.config or {}).get("api_key")) if integration else None

    if esign.provider == "pandadoc":
        result = await pandadoc.get_signing_url(esign.external_id, signer_email, api_key=api_key)
        if result.get("success"):
            return {"signing_url": result["signing_url"], "signer_email": signer_email}
        raise HTTPException(400, result.get("error", "No se pudo generar URL de firma"))

    raise HTTPException(400, f"URL de firma directa no disponible para {esign.provider}")


@router.post("/{esign_id}/resend")
async def resend_esign_request(
    esign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reenvía el recordatorio de firma a los firmantes pendientes."""
    r = await db.execute(select(ESignRequest).where(
        ESignRequest.id == esign_id,
        ESignRequest.tenant_id == current_user.tenant_id,
    ))
    esign = r.scalar_one_or_none()
    if not esign:
        raise HTTPException(404, "Solicitud no encontrada")
    if not esign.external_id:
        raise HTTPException(400, "El documento aún no fue enviado al proveedor")

    integration = await _get_tenant_integration(db, current_user.tenant_id, esign.provider)
    api_key = decrypt_secret((integration.config or {}).get("api_key")) if integration else None

    if esign.provider == "pandadoc":
        result = await pandadoc.send_document(
            esign.external_id, "Recordatorio: tenés un documento pendiente de firma.", api_key=api_key
        )
        if not result.get("success"):
            raise HTTPException(400, result.get("error", "No se pudo reenviar el recordatorio"))
        return {"message": "Recordatorio reenviado a los firmantes"}

    raise HTTPException(400, f"Reenvío no disponible para {esign.provider}")


@router.get("/{esign_id}/download")
async def download_signed_document(
    esign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Descarga el PDF firmado del proveedor."""
    from fastapi.responses import Response
    r = await db.execute(select(ESignRequest).where(
        ESignRequest.id == esign_id,
        ESignRequest.tenant_id == current_user.tenant_id,
    ))
    esign = r.scalar_one_or_none()
    if not esign:
        raise HTTPException(404, "Solicitud no encontrada")
    if esign.status not in ("document.completed", "completed"):
        raise HTTPException(400, f"Documento no completado aún (estado: {esign.status})")

    integration = await _get_tenant_integration(db, current_user.tenant_id, esign.provider)
    api_key = decrypt_secret((integration.config or {}).get("api_key")) if integration else None

    pdf_bytes = None
    if esign.provider == "pandadoc":
        pdf_bytes = await pandadoc.download_signed_pdf(esign.external_id, api_key=api_key)

    if not pdf_bytes:
        raise HTTPException(400, "No se pudo descargar el documento firmado")

    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=firmado_{esign_id}.pdf"})


@router.post("/webhook/{provider}")
async def esign_webhook(
    provider: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Recibe webhooks de plataformas de firma electrónica.
    URL pública: POST /api/v1/esign/webhook/pandadoc
    """
    body = await request.json()

    if provider == "pandadoc":
        doc_id = body.get("data", {}).get("id")
        new_status = body.get("event", "").replace("document_", "document.")

        if doc_id and new_status:
            r = await db.execute(select(ESignRequest).where(ESignRequest.external_id == doc_id))
            esign = r.scalar_one_or_none()
            if esign:
                esign.status = new_status
                if "completed" in new_status:
                    esign.completed_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                    # Notify via WhatsApp/webhook
                    from app.services.webhooks import dispatch_event
                    background_tasks.add_task(
                        dispatch_event, esign.tenant_id, "document.signed",
                        {"document_id": esign.document_id, "esign_id": esign.id}, db
                    )
                await db.commit()

    return {"received": True}
