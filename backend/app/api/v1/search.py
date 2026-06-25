from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.case import Case
from app.models.client import Client
from app.models.hearing import Hearing
from app.models.deadline import Deadline
from app.models.task import Task
from app.models.contact import ProfessionalContact

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def global_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Global search across cases, clients, deadlines, tasks, contacts."""
    tid = current_user.tenant_id
    term = f"%{q}%"
    results = []

    # Cases
    c_res = await db.execute(
        select(Case).where(
            Case.tenant_id == tid,
            Case.is_archived == False,
            or_(
                Case.title.ilike(term),
                Case.reference.ilike(term),
                Case.opposing_party.ilike(term),
                Case.court_file_number.ilike(term),
            ),
        ).limit(limit)
    )
    for c in c_res.scalars().all():
        results.append({
            "type": "case", "id": c.id,
            "title": c.title,
            "subtitle": f"{c.reference} · {c.matter}",
            "url": "/cases",
            "status": c.status.value if hasattr(c.status, "value") else c.status,
        })

    # Clients
    cl_res = await db.execute(
        select(Client).where(
            Client.tenant_id == tid,
            Client.is_active == True,
            or_(
                Client.full_name.ilike(term),
                Client.email.ilike(term),
                Client.ruc.ilike(term),
                Client.document_number.ilike(term),
            ),
        ).limit(limit)
    )
    for cl in cl_res.scalars().all():
        results.append({
            "type": "client", "id": cl.id,
            "title": cl.full_name,
            "subtitle": f"{cl.document_number or '—'} · {cl.city or 'Paraguay'}",
            "url": "/clients",
            "status": None,
        })

    # Deadlines (pending only)
    d_res = await db.execute(
        select(Deadline).where(
            Deadline.tenant_id == tid,
            Deadline.title.ilike(term),
            Deadline.is_completed == False,
        ).limit(limit)
    )
    for d in d_res.scalars().all():
        results.append({
            "type": "deadline", "id": d.id,
            "title": d.title,
            "subtitle": f"Vence: {d.due_date}",
            "url": "/deadlines",
            "status": d.priority,
        })

    # Tasks
    t_res = await db.execute(
        select(Task).where(
            Task.tenant_id == tid,
            Task.title.ilike(term),
        ).limit(limit)
    )
    for t in t_res.scalars().all():
        results.append({
            "type": "task", "id": t.id,
            "title": t.title,
            "subtitle": t.due_date or "",
            "url": "/tasks",
            "status": t.status,
        })

    # Contacts
    co_res = await db.execute(
        select(ProfessionalContact).where(
            ProfessionalContact.tenant_id == tid,
            or_(
                ProfessionalContact.name.ilike(term),
                ProfessionalContact.specialty.ilike(term),
                ProfessionalContact.court.ilike(term),
            ),
        ).limit(limit)
    )
    for co in co_res.scalars().all():
        results.append({
            "type": "contact", "id": co.id,
            "title": co.name,
            "subtitle": co.specialty or co.type or "",
            "url": "/contacts",
            "status": None,
        })

    return {"query": q, "total": len(results), "results": results}
