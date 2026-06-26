from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.task import Task
import uuid

router = APIRouter(prefix="/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    title: str
    case_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: str = "medium"
    status: str = "pendiente"
    due_date: Optional[str] = None
    description: Optional[str] = None
    estimated_hours: Optional[float] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    actual_hours: Optional[float] = None

def _clean_fks(payload: dict, *fields: str) -> dict:
    for f in fields:
        if payload.get(f) == "":
            payload[f] = None
    return payload

def task_to_dict(t: Task) -> dict:
    return {
        "id": t.id, "case_id": t.case_id, "assigned_to": t.assigned_to,
        "title": t.title, "description": t.description, "status": t.status,
        "priority": t.priority, "due_date": t.due_date,
        "estimated_hours": t.estimated_hours, "actual_hours": t.actual_hours,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }

@router.get("")
async def list_tasks(
    status: Optional[str] = None, case_id: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    q = select(Task).where(Task.tenant_id == current_user.tenant_id)
    if status: q = q.where(Task.status == status)
    if case_id: q = q.where(Task.case_id == case_id)
    if priority: q = q.where(Task.priority == priority)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Task.created_at.desc()).offset((page-1)*limit).limit(limit))
    return {"items": [task_to_dict(t) for t in result.scalars().all()], "total": total, "page": page, "pages": max(1,(total+limit-1)//limit)}

@router.post("", status_code=201)
async def create_task(data: TaskCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = Task(id=str(uuid.uuid4()), tenant_id=current_user.tenant_id, created_by=current_user.id, **_clean_fks(data.model_dump(), "case_id", "assigned_to"))
    db.add(t)
    await db.commit()
    return {"id": t.id, "message": "Tarea creada"}

@router.post("/{task_id}/complete")
async def complete_task(task_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.tenant_id == current_user.tenant_id))
    t = result.scalar_one_or_none()
    if not t: raise HTTPException(404, "Tarea no encontrada")
    t.status = "completada"
    await db.commit()
    return {"message": "Completada"}

@router.put("/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.tenant_id == current_user.tenant_id))
    t = result.scalar_one_or_none()
    if not t: raise HTTPException(404, "Tarea no encontrada")
    for k, v in data.model_dump(exclude_none=True).items(): setattr(t, k, v)
    await db.commit()
    return {"message": "Actualizado"}

@router.delete("/{task_id}")
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.tenant_id == current_user.tenant_id))
    t = result.scalar_one_or_none()
    if not t: raise HTTPException(404, "Tarea no encontrada")
    await db.delete(t)
    await db.commit()
    return {"message": "Eliminada"}
