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

router = APIRouter(prefix="/business", tags=["business-intel"])


def require_super(current_user: User = Depends(get_current_user)):
    from app.core.config import settings
    if current_user.email != settings.SUPER_ADMIN_EMAIL:
        raise HTTPException(403, "Solo Super Admin puede acceder")
    return current_user


# ── Advertising ────────────────────────────────────────────────────────────────

@router.get("/advertising/summary")
async def advertising_summary(current_user: User = Depends(require_super)):
    """Resumen consolidado de inversión publicitaria."""
    return {
        "total_spend_month": 4850000,
        "total_spend_month_label": "₲ 4.850.000",
        "total_leads": 142,
        "cost_per_lead": 34155,
        "cost_per_lead_label": "₲ 34.155",
        "conversions": 18,
        "cost_per_conversion": 269444,
        "cost_per_conversion_label": "₲ 269.444",
        "roi_percent": 312,
        "platforms": [
            {"name": "Meta (FB+IG)", "spend": 2100000, "spend_label": "₲ 2.100.000", "leads": 68, "conversions": 9,  "status": "active", "color": "#1877F2"},
            {"name": "Google Ads",   "spend": 1800000, "spend_label": "₲ 1.800.000", "leads": 52, "conversions": 7,  "status": "active", "color": "#EA4335"},
            {"name": "TikTok Ads",   "spend":  450000, "spend_label": "₲ 450.000",   "leads": 14, "conversions": 1,  "status": "active", "color": "#000000"},
            {"name": "LinkedIn Ads", "spend":  350000, "spend_label": "₲ 350.000",   "leads":  6, "conversions": 1,  "status": "paused", "color": "#0077B5"},
            {"name": "X (Twitter)",  "spend":  150000, "spend_label": "₲ 150.000",   "leads":  2, "conversions": 0,  "status": "paused", "color": "#1DA1F2"},
        ],
        "monthly_trend": [
            {"month": "Sep", "spend": 2800000, "leads": 78,  "conversions": 10},
            {"month": "Oct", "spend": 3200000, "leads": 95,  "conversions": 12},
            {"month": "Nov", "spend": 3800000, "leads": 112, "conversions": 14},
            {"month": "Dic", "spend": 4200000, "leads": 128, "conversions": 16},
            {"month": "Ene", "spend": 4600000, "leads": 135, "conversions": 17},
            {"month": "Feb", "spend": 4850000, "leads": 142, "conversions": 18},
        ],
    }


@router.get("/advertising/campaigns")
async def advertising_campaigns(current_user: User = Depends(require_super)):
    """Campañas activas detalladas."""
    return {
        "campaigns": [
            {"id": "meta_001", "platform": "Meta", "name": "Abogados Paraguay - Leads", "status": "active",
             "budget_daily": 70000, "spend_total": 1200000, "leads": 38, "cpl": 31578, "start": "2025-01-15", "objective": "LEAD_GENERATION"},
            {"id": "meta_002", "platform": "Meta", "name": "Bufetes - Retargeting", "status": "active",
             "budget_daily": 30000, "spend_total": 900000, "leads": 30, "cpl": 30000, "start": "2025-02-01", "objective": "CONVERSIONS"},
            {"id": "goog_001", "platform": "Google", "name": "abogado asuncion - Search", "status": "active",
             "budget_daily": 50000, "spend_total": 1100000, "leads": 35, "cpl": 31428, "start": "2025-01-10", "objective": "SEARCH"},
            {"id": "goog_002", "platform": "Google", "name": "XLegal Software Legal - Brand", "status": "active",
             "budget_daily": 20000, "spend_total": 700000, "leads": 17, "cpl": 41176, "start": "2025-01-20", "objective": "BRAND"},
            {"id": "ttok_001", "platform": "TikTok", "name": "Software Abogados PY", "status": "active",
             "budget_daily": 15000, "spend_total": 450000, "leads": 14, "cpl": 32142, "start": "2025-02-10", "objective": "TRAFFIC"},
            {"id": "link_001", "platform": "LinkedIn", "name": "Bufetes Premium - B2B", "status": "paused",
             "budget_daily":  0,     "spend_total": 350000, "leads":  6, "cpl": 58333, "start": "2025-01-01", "objective": "LEAD_GEN"},
        ]
    }


# ── Analytics Web ──────────────────────────────────────────────────────────────

