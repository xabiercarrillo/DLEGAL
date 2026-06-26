"""
XLegal — LEXI IA Multi-Provider
POST /ai/chat                → Chat general con LEXI
POST /ai/analyze-contract    → Análisis jurídico de contrato
POST /ai/summarize-case/{id} → Resumen de expediente
POST /ai/draft-document      → Redacción automática
POST /ai/legal-search        → Búsqueda jurídica inteligente
GET  /ai/providers           → Proveedores disponibles
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.integration import TenantIntegration
from app.core.crypto import decrypt_secret
from app.services.ai_multi import (
    PARAGUAY_SYSTEM, chat_openai, chat_claude, chat_cohere,
    analyze_contract, summarize_case, draft_document, legal_search
)

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    provider: Optional[str] = None  # auto | openai | claude | cohere

class ContractAnalysis(BaseModel):
    text: str
    provider: Optional[str] = None

class CaseSummaryRequest(BaseModel):
    case_id: Optional[str] = None
    case_data: Optional[dict] = None
    provider: Optional[str] = None

class DraftRequest(BaseModel):
    doc_type: str
    context: dict
    provider: Optional[str] = None

class LegalSearchRequest(BaseModel):
    query: str
    provider: Optional[str] = None


async def _get_ai_config(db, tenant_id: str) -> tuple[str, str | None]:
    """Returns (provider, api_key) from tenant config or global settings."""
    # Check tenant integration preferences
    for p in ("anthropic", "openai", "cohere"):
        r = await db.execute(select(TenantIntegration).where(
            TenantIntegration.tenant_id == tenant_id,
            TenantIntegration.provider == p,
            TenantIntegration.is_enabled == True,
        ))
        i = r.scalar_one_or_none()
        if i and (i.config or {}).get("api_key"):
            return p, decrypt_secret(i.config["api_key"])

    # Fall back to global config
    if settings.OPENAI_API_KEY:
        return "openai", settings.OPENAI_API_KEY
    if settings.ANTHROPIC_API_KEY:
        return "anthropic", settings.ANTHROPIC_API_KEY
    if settings.COHERE_API_KEY:
        return "cohere", settings.COHERE_API_KEY

    return "openai", None


def _map_provider(p: str) -> str:
    if p in ("claude", "anthropic"):
        return "claude"
    if p == "cohere":
        return "cohere"
    return "openai"


@router.get("/providers")
async def list_providers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista proveedores de IA disponibles para este tenant."""
    available = []
    default_provider, _ = await _get_ai_config(db, current_user.tenant_id)

    for p, name, key in [
        ("openai", "OpenAI GPT-4o", settings.OPENAI_API_KEY),
        ("anthropic", "Anthropic Claude", settings.ANTHROPIC_API_KEY),
        ("cohere", "Cohere Command", settings.COHERE_API_KEY),
    ]:
        # Check tenant override
        r = await db.execute(select(TenantIntegration).where(
            TenantIntegration.tenant_id == current_user.tenant_id,
            TenantIntegration.provider == p,
            TenantIntegration.is_enabled == True,
        ))
        ti = r.scalar_one_or_none()
        tenant_key = (ti.config or {}).get("api_key") if ti else None
        has_key = bool(tenant_key or key)
        available.append({
            "provider": p, "name": name, "available": has_key,
            "configured_by": "tenant" if tenant_key else ("global" if key else "none"),
            "is_default": p == default_provider or (p == "claude" and default_provider == "anthropic"),
        })

    return {
        "providers": available,
        "default": default_provider,
        "capabilities": ["chat", "contract_analysis", "case_summary", "document_draft", "legal_search"],
    }


