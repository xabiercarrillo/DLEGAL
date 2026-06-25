"""
XLegal — LEXI IA Multi-Provider
OpenAI GPT-4o: más usado, mayor compatibilidad
Anthropic Claude: mejor razonamiento jurídico, mayor contexto
Cohere Command: buena alternativa, API simple

Fallback automático: si el proveedor configurado falla → siguiente.
"""
import httpx
from app.core.config import settings

PARAGUAY_SYSTEM = """Sos LEXI, un asistente jurídico especializado en Derecho Paraguayo.

ESPECIALIDADES:
- Código Civil Paraguayo (Ley N° 1183/85)
- Código Procesal Civil (CPC) y Código Procesal Penal (CPP)
- Código Laboral (Ley N° 213/93 y modificaciones)
- Código de Comercio, Ley de Sociedades (Ley N° 1034/83)
- Ley de Contrataciones Públicas (Ley N° 7021/22)
- Facturación SET, RUC, IVA 10%/5%, IRACIS, IRAGRO, IRPC
- Jurisprudencia del Tribunal de Apelaciones y Corte Suprema de Justicia
- Registro Público de Comercio, DNCR, MIC, SEAM, INDERT
- Ley de Defensa del Consumidor (Ley N° 1334/98)
- Ley de Propiedad Intelectual (Ley N° 1328/98)
- Constitución Nacional de Paraguay (1992)

REGLAS:
- Citar artículos y números de ley específicos de Paraguay
- Mencionar plazos procesales concretos cuando sean relevantes
- Usar terminología jurídica paraguaya (escribanía, juzgado, fiscalía, SET, etc.)
- Si no conocés la respuesta exacta, indicarlo claramente
- Responder en español formal paraguayo
- Para cálculos laborales usar salario mínimo vigente: Gs. 2.680.373
- Mencionar siempre que las respuestas son orientativas y no reemplazan consulta profesional

CAPACIDADES ESPECIALES:
- Analizar contratos y documentos jurídicos
- Resumir expedientes y casos
- Redactar escritos jurídicos básicos
- Calcular plazos procesales
- Identificar riesgos legales en contratos"""


async def chat_openai(messages: list, api_key: str = None, model: str = None) -> str:
    """Chat con OpenAI GPT."""
    key = api_key or settings.OPENAI_API_KEY
    if not key:
        raise ValueError("OpenAI API key no configurada")
    mdl = model or settings.OPENAI_MODEL or "gpt-4o-mini"
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={"model": mdl, "messages": messages, "max_tokens": 1500, "temperature": 0.4},
        )
        if r.status_code != 200:
            raise ValueError(f"OpenAI error {r.status_code}: {r.text[:200]}")
        return r.json()["choices"][0]["message"]["content"]


async def chat_claude(messages: list, api_key: str = None, model: str = None) -> str:
    """Chat con Anthropic Claude — mejor para análisis jurídico profundo."""
    key = api_key or settings.ANTHROPIC_API_KEY
    if not key:
        raise ValueError("Anthropic API key no configurada")
    mdl = model or "claude-3-5-haiku-20241022"  # rápido y económico

    # Separar system del resto
    system_msgs = [m for m in messages if m.get("role") == "system"]
    chat_msgs = [m for m in messages if m.get("role") != "system"]
    system_text = "\n\n".join(m["content"] for m in system_msgs) if system_msgs else PARAGUAY_SYSTEM

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": mdl,
                "max_tokens": 1500,
                "system": system_text,
                "messages": chat_msgs,
            },
        )
        if r.status_code != 200:
            raise ValueError(f"Anthropic error {r.status_code}: {r.text[:200]}")
        return r.json()["content"][0]["text"]


async def chat_cohere(messages: list, api_key: str = None) -> str:
    """Chat con Cohere Command."""
    key = api_key or settings.COHERE_API_KEY
    if not key:
        raise ValueError("Cohere API key no configurada")
    chat_msgs = [m for m in messages if m.get("role") != "system"]
    history = [{"role": "USER" if m["role"] == "user" else "CHATBOT", "message": m["content"]}
               for m in chat_msgs[:-1]]
    last_msg = chat_msgs[-1]["content"] if chat_msgs else ""
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.cohere.ai/v1/chat",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"message": last_msg, "chat_history": history, "preamble": PARAGUAY_SYSTEM, "max_tokens": 1500},
        )
        if r.status_code != 200:
            raise ValueError(f"Cohere error {r.status_code}: {r.text[:200]}")
        return r.json()["text"]