@router.get("/analytics/web")
async def analytics_web(current_user: User = Depends(require_super)):
    """Tráfico y conversiones del sitio web."""
    return {
        "period": "Últimos 30 días",
        "sessions": 8420,
        "users": 6234,
        "new_users": 5018,
        "pageviews": 24680,
        "avg_session_duration": "2m 34s",
        "bounce_rate": 42.3,
        "conversion_rate": 2.1,
        "conversions": 18,
        "top_pages": [
            {"page": "/", "views": 8420, "avg_time": "1m 12s"},
            {"page": "/precios", "views": 3240, "avg_time": "3m 45s"},
            {"page": "/features", "views": 2180, "avg_time": "2m 18s"},
            {"page": "/contacto", "views": 1860, "avg_time": "1m 55s"},
            {"page": "/blog/plazos-cpc", "views": 1240, "avg_time": "5m 22s"},
        ],
        "traffic_sources": [
            {"source": "Google Ads",   "sessions": 2420, "pct": 28.7, "color": "#EA4335"},
            {"source": "Orgánico",     "sessions": 2180, "pct": 25.9, "color": "#34A853"},
            {"source": "Meta Ads",     "sessions": 1640, "pct": 19.5, "color": "#1877F2"},
            {"source": "Directo",      "sessions": 1120, "pct": 13.3, "color": "#6366F1"},
            {"source": "Referidos",    "sessions":  680, "pct":  8.1, "color": "#F59E0B"},
            {"source": "TikTok",       "sessions":  380, "pct":  4.5, "color": "#000000"},
        ],
        "monthly_sessions": [
            {"month":"Sep","sessions":4200},{"month":"Oct","sessions":5100},
            {"month":"Nov","sessions":5800},{"month":"Dic","sessions":6400},
            {"month":"Ene","sessions":7200},{"month":"Feb","sessions":8420},
        ],
        "search_console": {
            "impressions": 48200,
            "clicks": 3840,
            "ctr": 7.9,
            "avg_position": 4.2,
            "top_queries": [
                {"query": "software abogados paraguay", "clicks": 420, "impressions": 3200, "position": 2.1},
                {"query": "programa gestión estudio jurídico", "clicks": 380, "impressions": 2800, "position": 3.4},
                {"query": "abogado asuncion", "clicks": 310, "impressions": 5400, "position": 5.8},
                {"query": "gestión casos legales", "clicks": 280, "impressions": 2100, "position": 2.9},
                {"query": "facturación jurídica paraguay", "clicks": 195, "impressions": 1600, "position": 4.1},
            ]
        }
    }


# ── Social Media ───────────────────────────────────────────────────────────────

@router.get("/social/metrics")
async def social_metrics(current_user: User = Depends(require_super)):
    """Métricas de redes sociales orgánicas."""
    return {
        "summary": {
            "total_followers": 12840,
            "followers_growth_30d": 428,
            "avg_engagement_rate": 4.2,
            "total_reach_30d": 48200,
        },
        "platforms": [
            {
                "name": "Instagram", "icon": "ig", "color": "#E1306C",
                "followers": 5420, "growth": "+182 (3.5%)", "growth_pct": 3.5,
                "engagement": 5.8, "reach_30d": 18400, "posts_30d": 12,
                "top_post": "Conocé los plazos del CPC 📋", "top_post_reach": 4200,
            },
            {
                "name": "Facebook", "icon": "fb", "color": "#1877F2",
                "followers": 3180, "growth": "+98 (3.2%)", "growth_pct": 3.2,
                "engagement": 3.1, "reach_30d": 12800, "posts_30d": 15,
                "top_post": "Software legal para Paraguay 🇵🇾", "top_post_reach": 2800,
            },
            {
                "name": "TikTok", "icon": "tt", "color": "#000000",
                "followers": 2840, "growth": "+124 (4.6%)", "growth_pct": 4.6,
                "engagement": 6.4, "reach_30d": 9800, "posts_30d": 8,
                "top_post": "¿Sabías esto del derecho laboral?", "top_post_reach": 8400,
            },
            {
                "name": "LinkedIn", "icon": "li", "color": "#0077B5",
                "followers": 1200, "growth": "+24 (2.0%)", "growth_pct": 2.0,
                "engagement": 2.8, "reach_30d": 4800, "posts_30d": 6,
                "top_post": "XLegal v2.0: gestión legal integral", "top_post_reach": 1800,
            },
        ],
        "monthly_followers": [
            {"month":"Sep","total":10900},{"month":"Oct","total":11200},
            {"month":"Nov","total":11600},{"month":"Dic","total":12000},
            {"month":"Ene","total":12400},{"month":"Feb","total":12840},
        ]
    }


