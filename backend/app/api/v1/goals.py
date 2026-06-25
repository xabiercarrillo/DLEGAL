from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.goal import Goal, GoalType
import uuid

router = APIRouter(prefix="/goals", tags=["goals"])


class GoalCreate(BaseModel):
    title: str
    type: str = "ingresos"
    target_value: float
    unit: str = "₲"
    start_date: str
    end_date: str


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    end_date: Optional[str] = None
    is_completed: Optional[bool] = None


def goal_to_dict(g: Goal) -> dict:
    return {
        "id": g.id,
        "type": g.type.value if hasattr(g.type, "value") else g.type,
        "title": g.title,
        "target_value": g.target_value,
        "current_value": g.current_value,
        "unit": g.unit,
        "start_date": g.start_date,
        "end_date": g.end_date,
        "is_active": g.is_active,
        "is_completed": g.is_completed,
        "progress_pct": g.progress_pct,
    }


@router.get("")
async def list_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.tenant_id == current_user.tenant_id, Goal.is_active == True)
        .order_by(Goal.end_date)
    )
    goals = result.scalars().all()
    return {"items": [goal_to_dict(g) for g in goals]}


@router.post("", status_code=201)
async def create_goal(
    data: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    g = Goal(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        **data.model_dump(),
    )
    db.add(g)
    await db.commit()
    return {"id": g.id, "message": "Meta creada"}


@router.put("/{goal_id}")
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.tenant_id == current_user.tenant_id)
    )
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(404, "Meta no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(g, k, v)
    await db.commit()
    return {**goal_to_dict(g), "message": "Meta actualizada"}


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.tenant_id == current_user.tenant_id)
    )
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(404, "Meta no encontrada")
    g.is_active = False  # soft delete
    await db.commit()
    return {"message": "Meta eliminada"}