@router.post("/chat")
async def lexi_chat(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chat con LEXI — asistente jurídico de Paraguay."""
    default_provider, default_key = await _get_ai_config(db, current_user.tenant_id)
    provider_name = _map_provider(data.provider or default_provider)

    msgs = [{"role": "system", "content": PARAGUAY_SYSTEM}]
    msgs += [{"role": m.role, "content": m.content} for m in data.messages]

    try:
        if provider_name == "claude":
            response = await chat_claude(msgs, api_key=default_key)
        elif provider_name == "cohere":
            response = await chat_cohere(msgs, api_key=default_key)
        else:
            response = await chat_openai(msgs, api_key=default_key)
        return {"response": response, "provider": provider_name}
    except ValueError as e:
        err = str(e)
        if "no configurada" in err or "no config" in err.lower():
            # Graceful fallback: inform user to configure AI
            return {
                "response": (
                    "⚠️ LEXI IA no está configurada todavía.\n\n"
                    "Para activarla, ir a **Configuración → Integraciones → Inteligencia Artificial** "
                    "y agregar tu API key de OpenAI, Anthropic Claude o Cohere.\n\n"
                    "Una vez configurada, LEXI podrá ayudarte con análisis de contratos, "
                    "resúmenes de expedientes y búsqueda jurídica en derecho paraguayo."
                ),
                "provider": "fallback",
                "configured": False,
            }
        raise HTTPException(400, err)
    except Exception as e:
        raise HTTPException(500, f"Error de IA: {str(e)}")


@router.post("/analyze-contract")
async def analyze_contract_endpoint(
    data: ContractAnalysis,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analiza un contrato jurídico: riesgos, cláusulas clave, recomendaciones."""
    default_provider, default_key = await _get_ai_config(db, current_user.tenant_id)
    provider_name = _map_provider(data.provider or default_provider)
    result = await analyze_contract(data.text, api_key=default_key, provider=provider_name)
    if not result.get("success"):
        raise HTTPException(400, result.get("error", "Error al analizar el contrato"))
    return result


@router.post("/summarize-case")
async def summarize_case_endpoint(
    data: CaseSummaryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera resumen ejecutivo de un expediente jurídico."""
    case_data = data.case_data or {}
    if data.case_id and not case_data:
        from app.models.case import Case
        r = await db.execute(select(Case).where(
            Case.id == data.case_id,
            Case.tenant_id == current_user.tenant_id,
        ))
        case = r.scalar_one_or_none()
        if not case:
            raise HTTPException(404, "Expediente no encontrado")
        case_data = {
            "title": case.title,
            "matter": getattr(case, "matter", ""),
            "client": "",
            "status": case.status,
            "description": case.description or "",
            "notes": case.notes or "",
        }

    if not case_data:
        raise HTTPException(400, "Proporcionar case_id o case_data")

    default_provider, default_key = await _get_ai_config(db, current_user.tenant_id)
    provider_name = _map_provider(data.provider or default_provider)
    result = await summarize_case(case_data, api_key=default_key, provider=provider_name)
    if not result.get("success"):
        raise HTTPException(400, result.get("error", "Error al resumir el expediente"))
    return result


@router.post("/draft-document")
async def draft_document_endpoint(
    data: DraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Redacta documento jurídico automáticamente."""
    default_provider, default_key = await _get_ai_config(db, current_user.tenant_id)
    provider_name = _map_provider(data.provider or default_provider)
    result = await draft_document(data.doc_type, data.context, api_key=default_key, provider=provider_name)
    if not result.get("success"):
        raise HTTPException(400, result.get("error", "Error al redactar el documento"))
    return result


@router.post("/legal-search")
async def legal_search_endpoint(
    data: LegalSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Búsqueda jurídica inteligente con respuesta contextualizada en derecho paraguayo."""
    default_provider, default_key = await _get_ai_config(db, current_user.tenant_id)
    provider_name = _map_provider(data.provider or default_provider)
    result = await legal_search(data.query, api_key=default_key, provider=provider_name)
    if not result.get("success"):
        raise HTTPException(400, result.get("error", "Error en la búsqueda jurídica"))
    return result