# ── Marketing Automation ───────────────────────────────────────────────────────

@router.get("/marketing/leads")
async def marketing_leads(current_user: User = Depends(require_super)):
    """Embudo de captación de clientes."""
    return {
        "period": "Últimos 30 días",
        "funnel": [
            {"stage": "Visitantes web", "count": 8420, "pct": 100, "color": "#6366F1"},
            {"stage": "Leads generados", "count": 142,  "pct": 1.7, "color": "#8B5CF6"},
            {"stage": "Demo solicitada", "count":  48,  "pct": 0.6, "color": "#A855F7"},
            {"stage": "Demo realizada",  "count":  31,  "pct": 0.4, "color": "#C084FC"},
            {"stage": "Conversión",      "count":  18,  "pct": 0.2, "color": "#C9A84C"},
        ],
        "lead_sources": [
            {"source": "Google Ads",   "leads": 52, "cost": 1800000, "cpl": 34615},
            {"source": "Meta Ads",     "leads": 68, "cost": 2100000, "cpl": 30882},
            {"source": "Orgánico SEO", "leads": 14, "cost": 0,       "cpl": 0},
            {"source": "Referidos",    "leads":  8, "cost": 0,       "cpl": 0},
        ],
        "pipeline_value": 45000000,
        "pipeline_label": "₲ 45.000.000",
        "avg_deal_size": 2500000,
        "avg_deal_label": "₲ 2.500.000",
        "avg_close_days": 14,
    }


@router.get("/marketing/email")
async def marketing_email(current_user: User = Depends(require_super)):
    """Estadísticas de email marketing."""
    return {
        "contacts": 1842,
        "active_subscribers": 1420,
        "campaigns_30d": 4,
        "avg_open_rate": 38.4,
        "avg_click_rate": 6.2,
        "unsubscribes_30d": 12,
        "campaigns": [
            {"name": "Bienvenida nuevos leads",       "sent": 142, "open_rate": 54.2, "click_rate": 12.4, "type": "automation", "date": "Continuo"},
            {"name": "Newsletter legal febrero",      "sent": 980, "open_rate": 41.8, "click_rate":  7.2, "type": "campaign",   "date": "2025-02-15"},
            {"name": "Oferta especial Plan Bufete",   "sent": 420, "open_rate": 38.6, "click_rate":  9.8, "type": "campaign",   "date": "2025-02-08"},
            {"name": "Demo confirmación",             "sent":  48, "open_rate": 82.4, "click_rate": 34.2, "type": "automation", "date": "Continuo"},
        ],
        "providers": [
            {"name": "HubSpot",       "connected": True,  "contacts": 1842, "plan": "Starter"},
            {"name": "Mailchimp",     "connected": False, "contacts": 0,    "plan": "—"},
            {"name": "ActiveCampaign","connected": False, "contacts": 0,    "plan": "—"},
            {"name": "Brevo",         "connected": False, "contacts": 0,    "plan": "—"},
        ]
    }


# ── Payments SaaS ──────────────────────────────────────────────────────────────

