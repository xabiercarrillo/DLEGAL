"""
XLegal — Business Intelligence & Marketing APIs
GET  /business/advertising/summary    → Resumen campañas publicitarias
GET  /business/advertising/campaigns  → Campañas activas por plataforma
GET  /business/analytics/web          → Tráfico web y conversiones
GET  /business/analytics/funnel       → Embudo de conversión
GET  /business/social/metrics         → Métricas de redes sociales
GET  /business/marketing/leads        → Leads y embudos de venta
GET  /business/marketing/email        → Estadísticas de email marketing
GET  /business/payments/summary       → Resumen de ingresos SaaS
GET  /business/payments/subscriptions → Desglose por plan/suscripción
GET  /business/bi/kpis                → KPIs consolidados del negocio
POST /business/integrations/config    → Guardar tokens de APIs externas
GET  /business/integrations/status    → Estado de conexiones externas
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.models.integration import PaymentTransaction

router = APIRouter(prefix="/business", tags=["business-intel"])

# Precios de referencia por plan (₲/mes) usados para derivar MRR de tenants activos.
PLAN_PRICES = {"solo": 75000, "bufete_s": 300000, "bufete_m": 500000, "bufete_l": 800000}


async def _real_revenue_by_provider(db: AsyncSession) -> dict:
    """Volumen y nº de transacciones COMPLETADAS por proveedor (datos reales de la BD)."""
    r = await db.execute(
        select(
            PaymentTransaction.provider,
            func.count().label("count"),
            func.sum(PaymentTransaction.amount).label("total"),
        )
        .where(PaymentTransaction.status == "completed")
        .group_by(PaymentTransaction.provider)
    )
    out = {}
    for provider, count, total in r.all():
        out[provider] = {"transactions": int(count or 0), "volume": float(total or 0)}
    return out


async def _real_monthly_revenue(db: AsyncSession, months: int = 6) -> list:
    """Ingresos reales por mes (transacciones completadas), últimos N meses."""
    since = datetime.now(timezone.utc) - timedelta(days=months * 31)
    r = await db.execute(
        select(
            func.date_trunc("month", PaymentTransaction.created_at).label("m"),
            func.sum(PaymentTransaction.amount).label("total"),
            func.count().label("count"),
        )
        .where(
            and_(
                PaymentTransaction.status == "completed",
                PaymentTransaction.created_at >= since,
            )
        )
        .group_by("m")
        .order_by("m")
    )
    return [
        {"month": m.strftime("%Y-%m") if m else None, "revenue": float(total or 0), "transactions": int(count or 0)}
        for m, total, count in r.all()
    ]


def require_super(current_user: User = Depends(get_current_user)):
    from app.core.config import settings
    if current_user.email != settings.SUPER_ADMIN_EMAIL:
        raise HTTPException(403, "Solo Super Admin puede acceder")
    return current_user


# ── Advertising ────────────────────────────────────────────────────────────────

@router.get("/advertising/summary")
async def advertising_summary(current_user: User = Depends(require_super)):
    """
    Resumen consolidado de inversión publicitaria.
    Requiere integración externa (Meta Ads / Google Ads / TikTok Ads). Sin conexión
    real se devuelven valores en 0 y source='no_conectado' (no se inventan datos).
    """
    return {
        "source": "no_conectado",
        "requires_integration": ["meta_ads", "google_ads", "tiktok_ads", "linkedin_ads"],
        "total_spend_month": 0,
        "total_spend_month_label": "₲ 0",
        "total_leads": 0,
        "cost_per_lead": 0,
        "cost_per_lead_label": "₲ 0",
        "conversions": 0,
        "cost_per_conversion": 0,
        "cost_per_conversion_label": "₲ 0",
        "roi_percent": 0,
        "platforms": [],
        "monthly_trend": [],
    }


@router.get("/advertising/campaigns")
async def advertising_campaigns(current_user: User = Depends(require_super)):
    """
    Campañas activas detalladas.
    Requiere integración con las APIs de Ads. Sin conexión real → lista vacía.
    """
    return {
        "source": "no_conectado",
        "requires_integration": ["meta_ads", "google_ads", "tiktok_ads", "linkedin_ads"],
        "campaigns": [],
    }


# ── Analytics Web ──────────────────────────────────────────────────────────────

@router.get("/analytics/web")
async def analytics_web(current_user: User = Depends(require_super)):
    """
    Tráfico y conversiones del sitio web.
    Requiere integración con Google Analytics 4 / Search Console. Sin conexión real
    se devuelven valores en 0 y source='no_conectado'.
    """
    return {
        "source": "no_conectado",
        "requires_integration": ["google_analytics_4", "google_search_console"],
        "period": "Últimos 30 días",
        "sessions": 0,
        "users": 0,
        "new_users": 0,
        "pageviews": 0,
        "avg_session_duration": "0m 00s",
        "bounce_rate": 0.0,
        "conversion_rate": 0.0,
        "conversions": 0,
        "top_pages": [],
        "traffic_sources": [],
        "monthly_sessions": [],
        "search_console": {
            "impressions": 0,
            "clicks": 0,
            "ctr": 0.0,
            "avg_position": 0.0,
            "top_queries": [],
        },
    }


# ── Social Media ───────────────────────────────────────────────────────────────

@router.get("/social/metrics")
async def social_metrics(current_user: User = Depends(require_super)):
    """
    Métricas de redes sociales orgánicas.
    Requiere integración con las APIs de Instagram/Facebook/TikTok/LinkedIn.
    Sin conexión real se devuelven valores en 0 y source='no_conectado'.
    """
    return {
        "source": "no_conectado",
        "requires_integration": ["instagram", "facebook", "tiktok", "linkedin"],
        "summary": {
            "total_followers": 0,
            "followers_growth_30d": 0,
            "avg_engagement_rate": 0.0,
            "total_reach_30d": 0,
        },
        "platforms": [],
        "monthly_followers": [],
    }


# ── Marketing Automation ───────────────────────────────────────────────────────

@router.get("/marketing/leads")
async def marketing_leads(current_user: User = Depends(require_super)):
    """
    Embudo de captación de clientes.
    Requiere integración con CRM/marketing externo (HubSpot, etc.). Sin conexión real
    se devuelven valores en 0 y source='no_conectado'.
    """
    return {
        "source": "no_conectado",
        "requires_integration": ["hubspot", "crm"],
        "period": "Últimos 30 días",
        "funnel": [],
        "lead_sources": [],
        "pipeline_value": 0,
        "pipeline_label": "₲ 0",
        "avg_deal_size": 0,
        "avg_deal_label": "₲ 0",
        "avg_close_days": 0,
    }


@router.get("/marketing/email")
async def marketing_email(current_user: User = Depends(require_super)):
    """
    Estadísticas de email marketing.
    Requiere integración con proveedor de email marketing (HubSpot/Mailchimp/Brevo).
    Sin conexión real se devuelven valores en 0 y source='no_conectado'.
    """
    return {
        "source": "no_conectado",
        "requires_integration": ["hubspot", "mailchimp", "activecampaign", "brevo"],
        "contacts": 0,
        "active_subscribers": 0,
        "campaigns_30d": 0,
        "avg_open_rate": 0.0,
        "avg_click_rate": 0.0,
        "unsubscribes_30d": 0,
        "campaigns": [],
        "providers": [
            {"name": "HubSpot",        "connected": False, "contacts": 0, "plan": "—"},
            {"name": "Mailchimp",      "connected": False, "contacts": 0, "plan": "—"},
            {"name": "ActiveCampaign", "connected": False, "contacts": 0, "plan": "—"},
            {"name": "Brevo",          "connected": False, "contacts": 0, "plan": "—"},
        ],
    }


# ── Payments SaaS ──────────────────────────────────────────────────────────────

@router.get("/payments/summary")
async def payments_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super),
):
    """Ingresos SaaS consolidados — derivados de datos reales (tenants + payment_transactions)."""
    from app.core.config import settings

    # ── Tenants reales ───────────────────────────────────────────────
    r = await db.execute(select(Tenant))
    all_tenants = r.scalars().all()
    tenants = [t for t in all_tenants if t.is_active]

    mrr = sum(PLAN_PRICES.get(t.plan, 0) for t in tenants if t.payment_status == "active")
    trial = [t for t in tenants if t.payment_status == "trial"]
    active = [t for t in tenants if t.payment_status == "active"]
    overdue = [t for t in tenants if t.payment_status == "overdue"]
    cancelled = [t for t in all_tenants if t.payment_status == "cancelled"]

    # Churn real: cancelados / (activos + cancelados)
    churn_base = len(active) + len(cancelled)
    churn_rate = round(len(cancelled) / churn_base * 100, 1) if churn_base else 0.0

    # Suscripciones por plan (real)
    by_plan = {}
    for t in active:
        by_plan[t.plan] = by_plan.get(t.plan, 0) + 1

    # ── Volumen real por procesador (transacciones completadas) ──────
    rev_by_provider = await _real_revenue_by_provider(db)
    processor_keys = {"bancard": "Bancard", "stripe": "Stripe", "mercadopago": "MercadoPago", "paypal": "PayPal"}
    keys_configured = {
        "bancard": bool(settings.BANCARD_PRIVATE_KEY),
        "stripe": bool(settings.STRIPE_SECRET_KEY),
        "mercadopago": bool(settings.MERCADOPAGO_ACCESS_TOKEN),
        "paypal": bool(settings.PAYPAL_CLIENT_ID),
    }
    processors = [
        {
            "name": label,
            "connected": keys_configured.get(key, False),
            "volume_month": int(rev_by_provider.get(key, {}).get("volume", 0)),
            "transactions": int(rev_by_provider.get(key, {}).get("transactions", 0)),
        }
        for key, label in processor_keys.items()
    ]

    monthly_revenue = await _real_monthly_revenue(db)

    return {
        "mrr": mrr,
        "mrr_label": f"₲ {mrr:,.0f}".replace(",", "."),
        "arr": mrr * 12,
        "arr_label": f"₲ {mrr*12:,.0f}".replace(",", "."),
        "total_tenants": len(tenants),
        "active": len(active),
        "trial": len(trial),
        "overdue": len(overdue),
        "cancelled": len(cancelled),
        "by_plan": by_plan,
        "churn_rate": churn_rate,
        "ltv": mrr * 18 // max(len(active), 1),
        "processors": processors,
        "monthly_revenue": monthly_revenue,
    }


# ── Business Intelligence KPIs ────────────────────────────────────────────────

@router.get("/bi/kpis")
async def bi_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super),
):
    """
    KPIs consolidados del negocio XLegal.
    La sección 'saas' usa datos REALES de la BD. Las secciones de marketing/ads/web/social
    requieren integraciones externas y se devuelven en 0 con source='no_conectado'.
    """
    # ── Clientes (tenants activos) y usuarios reales ─────────────────
    r = await db.execute(select(func.count(Tenant.id)).where(Tenant.is_active == True))
    total_clients = r.scalar() or 0

    ru = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    total_users = ru.scalar() or 0

    r2 = await db.execute(select(Tenant).where(Tenant.payment_status == "active"))
    active_tenants = r2.scalars().all()
    mrr = sum(PLAN_PRICES.get(t.plan, 0) for t in active_tenants)

    # Churn real
    rc = await db.execute(select(func.count(Tenant.id)).where(Tenant.payment_status == "cancelled"))
    cancelled = rc.scalar() or 0
    churn_base = len(active_tenants) + cancelled
    churn_rate = round(cancelled / churn_base * 100, 1) if churn_base else 0.0

    # Ingreso real acumulado (transacciones completadas)
    rrev = await db.execute(
        select(func.sum(PaymentTransaction.amount)).where(PaymentTransaction.status == "completed")
    )
    total_revenue = float(rrev.scalar() or 0)

    return {
        "saas": {
            "source": "real",
            "mrr": mrr,
            "mrr_growth_pct": 0.0,  # requiere histórico de MRR; 0 hasta tener serie temporal
            "total_clients": total_clients,
            "total_users": total_users,
            "total_revenue": total_revenue,
            "churn_rate": churn_rate,
            "nps": 0,  # requiere encuesta NPS; sin fuente real → 0
        },
        "marketing": {
            "source": "no_conectado",
            "cac": 0,
            "cac_label": "₲ 0",
            "ltv": mrr * 18 // max(len(active_tenants), 1) if active_tenants else 0,
            "ltv_cac_ratio": 0.0,
            "leads_month": 0,
            "conversion_rate": 0.0,
        },
        "ads": {
            "source": "no_conectado",
            "total_spend_month": 0,
            "roi_percent": 0,
            "impressions": 0,
            "clicks": 0,
            "ctr": 0.0,
        },
        "web": {
            "source": "no_conectado",
            "sessions_month": 0,
            "organic_pct": 0.0,
            "conversion_rate": 0.0,
        },
        "social": {
            "source": "no_conectado",
            "total_followers": 0,
            "growth_30d": 0,
            "avg_engagement": 0.0,
        },
        "bi_tools": [
            {"name": "Google Looker Studio", "connected": False, "url": "https://lookerstudio.google.com"},
            {"name": "Power BI",             "connected": False, "url": "https://powerbi.microsoft.com"},
            {"name": "Tableau",              "connected": False, "url": "https://tableau.com"},
        ]
    }


# ── Integration Config ─────────────────────────────────────────────────────────

class IntegrationConfig(BaseModel):
    platform: str
    api_key: Optional[str] = None
    account_id: Optional[str] = None
    token: Optional[str] = None

@router.post("/integrations/config")
async def save_integration(data: IntegrationConfig, current_user: User = Depends(require_super)):
    """Guarda tokens de APIs de marketing (simplificado)."""
    return {"success": True, "message": f"Configuración de {data.platform} guardada (simulado)"}


@router.get("/integrations/status")
async def integrations_status(current_user: User = Depends(require_super)):
    """
    Estado de todas las integraciones de negocio.
    El estado de pagos se deriva de las credenciales reales configuradas en settings.
    Las integraciones de marketing/analytics/ads/bi no tienen fuente real → connected=False.
    """
    from app.core.config import settings

    def _conn(connected: bool):
        return {"connected": connected, "account": None, "last_sync": None}

    return {
        "advertising": [
            {"name": "Meta Ads",     **_conn(False)},
            {"name": "Google Ads",   **_conn(False)},
            {"name": "TikTok Ads",   **_conn(False)},
            {"name": "LinkedIn Ads", **_conn(False)},
            {"name": "X Ads",        **_conn(False)},
        ],
        "analytics": [
            {"name": "Google Analytics 4",   **_conn(False)},
            {"name": "Google Search Console", **_conn(False)},
            {"name": "Hotjar",               **_conn(False)},
            {"name": "Mixpanel",             **_conn(False)},
        ],
        "marketing": [
            {"name": "HubSpot",        **_conn(False)},
            {"name": "Mailchimp",      **_conn(False)},
            {"name": "ActiveCampaign", **_conn(False)},
            {"name": "Brevo",          **_conn(False)},
        ],
        "payments": [
            {"name": "Bancard",     **_conn(bool(settings.BANCARD_PRIVATE_KEY))},
            {"name": "Stripe",      **_conn(bool(settings.STRIPE_SECRET_KEY))},
            {"name": "MercadoPago", **_conn(bool(settings.MERCADOPAGO_ACCESS_TOKEN))},
            {"name": "PayPal",      **_conn(bool(settings.PAYPAL_CLIENT_ID))},
        ],
        "bi": [
            {"name": "Google Looker Studio", **_conn(False)},
            {"name": "Power BI",             **_conn(False)},
            {"name": "Tableau",              **_conn(False)},
        ],
    }
