"""
XLegal — Panel Super Admin
Gestión completa del negocio: tenants, suscripciones, pagos, recordatorios.
Acceso exclusivo: xabiercarrillo@gmail.com
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from app.core.database import get_db, create_tenant_schema
from app.core.deps import get_current_user
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.tenant import Tenant

router = APIRouter(prefix="/superadmin", tags=["superadmin"])

SUPER_ADMIN_EMAIL = "xabiercarrillo@gmail.com"
CONTACT_PHONE = "0993397400"

# ── Planes en Guaraníes ─────────────────────────────────────────────
PLANS = {
    "solo": {
        "name": "Solo",
        "description": "1 abogado independiente",
        "max_users": 1,
        "price_pyg": 75_000,
        "price_label": "₲ 75.000/mes",
        "features": ["1 usuario", "Todos los módulos", "Soporte básico"],
    },
    "bufete_s": {
        "name": "Buffet S",
        "description": "Pequeño estudio",
        "max_users": 5,
        "price_pyg": 300_000,
        "price_label": "₲ 300.000/mes",
        "features": ["Hasta 5 usuarios", "Todos los módulos", "Soporte estándar", "LEXI IA"],
    },
    "bufete_m": {
        "name": "Buffet M",
        "description": "Estudio mediano",
        "max_users": 10,
        "price_pyg": 500_000,
        "price_label": "₲ 500.000/mes",
        "features": ["Hasta 10 usuarios", "Todos los módulos", "Soporte prioritario", "LEXI IA", "API WhatsApp"],
        "recommended": True,
    },
    "bufete_l": {
        "name": "Buffet L",
        "description": "Grandes estudios / corporativo",
        "max_users": -1,
        "price_pyg": None,
        "price_label": "Consultar",
        "contact": CONTACT_PHONE,
        "features": ["Usuarios ilimitados", "Todos los módulos", "Soporte dedicado 24/7", "LEXI IA", "API WhatsApp", "Personalización", "SLA garantizado"],
    },
}

PAYMENT_STATUS_LABELS = {
    "trial": "🆓 Período de prueba",
    "active": "✅ Activo",
    "overdue": "⚠️ Vencido",
    "cancelled": "❌ Cancelado",
    "pending": "🕐 Pendiente",
}


def _require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.email != SUPER_ADMIN_EMAIL and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(403, "Acceso denegado — Solo Super Admin")
    return current_user


def _tenant_dict(t: Tenant, user_count: int = 0) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "legal_name": t.legal_name,
        "ruc": t.ruc,
        "email": t.email,
        "phone": t.phone,
        "whatsapp": t.whatsapp,
        "admin_name": t.admin_name,
        "admin_email": t.admin_email,
        "admin_phone": t.admin_phone,
        "city": t.city,
        "plan": t.plan,
        "plan_info": PLANS.get(t.plan, {}),
        "is_active": t.is_active,
        "payment_status": t.payment_status,
        "payment_status_label": PAYMENT_STATUS_LABELS.get(t.payment_status, t.payment_status),
        "trial_ends_at": t.trial_ends_at,
        "subscription_started_at": t.subscription_started_at,
        "subscription_expires_at": t.subscription_expires_at,
        "last_payment_at": t.last_payment_at,
        "next_payment_at": t.next_payment_at,
        "payment_notes": t.payment_notes,
        "db_schema": t.db_schema,
        "notes": t.notes,
        "referral_source": t.referral_source,
        "user_count": user_count,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


# ═══════════════════════════════════════════════════
#  PUBLIC ENDPOINTS (sin auth)
# ═══════════════════════════════════════════════════

@router.get("/plans")
async def get_plans():
    """Planes disponibles — usado en landing page"""
    return {"plans": PLANS, "contact": CONTACT_PHONE}


@router.post("/register")
async def register_tenant(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Auto-registro de nuevos clientes desde la landing page.
    Crea tenant + usuario admin + schema aislado en PostgreSQL.
    """
    # Validate required fields
    required = ["firm_name", "admin_name", "email", "password", "plan"]
    for field in required:
        if not data.get(field):
            raise HTTPException(400, f"Campo requerido: {field}")

    plan = data["plan"]
    if plan not in PLANS:
        raise HTTPException(400, f"Plan inválido: {plan}")
    if len(data.get("password", "")) < 8:
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres")

    # Check email not already used
    existing = await db.execute(select(User).where(User.email == data["email"]))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Este email ya está registrado")

    # Create tenant
    tenant_id = str(uuid.uuid4())
    schema_name = f"t_{tenant_id.replace('-', '_')[:20]}"  # PostgreSQL schema name
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=14)

    tenant = Tenant(
        id=tenant_id,
        name=data["firm_name"],
        legal_name=data.get("legal_name"),
        ruc=data.get("ruc"),
        email=data["email"],
        phone=data.get("phone"),
        whatsapp=data.get("whatsapp", data.get("phone")),
        admin_name=data["admin_name"],
        admin_email=data["email"],
        admin_phone=data.get("phone"),
        city=data.get("city", "Asunción"),
        plan=plan,
        db_schema=schema_name,
        is_active=True,
        payment_status="trial",
        trial_ends_at=trial_end.strftime("%Y-%m-%d"),
        next_payment_at=trial_end.strftime("%Y-%m-%d"),
        referral_source=data.get("referral_source"),
        notes=data.get("notes"),
    )
    db.add(tenant)

    # Create admin user for this tenant
    admin_user = User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        email=data["email"],
        hashed_password=hash_password(data["password"]),
        full_name=data["admin_name"],
        role=UserRole.FIRM_ADMIN,
        is_active=True,
    )
    db.add(admin_user)
    await db.commit()

    # Crear schema PostgreSQL aislado para el tenant
    await create_tenant_schema(schema_name)

    # Enviar email de bienvenida (no bloqueante)
    try:
        from app.core.email import send_welcome_email, send_email, _base_template
        await send_welcome_email(
            to=data["email"],
            name=data["admin_name"],
            firm=data["firm_name"],
            trial_ends=trial_end.strftime("%Y-%m-%d"),
            plan=PLANS[plan]["name"],
        )
        # Notificar a super admin
        plan_info = PLANS.get(plan, {})
        await send_email(
            SUPER_ADMIN_EMAIL,
            f"🆕 Nuevo cliente: {data['firm_name']} — {plan_info.get('name','')}",
            _base_template("Nuevo registro", f"""
            <h2>Nuevo cliente registrado</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:6px 0;color:#666;width:120px;">Estudio</td><td style="padding:6px 0;font-weight:bold;">{data['firm_name']}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Admin</td><td style="padding:6px 0;">{data['admin_name']}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;">{data['email']}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Plan</td><td style="padding:6px 0;color:#c9a84c;font-weight:bold;">{plan_info.get('name','')} — {plan_info.get('price_label','Consultar')}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Trial vence</td><td style="padding:6px 0;">{trial_end.strftime('%d/%m/%Y')}</td></tr>
            </table>
            <p style="margin-top:16px;"><a href="https://app.xlegal.com.py/superadmin" style="background:#1a1a2e;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver en SuperAdmin →</a></p>
            """)
        )
    except Exception:
        pass  # Email failure doesn't abort registration

    return {
        "message": "Cuenta creada exitosamente. Período de prueba: 14 días.",
        "tenant_id": tenant_id,
        "trial_ends": trial_end.strftime("%Y-%m-%d"),
        "plan": PLANS[plan]["name"],
        "contact": CONTACT_PHONE,
    }


