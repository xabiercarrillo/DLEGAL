"""
XLegal — Firma Electrónica Multi-Provider

PandaDoc: mejor API REST, plan free 5 docs/mes
DocuSign: líder mundial, más complejo (OAuth)
SignNow: buena relación precio/calidad

Flujo general:
  1. Upload PDF a plataforma
  2. Definir signatarios + posición de firma
  3. Enviar → retorna URL de firma para cada signatario
  4. Webhook notifica cuando todos firmaron
  5. Descargar PDF firmado con audit trail
"""
import httpx, base64
from app.core.config import settings


# ═══════════════════════════════════════════════
#  PANDADOC
# ═══════════════════════════════════════════════
class PandaDocService:
    """
    PandaDoc API — Firma electrónica + documentos.
    Docs: https://developers.pandadoc.com
    Plan free: 5 documentos/mes
    """
    BASE_URL = "https://api.pandadoc.com/public/v1"

    def _headers(self, api_key: str) -> dict:
        return {"Authorization": f"API-Key {api_key}", "Content-Type": "application/json"}

    async def create_document_from_pdf(
        self,
        pdf_path: str,
        document_name: str,
        recipients: list,  # [{"email": "...", "first_name": "...", "last_name": "...", "role": "signer"}]
        message: str = "",
        api_key: str = None,
    ) -> dict:
        """
        Sube un PDF y crea documento para firma.
        Retorna document_id y status.
        """
        key = api_key or settings.PANDADOC_API_KEY
        if not key:
            return {"success": False, "error": "PANDADOC_API_KEY no configurada"}

        # Read PDF
        try:
            with open(pdf_path, "rb") as f:
                content = base64.b64encode(f.read()).decode()
        except FileNotFoundError:
            return {"success": False, "error": f"Archivo no encontrado: {pdf_path}"}

        payload = {
            "name": document_name,
            "url": None,
            "content_placeholders": [],
            "recipients": recipients,
            "fields": {},
            "metadata": {"source": "xlegal"},
            "parse_form_fields": False,
            "file_url": None,
            "content": [{"source": f"data:application/pdf;base64,{content}"}],
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Create document
                r = await client.post(
                    f"{self.BASE_URL}/documents",
                    json=payload,
                    headers=self._headers(key),
                )
                if r.status_code not in (200, 201):
                    return {"success": False, "error": f"PandaDoc error {r.status_code}: {r.text[:300]}"}
                doc = r.json()
                return {
                    "success": True,
                    "document_id": doc["id"],
                    "name": doc["name"],
                    "status": doc["status"],
                    "provider": "pandadoc",
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def send_document(self, document_id: str, message: str = "", api_key: str = None) -> dict:
        """Envía el documento a los firmantes."""
        key = api_key or settings.PANDADOC_API_KEY
        payload = {"message": message or "Por favor firma este documento en XLegal.", "silent": False}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    f"{self.BASE_URL}/documents/{document_id}/send",
                    json=payload,
                    headers=self._headers(key),
                )
                data = r.json()
                return {"success": r.status_code in (200, 201), "status": data.get("status"), "document_id": document_id}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_document_status(self, document_id: str, api_key: str = None) -> dict:
        """Obtiene estado del documento y signatarios."""
        key = api_key or settings.PANDADOC_API_KEY
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(f"{self.BASE_URL}/documents/{document_id}", headers=self._headers(key))
                data = r.json()
                return {
                    "success": True,
                    "document_id": document_id,
                    "status": data.get("status"),  # document.draft | document.sent | document.completed
                    "name": data.get("name"),
                    "recipients": data.get("recipients", []),
                    "completed_at": data.get("date_completed"),
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_signing_url(self, document_id: str, signer_email: str, api_key: str = None) -> dict:
        """Genera URL de firma directa para un signatario."""
        key = api_key or settings.PANDADOC_API_KEY
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"{self.BASE_URL}/documents/{document_id}/session",
                    params={"recipient": signer_email},
                    headers=self._headers(key),
                )
                data = r.json()
                if data.get("id"):
                    return {
                        "success": True,
                        "signing_url": f"https://app.pandadoc.com/s/{data['id']}",
                        "session_id": data["id"],
                    }
                return {"success": False, "error": str(data)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def download_signed_pdf(self, document_id: str, api_key: str = None) -> bytes | None:
        """Descarga el PDF firmado."""
        key = api_key or settings.PANDADOC_API_KEY
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.get(
                    f"{self.BASE_URL}/documents/{document_id}/download",
                    headers=self._headers(key),
                )
                if r.status_code == 200:
                    return r.content
        except Exception:
            pass
        return None


# ═══════════════════════════════════════════════
#  DOCUSIGN
# ═══════════════════════════════════════════════
class DocuSignService:
    """
    DocuSign eSignature REST API.
    Docs: https://developers.docusign.com/docs/esign-rest-api
    Usa JWT Grant (server-to-server, no user redirect).
    """
    BASE_URL = "https://www.docusign.net/restapi/v2.1"

    async def create_envelope(
        self,
        pdf_path: str,
        document_name: str,
        signers: list,  # [{"name": "...", "email": "...", "routing_order": 1}]
        email_subject: str,
        account_id: str = None,
        access_token: str = None,
    ) -> dict:
        acc_id = account_id or settings.DOCUSIGN_ACCOUNT_ID
        token = access_token  # JWT token obtained via OAuth flow

        if not token:
            return {"success": False, "error": "DocuSign requiere access_token OAuth. Configurar en integraciones."}

        try:
            with open(pdf_path, "rb") as f:
                pdf_b64 = base64.b64encode(f.read()).decode()

            signer_list = []
            for i, s in enumerate(signers):
                signer_list.append({
                    "email": s["email"],
                    "name": s["name"],
                    "recipientId": str(i + 1),
                    "routingOrder": str(s.get("routing_order", i + 1)),
                    "tabs": {
                        "signHereTabs": [{"documentId": "1", "pageNumber": "1", "xPosition": "100", "yPosition": "700"}]
                    }
                })

            envelope = {
                "emailSubject": email_subject,
                "documents": [{"documentBase64": pdf_b64, "name": document_name, "fileExtension": "pdf", "documentId": "1"}],
                "recipients": {"signers": signer_list},
                "status": "sent",
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    f"{self.BASE_URL}/accounts/{acc_id}/envelopes",
                    json=envelope,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                )
                data = r.json()
                if data.get("envelopeId"):
                    return {
                        "success": True,
                        "envelope_id": data["envelopeId"],
                        "status": data.get("status"),
                        "provider": "docusign",
                    }
                return {"success": False, "error": str(data)}
        except Exception as e:
            return {"success": False, "error": str(e)}


# ── Instancias ─────────────────────────────────
pandadoc = PandaDocService()
docusign = DocuSignService()
