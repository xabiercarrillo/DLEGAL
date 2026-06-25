"""
XLegal — Audit Log API
Solo FIRM_ADMIN y SUPER_ADMIN pueden ver el historial de auditoría.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import require_firm_admin
from app.models.user import User
from app.models.audit import AuditLog
from typing import Optional

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def list_audit_logs(
    resource: Optional[str] = None,
    action: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_firm_admin),
):
    """Lista el historial de auditoría del estudio."""
    q = select(AuditLog).where(AuditLog.tenant_id == current_user.tenant_id)
    if resource:
        q = q.where(AuditLog.resource == resource)
    if action:
        q = q.where(AuditLog.action == action)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    q = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    logs = (await db.execute(q)).scalars().all()

    return {
        "items": [{
            "id": l.id, "action": l.action, "resource": l.resource,
            "resource_id": l.resource_id, "user_email": l.user_email,
            "detail": l.detail, "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        } for l in logs],
        "total": total,
        "page": page,
    }


async def log_action(db: AsyncSession, tenant_id: str, user: User, action: str,
                     resource: str, resource_id: str = None, detail: str = None,
                     ip: str = None):
    """Helper para registrar una acción en el audit log."""
    entry = AuditLog(
        tenant_id=tenant_id,
        user_id=str(user.id) if user else None,
        user_email=user.email if user else None,
        action=action,
        resource=resource,
        resource_id=resource_id,
        detail=detail,
        ip_address=ip,
    )
    db.add(entry)
    # Note: caller must commit