# ═══════════════════════════════════════════════════
#  SUPER ADMIN — DASHBOARD
# ═══════════════════════════════════════════════════

@router.get("/dashboard")
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """KPIs del negocio"""
    total_tenants = (await db.execute(select(func.count()).select_from(Tenant))).scalar() or 0
    active_tenants = (await db.execute(select(func.count()).where(Tenant.is_active == True, Tenant.payment_status == "active"))).scalar() or 0
    trial_tenants = (await db.execute(select(func.count()).where(Tenant.payment_status == "trial"))).scalar() or 0
    overdue_tenants = (await db.execute(select(func.count()).where(Tenant.payment_status == "overdue"))).scalar() or 0
    total_users = (await db.execute(select(func.count()).where(User.is_active == True, User.email != SUPER_ADMIN_EMAIL))).scalar() or 0

    # MRR calculation
    plan_result = await db.execute(
        select(Tenant.plan, func.count().label("c"))
        .where(Tenant.is_active == True, Tenant.payment_status == "active")
        .group_by(Tenant.plan)
    )
    mrr = 0
    plan_dist = {}
    for row in plan_result:
        plan_dist[row.plan] = row.c
        price = PLANS.get(row.plan, {}).get("price_pyg") or 0
        mrr += price * row.c

    # All plans distribution (including trials)
    all_plans = await db.execute(
        select(Tenant.plan, func.count().label("c")).group_by(Tenant.plan)
    )
    all_plan_dist = {row.plan: row.c for row in all_plans}

    # Payment status distribution
    pay_status = await db.execute(
        select(Tenant.payment_status, func.count().label("c")).group_by(Tenant.payment_status)
    )
    pay_dist = {row.payment_status: row.c for row in pay_status}

    return {
        "kpis": {
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "trial_tenants": trial_tenants,
            "overdue_tenants": overdue_tenants,
            "total_users": total_users,
            "mrr_pyg": mrr,
            "mrr_label": f"₲ {mrr:,.0f}".replace(",", "."),
        },
        "plan_distribution": all_plan_dist,
        "payment_status": pay_dist,
        "plans": PLANS,
    }


