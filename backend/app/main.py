"""
XLegal v2.0.0 — Sistema Jurídico Multi-Tenant Paraguay
Backend: FastAPI + SQLAlchemy async + PostgreSQL

Integraciones v2:
  Pagos:      Bancard 🇵🇾 | Mercado Pago | Stripe | PayPal
  E-Firma:    PandaDoc | DocuSign
  WhatsApp:   Twilio | Vonage
  Email:      Resend | SendGrid | Mailgun
  IA:         OpenAI | Claude | Cohere
  Storage:    Local | AWS S3 | Cloudflare R2
  Calendario: Google Calendar | Zoom | Calendly
  PDF:        WeasyPrint local | DocRaptor | PDFShift | CloudConvert
  Mapas:      Google Maps | Mapbox
  RT:         Pusher | Webhooks outbound (Zapier/Make/n8n)
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# ── Logging estructurado básico ───────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("xlegal")

app = FastAPI(
    title="XLegal API",
    version=settings.APP_VERSION,
    description="Sistema de Gestión Jurídica Multi-Tenant — Paraguay 🇵🇾",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Core routers ──────────────────────────────────────────
from app.api.v1 import (
    auth, cases, clients, hearings, deadlines, tasks,
    billing, calculator, search, calendar, ai,
    library, goals, contacts, appointments, users,
    templates, mediations, accounting, collections,
    reports, budgets, tenants, superadmin,
    documents, export, audit,
)
# ── Integration routers ───────────────────────────────────
from app.api.v1 import integrations
from app.api.v1 import portal
from app.api.v1.esign_api import router as esign_router
from app.api.v1 import reimbursable
from app.api.v1.payments_ext import router as payments_ext_router
from app.api.v1.maps_api import router as maps_router
from app.api.v1.meetings_api import router as meetings_router
from app.api.v1.pdf_api import router as pdf_router
from app.api.v1.business_intel import router as business_router

PREFIX = settings.API_V1_STR

# Core
app.include_router(auth.router, prefix=PREFIX)
app.include_router(cases.router, prefix=PREFIX)
app.include_router(clients.router, prefix=PREFIX)
app.include_router(hearings.router, prefix=PREFIX)
app.include_router(deadlines.router, prefix=PREFIX)
app.include_router(tasks.router, prefix=PREFIX)
app.include_router(billing.router, prefix=PREFIX)
app.include_router(calculator.router, prefix=PREFIX)
app.include_router(search.router, prefix=PREFIX)
app.include_router(calendar.router, prefix=PREFIX)
app.include_router(ai.router, prefix=PREFIX)
app.include_router(library.router, prefix=PREFIX)
app.include_router(goals.router, prefix=PREFIX)
app.include_router(contacts.router, prefix=PREFIX)
app.include_router(appointments.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(templates.router, prefix=PREFIX)
app.include_router(mediations.router, prefix=PREFIX)
app.include_router(accounting.router, prefix=PREFIX)
app.include_router(collections.router, prefix=PREFIX)
app.include_router(reports.router, prefix=PREFIX)
app.include_router(budgets.router, prefix=PREFIX)
app.include_router(tenants.router, prefix=PREFIX)
app.include_router(superadmin.router, prefix=PREFIX)
app.include_router(documents.router, prefix=PREFIX)
app.include_router(export.router, prefix=PREFIX)
app.include_router(audit.router, prefix=PREFIX)

# Integrations
app.include_router(integrations.router, prefix=PREFIX)
app.include_router(portal.router, prefix=PREFIX)
app.include_router(esign_router, prefix=PREFIX)
app.include_router(payments_ext_router, prefix=PREFIX)
app.include_router(maps_router, prefix=PREFIX)
app.include_router(meetings_router, prefix=PREFIX)
app.include_router(pdf_router, prefix=PREFIX)
app.include_router(reimbursable.router, prefix=PREFIX)
app.include_router(business_router, prefix=PREFIX)


@app.get("/")
async def root():
    return {
        "name": "XLegal API",
        "version": settings.APP_VERSION,
        "country": "Paraguay 🇵🇾",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health():
    # Verifica DB y Redis sin romper si alguno falla (status "degraded").
    db_status = "ok"
    redis_status = "ok"

    try:
        from sqlalchemy import text
        from app.core.database import engine
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "error"
        logger.warning("Healthcheck DB falló: %s", e)

    try:
        import redis.asyncio as aioredis
        client = aioredis.from_url(settings.REDIS_URL)
        try:
            await client.ping()
        finally:
            await client.aclose()
    except Exception as e:
        redis_status = "error"
        logger.warning("Healthcheck Redis falló: %s", e)

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    return {
        "status": overall,
        "checks": {"database": db_status, "redis": redis_status},
        "version": settings.APP_VERSION,
        "country": "Paraguay 🇵🇾",
        "integrations": {
            "payments": ["bancard", "mercadopago", "stripe", "paypal"],
            "esign": ["pandadoc", "docusign"],
            "messaging": ["twilio_whatsapp", "vonage_sms"],
            "email": ["resend", "sendgrid", "mailgun"],
            "ai": ["openai", "anthropic", "cohere"],
            "storage": ["local", "s3", "r2"],
            "calendar": ["google_calendar", "zoom", "calendly"],
            "pdf": ["weasyprint_local", "docraptor", "pdfshift", "cloudconvert"],
            "maps": ["google_maps", "mapbox"],
            "realtime": ["pusher", "webhooks_outbound"],
        },
    }


@app.on_event("startup")
async def startup_event():
    # Advertir (sin abortar) si hay defaults inseguros en producción.
    settings.warn_insecure_defaults()

    from app.core.database import engine, Base
    from app.models import (
        user, tenant, case, client, hearing, deadline,
        task, billing, library, goal, contact, appointment,
        template, mediation, accounting, budget, document,
        audit as audit_model,
    )
    from app.models import integration as integration_model
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed super admin
    from app.core.database import AsyncSessionLocal
    from app.core.init_db import create_initial_data
    async with AsyncSessionLocal() as db:
        await create_initial_data(db)