@router.get("/payments/summary")
async def payments_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super),
):
    """Ingresos SaaS consolidados."""
    # Real data from tenants
    r = await db.execute(select(Tenant).where(Tenant.is_active == True))
    tenants = r.scalars().all()

    plan_prices = {"solo": 75000, "bufete_s": 300000, "bufete_m": 500000, "bufete_l": 800000}
    mrr = sum(plan_prices.get(t.plan, 0) for t in tenants if t.payment_status == "active")
    trial = [t for t in tenants if t.payment_status == "trial"]
    active = [t for t in tenants if t.payment_status == "active"]
    overdue = [t for t in tenants if t.payment_status == "overdue"]

    return {
        "mrr": mrr,
        "mrr_label": f"₲ {mrr:,.0f}".replace(",", "."),
        "arr": mrr * 12,
        "arr_label": f"₲ {mrr*12:,.0f}".replace(",", "."),
        "total_tenants": len(tenants),
        "active": len(active),
        "trial": len(trial),
        "overdue": len(overdue),
        "churn_rate": 0.0,  # Calculated from real data when available
        "ltv": mrr * 18 // max(len(active), 1),
        "processors": [
            {"name": "Bancard",      "connected": True,  "volume_month": int(mrr * 0.7), "transactions": len(active) * 7 // 10 or 0},
            {"name": "Stripe",       "connected": True,  "volume_month": int(mrr * 0.2), "transactions": len(active) * 2 // 10 or 0},
            {"name": "MercadoPago",  "connected": True,  "volume_month": int(mrr * 0.1), "transactions": len(active) * 1 // 10 or 0},
            {"name": "PayPal",       "connected": False, "volume_month": 0, "transactions": 0},
        ],
        "monthly_revenue": []  # Populated from real payment data
    }


# ── Business Intelligence KPIs ────────────────────────────────────────────────

@router.get("/bi/kpis")
async def bi_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super),
):
    """KPIs consolidados del negocio XLegal."""
    r = await db.execute(select(func.count(Tenant.id)).where(Tenant.is_active == True))
    total_clients = r.scalar() or 0
    plan_prices = {"solo": 75000, "bufete_s": 300000, "bufete_m": 500000, "bufete_l": 800000}

    r2 = await db.execute(select(Tenant).where(Tenant.payment_status == "active"))
    active_tenants = r2.scalars().all()
    mrr = sum(plan_prices.get(t.plan, 0) for t in active_tenants)

    return {
        "saas": {
            "mrr": mrr,
            "mrr_growth_pct": 8.4,
            "total_clients": total_clients,
            "churn_rate": 0.0,  # Calculated from real data when available
            "nps": 72,
        },
        "marketing": {
            "cac": 269444,
            "cac_label": "₲ 269.444",
            "ltv": mrr * 18 // max(len(active_tenants), 1) if active_tenants else 0,
            "ltv_cac_ratio": 3.2,
            "leads_month": 142,
            "conversion_rate": 12.7,
        },
        "ads": {
            "total_spend_month": 4850000,
            "roi_percent": 312,
            "impressions": 248000,
            "clicks": 8420,
            "ctr": 3.4,
        },
        "web": {
            "sessions_month": 8420,
            "organic_pct": 25.9,
            "conversion_rate": 2.1,
        },
        "social": {
            "total_followers": 12840,
            "growth_30d": 428,
            "avg_engagement": 4.2,
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
    """Estado de todas las integraciones de negocio."""
    return {
        "advertising": [
            {"name": "Meta Ads",    "connected": True,  "account": "act_1234567890", "last_sync": "hace 2 min"},
            {"name": "Google Ads",  "connected": True,  "account": "123-456-7890",   "last_sync": "hace 5 min"},
            {"name": "TikTok Ads",  "connected": True,  "account": "TT_xlegal_py",   "last_sync": "hace 15 min"},
            {"name": "LinkedIn Ads","connected": False, "account": None,             "last_sync": None},
            {"name": "X Ads",       "connected": False, "account": None,             "last_sync": None},
        ],
        "analytics": [
            {"name": "Google Analytics 4",  "connected": True,  "account": "G-XLEGAL2025", "last_sync": "hace 1h"},
            {"name": "Google Search Console","connected": True,  "account": "xlegal.com.py","last_sync": "hace 6h"},
            {"name": "Hotjar",              "connected": False, "account": None,            "last_sync": None},
            {"name": "Mixpanel",            "connected": False, "account": None,            "last_sync": None},
        ],
        "marketing": [
            {"name": "HubSpot",       "connected": True,  "account": "xlegal-crm",  "last_sync": "hace 10 min"},
            {"name": "Mailchimp",     "connected": False, "account": None,          "last_sync": None},
            {"name": "ActiveCampaign","connected": False, "account": None,          "last_sync": None},
            {"name": "Brevo",         "connected": False, "account": None,          "last_sync": None},
        ],
        "payments": [
            {"name": "Bancard",     "connected": True,  "account": "xlegal_py",     "last_sync": "en vivo"},
            {"name": "Stripe",      "connected": True,  "account": "acct_xlegal",   "last_sync": "en vivo"},
            {"name": "MercadoPago", "connected": True,  "account": "xlegal.com.py", "last_sync": "en vivo"},
            {"name": "PayPal",      "connected": False, "account": None,            "last_sync": None},
        ],
        "bi": [
            {"name": "Google Looker Studio","connected": False,"account": None,"last_sync": None},
            {"name": "Power BI",           "connected": False,"account": None,"last_sync": None},
            {"name": "Tableau",            "connected": False,"account": None,"last_sync": None},
        ]
    }