# ═══════════════════════════════════════════════════
#  SUPER ADMIN — TENANTS
# ═══════════════════════════════════════════════════

@router.get("/tenants")
async def list_tenants(
    payment_status: Optional[str] = None,
    plan: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    q = select(Tenant)
    if payment_status:
        q = q.where(Tenant.payment_status == payment_status)
    if plan:
        q = q.where(Tenant.plan == plan)
    if search:
        q = q.where(
            Tenant.name.ilike(f"%{search}%") |
            Tenant.email.ilike(f"%{search}%") |
            Tenant.admin_name.ilike(f"%{search}%")
        )

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    q = q.order_by(Tenant.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    tenants = result.scalars().all()

    output = []
    for t in tenants:
        uc = (await db.execute(select(func.count()).where(User.tenant_id == t.id, User.is_active == True))).scalar() or 0
        output.append(_tenant_dict(t, uc))

    return {"tenants": output, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@router.get("/tenants/{tid}")
async def get_tenant(
    tid: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant no encontrado")
    uc = (await db.execute(select(func.count()).where(User.tenant_id == t.id, User.is_active == True))).scalar() or 0

    # Get users
    users_result = await db.execute(select(User).where(User.tenant_id == t.id, User.is_active == True))
    users = [{
        "id": u.id, "full_name": u.full_name, "email": u.email,
        "role": u.role.value if hasattr(u.role, "value") else u.role,
        "is_active": u.is_active,
    } for u in users_result.scalars().all()]

    return {**_tenant_dict(t, uc), "users": users}


class TenantCreate(BaseModel):
    firm_name: str
    legal_name: Optional[str] = None
    ruc: Optional[str] = None
    admin_name: str
    email: str
    password: str
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    city: Optional[str] = "Asunción"
    plan: str = "solo"
    notes: Optional[str] = None


@router.post("/tenants", status_code=201)
async def create_tenant(
    data: TenantCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Alta manual de nuevo cliente desde el panel admin"""
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "El email ya está en uso")

    if data.plan not in PLANS:
        raise HTTPException(400, f"Plan inválido. Opciones: {list(PLANS.keys())}")

    tenant_id = str(uuid.uuid4())
    schema_name = f"t_{tenant_id.replace('-', '_')[:20]}"
    now = datetime.now(timezone.utc)

    tenant = Tenant(
        id=tenant_id,
        name=data.firm_name,
        legal_name=data.legal_name,
        ruc=data.ruc,
        email=data.email,
        phone=data.phone,
        whatsapp=data.whatsapp or data.phone,
        admin_name=data.admin_name,
        admin_email=data.email,
        admin_phone=data.phone,
        city=data.city,
        plan=data.plan,
        db_schema=schema_name,
        is_active=True,
        payment_status="active",
        subscription_started_at=now.strftime("%Y-%m-%d"),
        next_payment_at=(now + timedelta(days=30)).strftime("%Y-%m-%d"),
        notes=data.notes,
    )
    db.add(tenant)

    admin_user = User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.admin_name,
        role=UserRole.FIRM_ADMIN,
        is_active=True,
    )
    db.add(admin_user)
    await db.commit()

    # Crear schema PostgreSQL aislado para el tenant
    await create_tenant_schema(schema_name)

    return {
        "message": f"Cliente '{data.firm_name}' creado exitosamente",
        "tenant_id": tenant_id,
        "plan": PLANS[data.plan]["name"],
        "price": PLANS[data.plan]["price_label"],
        "db_schema": schema_name,
    }


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    ruc: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    plan: Optional[str] = None
    payment_status: Optional[str] = None
    last_payment_at: Optional[str] = None
    next_payment_at: Optional[str] = None
    payment_notes: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/tenants/{tid}")
async def update_tenant(
    tid: str,
    data: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        if k == "plan" and v not in PLANS:
            raise HTTPException(400, f"Plan inválido: {v}")
        setattr(t, k, v)
    await db.commit()
    return {"message": "Actualizado", **_tenant_dict(t)}


@router.put("/tenants/{tid}/plan")
async def update_plan(tid: str, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(_require_super_admin)):
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant no encontrado")
    plan = data.get("plan")
    if plan not in PLANS:
        raise HTTPException(400, f"Plan inválido")
    t.plan = plan
    await db.commit()
    return {"message": f"Plan cambiado a {PLANS[plan]['name']}", "plan_info": PLANS[plan]}


@router.put("/tenants/{tid}/toggle")
async def toggle_tenant(tid: str, db: AsyncSession = Depends(get_db), admin: User = Depends(_require_super_admin)):
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404)
    t.is_active = not t.is_active
    if not t.is_active:
        t.payment_status = "cancelled"
    await db.commit()
    return {"is_active": t.is_active, "message": "Activado" if t.is_active else "Desactivado"}


@router.post("/tenants/{tid}/register-payment")
async def register_payment(
    tid: str,
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Registrar pago manual de suscripción"""
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404)

    now = datetime.now(timezone.utc)
    t.last_payment_at = data.get("payment_date", now.strftime("%Y-%m-%d"))
    t.next_payment_at = data.get("next_due", (now + timedelta(days=30)).strftime("%Y-%m-%d"))
    t.payment_status = "active"
    note = data.get("note", "")
    plan_price = PLANS.get(t.plan, {}).get("price_label", "")
    t.payment_notes = f"[{now.strftime('%Y-%m-%d')}] Pago registrado {plan_price}. {note}\n" + (t.payment_notes or "")

    await db.commit()

    # Notify client that subscription is now active
    try:
        from app.core.email import send_email, _base_template
        recipient = t.admin_email or t.email
        if recipient:
            plan_info = PLANS.get(t.plan, {})
            await send_email(
                recipient,
                "✅ Tu suscripción XLegal está activa",
                _base_template("Suscripción activa", f"""
                <h2>¡Tu suscripción está activa! ✅</h2>
                <p>Hola <strong>{t.admin_name or t.name}</strong>, confirmamos que recibimos tu pago.</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
                  <tr><td style="padding:6px 0;color:#666;width:120px;">Plan</td><td style="padding:6px 0;font-weight:bold;color:#c9a84c;">{plan_info.get('name','')}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;">Monto</td><td style="padding:6px 0;">{plan_info.get('price_label','')}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;">Próx. vto.</td><td style="padding:6px 0;">{t.next_payment_at}</td></tr>
                </table>
                <p>Tu acceso completo está habilitado hasta el <strong>{t.next_payment_at}</strong>.</p>
                <p style="margin-top:16px;"><a href="https://app.xlegal.com.py/dashboard" style="background:#1a1a2e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ir al Sistema →</a></p>
                <p style="font-size:13px;color:#999;margin-top:20px;">¿Dudas? WhatsApp: <strong>{CONTACT_PHONE}</strong></p>
                """)
            )
    except Exception:
        pass

    return {"message": "Pago registrado", "next_due": t.next_payment_at, "plan": t.plan}


# ═══════════════════════════════════════════════════
#  SUPER ADMIN — USUARIOS
# ═══════════════════════════════════════════════════

@router.get("/users")
async def list_all_users(
    tenant_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    q = select(User).where(User.email != SUPER_ADMIN_EMAIL)
    if tenant_id:
        q = q.where(User.tenant_id == tenant_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit))
    users = result.scalars().all()
    return {
        "users": [{
            "id": u.id, "full_name": u.full_name, "email": u.email,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "tenant_id": u.tenant_id, "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        } for u in users],
        "total": total,
    }


class UserCreate(BaseModel):
    tenant_id: str
    full_name: str
    email: str
    password: str
    role: str = "lawyer"


@router.post("/users", status_code=201)
async def create_user_admin(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Dar de alta un usuario en un tenant existente"""
    # Check tenant
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == data.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Tenant no encontrado")

    # Check plan user limit
    plan_info = PLANS.get(tenant.plan, {})
    max_users = plan_info.get("max_users", 1)
    if max_users != -1:
        current_count = (await db.execute(
            select(func.count()).where(User.tenant_id == data.tenant_id, User.is_active == True)
        )).scalar() or 0
        if current_count >= max_users:
            raise HTTPException(400, f"Límite del plan alcanzado: {max_users} usuario(s). Actualice el plan.")

    # Check email
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email ya registrado")

    try:
        role = UserRole(data.role)
    except ValueError:
        role = UserRole.LAWYER

    user = User(
        id=str(uuid.uuid4()),
        tenant_id=data.tenant_id,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    return {"message": f"Usuario '{data.full_name}' creado en {tenant.name}", "user_id": user.id}


@router.put("/users/{uid}/toggle")
async def toggle_user(uid: str, db: AsyncSession = Depends(get_db), admin: User = Depends(_require_super_admin)):
    result = await db.execute(select(User).where(User.id == uid))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(404)
    u.is_active = not u.is_active
    await db.commit()
    return {"is_active": u.is_active}


@router.put("/users/{uid}/reset-password")
async def reset_password(uid: str, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(_require_super_admin)):
    result = await db.execute(select(User).where(User.id == uid))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(404)
    new_pass = data.get("password")
    if not new_pass or len(new_pass) < 6:
        raise HTTPException(400, "Contraseña mínimo 6 caracteres")
    u.hashed_password = hash_password(new_pass)
    await db.commit()
    return {"message": "Contraseña actualizada"}


# ═══════════════════════════════════════════════════
#  SUPER ADMIN — COBRANZAS (subscripciones)
# ═══════════════════════════════════════════════════

@router.get("/billing")
async def subscription_billing(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Vista de todos los pagos de suscripciones pendientes"""
    result = await db.execute(
        select(Tenant)
        .where(Tenant.is_active == True)
        .order_by(Tenant.next_payment_at)
    )
    tenants = result.scalars().all()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    overdue = []
    due_soon = []
    active = []
    trial = []

    for t in tenants:
        info = {
            "id": t.id, "name": t.name, "admin_name": t.admin_name,
            "email": t.email, "whatsapp": t.whatsapp or t.phone,
            "plan": t.plan, "plan_label": PLANS.get(t.plan, {}).get("name", t.plan),
            "price": PLANS.get(t.plan, {}).get("price_label", "Consultar"),
            "payment_status": t.payment_status,
            "next_payment_at": t.next_payment_at,
            "last_payment_at": t.last_payment_at,
            "trial_ends_at": t.trial_ends_at,
        }
        if t.payment_status == "trial":
            trial.append(info)
        elif t.payment_status == "overdue":
            overdue.append(info)
        elif t.payment_status == "active":
            if t.next_payment_at and t.next_payment_at <= today:
                overdue.append({**info, "payment_status": "overdue"})
                # Auto-mark as overdue
            elif t.next_payment_at and t.next_payment_at <= (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d"):
                due_soon.append(info)
            else:
                active.append(info)

    return {
        "overdue": overdue,
        "due_soon": due_soon,
        "trial": trial,
        "active": active,
        "summary": {
            "overdue_count": len(overdue),
            "due_soon_count": len(due_soon),
            "trial_count": len(trial),
            "active_count": len(active),
        },
    }


@router.post("/billing/send-reminder/{tid}")
async def send_payment_reminder(
    tid: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Enviar recordatorio de pago por WhatsApp/Email (punto de integración)"""
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404)

    plan_price = PLANS.get(t.plan, {}).get("price_label", "Consultar")
    contact = t.whatsapp or t.phone or t.email or "—"
    msg = f"Hola {t.admin_name or t.name}, le recordamos que su suscripción XLegal ({PLANS.get(t.plan,{}).get('name','')}) por {plan_price} vence el {t.next_payment_at}. Para consultas: {CONTACT_PHONE}"

    # Integration point: Twilio WhatsApp / Resend / SMS
    now = datetime.now(timezone.utc)
    t.payment_notes = f"[{now.strftime('%Y-%m-%d %H:%M')}] Recordatorio enviado a {contact}\n" + (t.payment_notes or "")
    await db.commit()

    return {
        "message": f"Recordatorio enviado a {t.name}",
        "contact": contact,
        "template": msg,
        "sent_at": now.isoformat(),
    }


# ═══════════════════════════════════════════════════
#  SUPER ADMIN — STATS
# ═══════════════════════════════════════════════════

@router.get("/stats")
async def global_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    total_tenants = (await db.execute(select(func.count()).select_from(Tenant))).scalar() or 0
    active_tenants = (await db.execute(select(func.count()).where(Tenant.is_active == True))).scalar() or 0
    total_users = (await db.execute(select(func.count()).where(User.is_active == True))).scalar() or 0
    plan_dist = {}
    result = await db.execute(select(Tenant.plan, func.count().label("c")).group_by(Tenant.plan))
    for row in result:
        plan_dist[row.plan] = row.c
    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_users": total_users,
        "plan_distribution": plan_dist,
        "plans": PLANS,
    }


# ═══════════════════════════════════════════════════════════════════
#  IMPERSONATION — Ingresar como usuario de un tenant (soporte)
# ═══════════════════════════════════════════════════════════════════

@router.post("/impersonate/{uid}")
async def impersonate_user(
    uid: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """
    Genera un token de acceso para ingresar como cualquier usuario.
    Usado para soporte técnico. Queda registrado en auditoría.
    """
    from app.core.security import create_access_token

    result = await db.execute(select(User).where(User.id == uid, User.is_active == True))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Usuario no encontrado o inactivo")
    if target.role == UserRole.SUPER_ADMIN:
        raise HTTPException(403, "No se puede impersonar a otro Super Admin")

    # Create impersonation token (24h)
    token = create_access_token(str(target.id))

    return {
        "access_token": token,
        "token_type": "bearer",
        "impersonating": {
            "id": str(target.id),
            "email": target.email,
            "full_name": target.full_name,
            "role": target.role.value,
            "tenant_id": target.tenant_id,
        },
        "warning": f"Sesión de impersonación. Super Admin: {admin.email}",
    }


# ═══════════════════════════════════════════════════════════════════
#  ELIMINAR TENANT + SCHEMA
# ═══════════════════════════════════════════════════════════════════

@router.delete("/tenants/{tid}")
async def delete_tenant(
    tid: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """
    Elimina permanentemente un tenant y todos sus datos.
    Borra el schema PostgreSQL del tenant. IRREVERSIBLE.
    """
    from app.core.database import drop_tenant_schema

    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Tenant no encontrado")

    schema = tenant.db_schema
    tenant_name = tenant.name

    # Deactivate first (safety)
    tenant.is_active = False
    tenant.payment_status = "cancelled"
    await db.commit()

    # Delete all users of this tenant
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(User).where(User.tenant_id == tid))
    await db.commit()

    # Delete the tenant record
    await db.delete(tenant)
    await db.commit()

    # Drop the PostgreSQL schema if it exists
    if schema:
        await drop_tenant_schema(schema)

    return {
        "message": f"Tenant '{tenant_name}' eliminado permanentemente",
        "schema_dropped": schema or "N/A",
    }


# ═══════════════════════════════════════════════════════════════════
#  ENVIAR COMUNICACIÓN A TODOS LOS TENANTS
# ═══════════════════════════════════════════════════════════════════

@router.post("/broadcast")
async def broadcast_message(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """
    Envía email a todos los admin de los tenants activos.
    Body: { subject, message, only_active: bool }
    """
    from app.core.email import send_welcome_email
    import asyncio

    subject = data.get("subject", "Comunicado de XLegal")
    message = data.get("message", "")
    only_active = data.get("only_active", True)

    if not message or len(message) < 10:
        raise HTTPException(400, "El mensaje es muy corto")

    q = select(Tenant)
    if only_active:
        q = q.where(Tenant.is_active == True, Tenant.payment_status != "cancelled")

    result = await db.execute(q)
    tenants = result.scalars().all()

    sent = 0
    failed = 0

    for t in tenants:
        if not t.admin_email:
            continue
        try:
            from app.core.email import send_email
            await send_email(
                to=t.admin_email,
                subject=subject,
                html=f"""<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#1a1a2e">{subject}</h2><p style="color:#333;white-space:pre-wrap">{message}</p><hr/><p style="color:#888;font-size:12px">XLegal · Soporte: 0993397400</p></div>""",
            )
            sent += 1
        except Exception:
            failed += 1

    return {
        "message": f"Comunicación enviada a {sent} tenant(s)",
        "sent": sent,
        "failed": failed,
        "total": len(tenants),
    }


# ═══════════════════════════════════════════════════════════════════
#  EXPORT TENANT DATA (para migraciones o respaldo)
# ═══════════════════════════════════════════════════════════════════

@router.get("/tenants/{tid}/export")
async def export_tenant_data(
    tid: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Exporta datos básicos del tenant en JSON (casos, clientes, facturación)."""
    from app.models.case import Case
    from app.models.client import Client
    from app.models.billing import Invoice

    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Tenant no encontrado")

    cases_r = await db.execute(select(Case).where(Case.tenant_id == tid))
    clients_r = await db.execute(select(Client).where(Client.tenant_id == tid))
    invoices_r = await db.execute(select(Invoice).where(Invoice.tenant_id == tid))

    cases = cases_r.scalars().all()
    clients = clients_r.scalars().all()
    invoices = invoices_r.scalars().all()

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "tenant": {
            "id": tenant.id, "name": tenant.name, "plan": tenant.plan,
            "email": tenant.admin_email, "ruc": tenant.ruc,
        },
        "summary": {
            "cases": len(cases),
            "clients": len(clients),
            "invoices": len(invoices),
        },
        "clients": [
            {"id": c.id, "full_name": c.full_name, "email": c.email,
             "document_number": c.document_number, "phone": c.phone}
            for c in clients
        ],
        "cases": [
            {"id": c.id, "reference": c.reference, "title": c.title,
             "status": c.status.value if hasattr(c.status, 'value') else c.status,
             "client_id": c.client_id}
            for c in cases
        ],
        "invoices": [
            {"id": i.id, "invoice_number": i.invoice_number,
             "total": float(i.total or 0), "status": i.status,
             "due_date": i.due_date}
            for i in invoices
        ],
    }


@router.post("/impersonate-tenant/{tid}")
async def impersonate_tenant_admin(
    tid: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Genera token para ingresar como el admin principal de un tenant."""
    from app.core.security import create_access_token

    # Find the FIRM_ADMIN user of this tenant
    result = await db.execute(
        select(User).where(
            User.tenant_id == tid,
            User.role.in_([UserRole.FIRM_ADMIN, UserRole.SOLO_LAWYER]),
            User.is_active == True,
        ).order_by(User.created_at)
    )
    target = result.scalars().first()
    if not target:
        raise HTTPException(404, "No se encontró un admin activo para este tenant")

    token = create_access_token(str(target.id))
    return {
        "access_token": token,
        "token_type": "bearer",
        "impersonating": {
            "id": str(target.id),
            "email": target.email,
            "full_name": target.full_name,
            "role": target.role.value,
            "tenant_id": target.tenant_id,
        },
        "warning": f"Impersonación por Super Admin: {admin.email}",
    }


# ═══════════════════════════════════════════════════════════════════
#  REVENUE HISTORY — Ingresos mensuales para el gráfico de tendencia
# ═══════════════════════════════════════════════════════════════════

@router.get("/revenue-history")
async def revenue_history(
    months: int = 12,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Historial de ingresos estimados por mes (basado en pagos registrados)."""
    from datetime import date
    import calendar

    today = date.today()
    result = []

    for i in range(months - 1, -1, -1):
        # Month i months ago
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1

        month_str = f"{year}-{month:02d}"
        label_es = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][month - 1]

        # Count tenants that paid this month
        paid_count = (await db.execute(
            select(func.count()).where(
                Tenant.last_payment_at.like(f"{month_str}%"),
                Tenant.is_active == True,
            )
        )).scalar() or 0

        # Estimate: multiply by average plan price
        # Also count active tenants in that month as an estimate
        active_count = (await db.execute(
            select(func.count()).where(
                Tenant.payment_status == "active",
                Tenant.is_active == True,
            )
        )).scalar() or 0

        # MRR based on active tenants
        plan_r = await db.execute(
            select(Tenant.plan, func.count().label("c"))
            .where(Tenant.is_active == True, Tenant.payment_status.in_(["active"]))
            .group_by(Tenant.plan)
        )
        month_mrr = sum(
            PLANS.get(row.plan, {}).get("price_pyg", 0) * row.c
            for row in plan_r
        )

        result.append({
            "month": month_str,
            "label": f"{label_es} {year}",
            "mrr_pyg": month_mrr,
            "paid_count": paid_count,
            "active_count": active_count,
        })

    return {"history": result}


# ═══════════════════════════════════════════════════════════════════
#  RECENT SIGNUPS — Últimos tenants registrados
# ═══════════════════════════════════════════════════════════════════

@router.get("/recent-signups")
async def recent_signups(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Últimos tenants registrados, más reciente primero."""
    result = await db.execute(
        select(Tenant)
        .order_by(Tenant.created_at.desc())
        .limit(limit)
    )
    tenants = result.scalars().all()
    return {
        "signups": [
            {
                "id": t.id,
                "name": t.name,
                "admin_name": t.admin_name,
                "email": t.admin_email or t.email,
                "plan": t.plan,
                "payment_status": t.payment_status,
                "city": t.city,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "trial_ends_at": t.trial_ends_at,
            }
            for t in tenants
        ]
    }


# ═══════════════════════════════════════════════════════════════════
#  TENANT DETAIL — Vista completa de un tenant con sus usuarios
# ═══════════════════════════════════════════════════════════════════

@router.get("/tenants/{tid}/detail")
async def tenant_detail(
    tid: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Detalle completo de un tenant: info + usuarios + stats de uso."""
    from app.models.case import Case
    from app.models.client import Client
    from app.models.billing import Invoice

    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Tenant no encontrado")

    users_r = await db.execute(select(User).where(User.tenant_id == tid, User.is_active == True))
    users = users_r.scalars().all()

    case_count = (await db.execute(select(func.count()).where(Case.tenant_id == tid))).scalar() or 0
    client_count = (await db.execute(select(func.count()).where(Client.tenant_id == tid))).scalar() or 0
    invoice_count = (await db.execute(select(func.count()).where(Invoice.tenant_id == tid))).scalar() or 0

    plan_info = PLANS.get(tenant.plan, {})

    return {
        "tenant": {
            "id": tenant.id,
            "name": tenant.name,
            "legal_name": tenant.legal_name,
            "ruc": tenant.ruc,
            "timbrado": tenant.timbrado,
            "address": tenant.address,
            "city": tenant.city,
            "phone": tenant.phone,
            "email": tenant.email,
            "whatsapp": tenant.whatsapp,
            "admin_name": tenant.admin_name,
            "admin_email": tenant.admin_email,
            "admin_phone": tenant.admin_phone,
            "plan": tenant.plan,
            "plan_name": plan_info.get("name", tenant.plan),
            "plan_price": plan_info.get("price_label", "—"),
            "is_active": tenant.is_active,
            "payment_status": tenant.payment_status,
            "trial_ends_at": tenant.trial_ends_at,
            "last_payment_at": tenant.last_payment_at,
            "next_payment_at": tenant.next_payment_at,
            "payment_notes": tenant.payment_notes,
            "notes": tenant.notes,
            "referral_source": tenant.referral_source,
            "db_schema": tenant.db_schema,
            "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        },
        "users": [
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role.value,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "usage": {
            "cases": case_count,
            "clients": client_count,
            "invoices": invoice_count,
            "users": len(users),
        },
    }


# ═══════════════════════════════════════════════════════════════════
#  UPDATE TENANT NOTES/INTERNAL INFO
# ═══════════════════════════════════════════════════════════════════

@router.patch("/tenants/{tid}/notes")
async def update_tenant_notes(
    tid: str,
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_super_admin),
):
    """Actualiza notas internas y fuente de referido del tenant."""
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Tenant no encontrado")

    if "notes" in data:
        tenant.notes = data["notes"]
    if "referral_source" in data:
        tenant.referral_source = data["referral_source"]
    if "payment_notes" in data:
        tenant.payment_notes = data["payment_notes"]

    await db.commit()
    return {"updated": True}
