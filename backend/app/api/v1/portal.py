"""
XLegal — Portal del Cliente
Permite que los clientes vean sus casos, facturas, documentos y firmen electrónicamente.
Acceso con credenciales especiales de CLIENT_PORTAL (generadas por el abogado).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole

router = APIRouter(prefix="/portal", tags=["portal-cliente"])


async def require_portal_user(current_user: User = Depends(get_current_user)) -> User:
    """Solo usuarios con rol CLIENT_PORTAL o superior pueden acceder al portal."""
    allowed = (UserRole.CLIENT_PORTAL, UserRole.LAWYER, UserRole.FIRM_ADMIN,
               UserRole.SOLO_LAWYER, UserRole.SUPER_ADMIN)
    if current_user.role not in allowed:
        raise HTTPException(403, "Acceso solo para clientes con portal habilitado")
    return current_user


@router.get("/me")
async def portal_me(
    current_user: User = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    """Datos del cliente autenticado en el portal."""
    from app.models.client import Client
    # Find linked client record
    result = await db.execute(
        select(Client).where(
            Client.tenant_id == current_user.tenant_id,
            Client.email == current_user.email,
        )
    )
    client = result.scalar_one_or_none()
    return {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "client_id": str(client.id) if client else None,
        "phone": current_user.phone,
    }


@router.get("/cases")
async def portal_cases(
    current_user: User = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    """Casos del cliente (vista limitada — sin información confidencial)."""
    from app.models.case import Case
    from app.models.client import Client

    result = await db.execute(
        select(Client).where(
            Client.tenant_id == current_user.tenant_id,
            Client.email == current_user.email,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        return {"items": [], "total": 0}

    cases_result = await db.execute(
        select(Case).where(
            Case.tenant_id == current_user.tenant_id,
            Case.client_id == str(client.id),
        )
    )
    cases = cases_result.scalars().all()
    return {
        "items": [
            {
                "id": str(c.id),
                "title": c.title,
                "case_number": c.court_file_number or c.reference,
                "status": c.status.value if hasattr(c.status, 'value') else c.status,
                "case_type": c.matter,
                "opened_date": c.opened_at,
            }
            for c in cases
        ],
        "total": len(cases),
    }


@router.get("/invoices")
async def portal_invoices(
    current_user: User = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    """Facturas del cliente — saldo pendiente."""
    from app.models.billing import Invoice
    from app.models.client import Client

    result = await db.execute(
        select(Client).where(
            Client.tenant_id == current_user.tenant_id,
            Client.email == current_user.email,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        return {"items": [], "total": 0, "total_pending": 0}

    inv_result = await db.execute(
        select(Invoice).where(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.client_id == str(client.id),
        )
    )
    invoices = inv_result.scalars().all()
    pending = sum(float(i.total or 0) for i in invoices if i.status in ("pending", "overdue"))
    return {
        "items": [
            {
                "id": str(i.id),
                "invoice_number": i.invoice_number,
                "issue_date": i.issue_date,
                "due_date": i.due_date,
                "total": float(i.total or 0),
                "status": i.status,
                "currency": i.currency,
            }
            for i in invoices
        ],
        "total": len(invoices),
        "total_pending": pending,
    }


@router.get("/documents")
async def portal_documents(
    current_user: User = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    """Documentos compartidos con el cliente."""
    from app.models.document import Document

    result = await db.execute(
        select(Document).where(
            Document.tenant_id == current_user.tenant_id,
            Document.shared_with_client == True,
        )
    )
    docs = result.scalars().all()
    return {
        "items": [
            {
                "id": str(d.id),
                "name": d.name,
                "document_type": d.document_type,
                "created_at": str(d.created_at),
                "file_url": d.file_url,
            }
            for d in docs
        ],
        "total": len(docs),
    }


@router.get("/hearings")
async def portal_hearings(
    current_user: User = Depends(require_portal_user),
    db: AsyncSession = Depends(get_db),
):
    """Audiencias del cliente (fecha, hora, juzgado)."""
    from app.models.hearing import Hearing
    from app.models.client import Client
    from app.models.case import Case

    result = await db.execute(
        select(Client).where(
            Client.tenant_id == current_user.tenant_id,
            Client.email == current_user.email,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        return {"items": [], "total": 0}

    # Get client cases first
    cases_result = await db.execute(
        select(Case.id).where(
            Case.tenant_id == current_user.tenant_id,
            Case.client_id == str(client.id),
        )
    )
    case_ids = [str(r[0]) for r in cases_result.all()]
    if not case_ids:
        return {"items": [], "total": 0}

    from sqlalchemy import and_
    h_result = await db.execute(
        select(Hearing).where(
            and_(
                Hearing.tenant_id == current_user.tenant_id,
                Hearing.case_id.in_(case_ids),
            )
        )
    )
    hearings = h_result.scalars().all()
    return {
        "items": [
            {
                "id": str(h.id),
                "title": h.title,
                "hearing_date": h.hearing_date,
                "hearing_time": h.hearing_time,
                "location": h.location,
                "status": h.status,
                "case_id": h.case_id,
            }
            for h in hearings
        ],
        "total": len(hearings),
    }


# ─── Portal User Management (para abogados que crean accesos de clientes) ────

@router.post("/invite/{client_id}")
async def invite_client_to_portal(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Crea o reactiva acceso al portal para un cliente.
    Solo FIRM_ADMIN, SOLO_LAWYER o LAWYER pueden invitar.
    """
    import uuid, secrets
    from app.models.client import Client
    from app.core.security import hash_password
    from app.core.config import settings

    allowed = (UserRole.FIRM_ADMIN, UserRole.SOLO_LAWYER, UserRole.LAWYER, UserRole.SUPER_ADMIN)
    if current_user.role not in allowed:
        raise HTTPException(403, "Sin permisos para invitar clientes al portal")

    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.tenant_id == current_user.tenant_id,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    if not client.email:
        raise HTTPException(400, "El cliente no tiene email registrado")

    # Check if portal user already exists
    existing = await db.execute(
        select(User).where(User.email == client.email, User.tenant_id == current_user.tenant_id)
    )
    portal_user = existing.scalar_one_or_none()

    temp_password = secrets.token_urlsafe(10)  # Temporal — cliente cambia en primer login

    if portal_user:
        # Reactivate and reset password
        portal_user.is_active = True
        portal_user.role = UserRole.CLIENT_PORTAL
        portal_user.hashed_password = hash_password(temp_password)
    else:
        portal_user = User(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            email=client.email,
            hashed_password=hash_password(temp_password),
            full_name=client.full_name or "Cliente",
            role=UserRole.CLIENT_PORTAL,
            phone=client.phone,
            is_active=True,
        )
        db.add(portal_user)

    await db.commit()

    # Send welcome email with credentials
    try:
        from app.core.email import send_welcome_email
        await send_welcome_email(
            to=client.email,
            name=portal_user.full_name,
            firm=f"Estudio Jurídico",
            trial_ends="",
            plan="Portal del Cliente",
        )
    except Exception:
        pass  # Non-blocking

    return {
        "message": f"Acceso al portal enviado a {client.email}",
        "email": client.email,
        "temp_password": temp_password,  # Lawyer shows this to client
        "portal_url": f"{settings.APP_URL}/portal",
    }