async def analyze_contract(text: str, api_key: str = None, provider: str = "openai") -> dict:
    """
    Analiza un contrato jurídico con IA.
    Retorna riesgos, cláusulas clave, recomendaciones.
    """
    prompt = f"""Analizá el siguiente contrato desde la perspectiva del derecho paraguayo.
Proporciona:
1. RESUMEN EJECUTIVO (3-5 líneas)
2. CLÁUSULAS CLAVE identificadas
3. RIESGOS LEGALES detectados
4. CLÁUSULAS FALTANTES recomendadas
5. RECOMENDACIONES concretas

CONTRATO:
{text[:8000]}"""

    messages = [
        {"role": "system", "content": PARAGUAY_SYSTEM},
        {"role": "user", "content": prompt}
    ]
    try:
        if provider == "claude":
            response = await chat_claude(messages, api_key)
        elif provider == "cohere":
            response = await chat_cohere(messages, api_key)
        else:
            response = await chat_openai(messages, api_key)
        return {"success": True, "analysis": response, "provider": provider}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def summarize_case(case_data: dict, api_key: str = None, provider: str = "openai") -> dict:
    """Genera resumen ejecutivo de un expediente."""
    prompt = f"""Generá un resumen ejecutivo de este expediente jurídico paraguayo:

CASO: {case_data.get('title')}
MATERIA: {case_data.get('matter')}
CLIENTE: {case_data.get('client')}
ESTADO: {case_data.get('status')}
DESCRIPCIÓN: {case_data.get('description', '')}
NOTAS: {case_data.get('notes', '')}

Incluir:
1. Resumen del caso (3-4 líneas)
2. Estado procesal actual
3. Próximos pasos recomendados
4. Riesgos o alertas importantes"""

    messages = [
        {"role": "system", "content": PARAGUAY_SYSTEM},
        {"role": "user", "content": prompt}
    ]
    try:
        if provider == "claude":
            response = await chat_claude(messages, api_key)
        else:
            response = await chat_openai(messages, api_key)
        return {"success": True, "summary": response, "provider": provider}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def draft_document(doc_type: str, context: dict, api_key: str = None, provider: str = "openai") -> dict:
    """
    Redacta un documento jurídico básico.
    doc_type: "poder_especial" | "carta_documento" | "intimacion" | "contrato_prestacion"
    """
    templates = {
        "poder_especial": "Poder Especial para representación jurídica en Paraguay",
        "carta_documento": "Carta documento de intimación",
        "intimacion": "Nota de intimación extrajudicial",
        "contrato_prestacion": "Contrato de prestación de servicios profesionales",
        "demanda_laboral": "Escrito de demanda laboral ante el Juzgado Laboral de Asunción",
        "contrato_locacion": "Contrato de locación de servicios",
        "acuerdo_honorarios": "Acuerdo de honorarios profesionales",
    }

    doc_name = templates.get(doc_type, doc_type)
    prompt = f"""Redactá un {doc_name} conforme al derecho paraguayo vigente.

DATOS:
{chr(10).join(f'- {k}: {v}' for k,v in context.items() if v)}

REQUISITOS:
- Formato jurídico formal
- Citar normativa paraguaya aplicable
- Incluir lugar y fecha en formato paraguayo
- Usar nomenclatura jurídica correcta
- Incluir espacios para firmas y aclaraciones"""

    messages = [
        {"role": "system", "content": PARAGUAY_SYSTEM},
        {"role": "user", "content": prompt}
    ]
    try:
        if provider == "claude":
            response = await chat_claude(messages, api_key)
        else:
            response = await chat_openai(messages, api_key)
        return {"success": True, "document": response, "doc_type": doc_type, "provider": provider}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def legal_search(query: str, api_key: str = None, provider: str = "openai") -> dict:
    """Búsqueda jurídica inteligente con respuesta contextualizada."""
    prompt = f"""Respondé esta consulta jurídica sobre derecho paraguayo con precisión y citas normativas:

CONSULTA: {query}

Formato de respuesta:
1. Respuesta directa
2. Fundamento legal (artículos y leyes)
3. Jurisprudencia relevante si existe
4. Consideraciones prácticas en Paraguay"""

    messages = [
        {"role": "system", "content": PARAGUAY_SYSTEM},
        {"role": "user", "content": prompt}
    ]
    try:
        if provider == "claude":
            response = await chat_claude(messages, api_key)
        elif provider == "cohere":
            response = await chat_cohere(messages, api_key)
        else:
            response = await chat_openai(messages, api_key)
        return {"success": True, "response": response, "provider": provider}
    except Exception as e:
        return {"success": False, "error": str(e)}
