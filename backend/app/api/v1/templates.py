from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.template import WritingTemplate
import uuid

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateCreate(BaseModel):
    title: str
    category: str = "general"
    area: str = "civil"
    content: str
    description: Optional[str] = None


class TemplateUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    area: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None


@router.get("")
async def list_templates(
    search: Optional[str] = None,
    category: Optional[str] = None,
    area: Optional[str] = None,
    include_public: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get own templates + public templates
    if include_public:
        q = select(WritingTemplate).where(
            WritingTemplate.is_active == True,
            or_(
                WritingTemplate.tenant_id == current_user.tenant_id,
                WritingTemplate.is_public == True,
            )
        )
    else:
        q = select(WritingTemplate).where(
            WritingTemplate.tenant_id == current_user.tenant_id,
            WritingTemplate.is_active == True,
        )
    
    if search:
        q = q.where(or_(
            WritingTemplate.title.ilike(f"%{search}%"),
            WritingTemplate.description.ilike(f"%{search}%"),
        ))
    if category:
        q = q.where(WritingTemplate.category == category)
    if area:
        q = q.where(WritingTemplate.area == area)

    q = q.order_by(WritingTemplate.use_count.desc(), WritingTemplate.title)
    result = await db.execute(q)
    items = result.scalars().all()
    
    return {
        "items": [{
            "id": t.id, "title": t.title, "category": t.category,
            "area": t.area, "description": t.description,
            "is_public": t.is_public, "use_count": t.use_count,
            "is_own": t.tenant_id == current_user.tenant_id,
        } for t in items]
    }


@router.get("/{template_id}")
async def get_template(template_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(WritingTemplate).where(
            WritingTemplate.id == template_id,
            or_(
                WritingTemplate.tenant_id == current_user.tenant_id,
                WritingTemplate.is_public == True,
            )
        )
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Modelo no encontrado")
    # Increment use count
    t.use_count = (t.use_count or 0) + 1
    await db.commit()
    return {
        "id": t.id, "title": t.title, "category": t.category, "area": t.area,
        "content": t.content, "description": t.description, "use_count": t.use_count,
    }


@router.post("", status_code=201)
async def create_template(data: TemplateCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = WritingTemplate(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        **data.model_dump()
    )
    db.add(t)
    await db.commit()
    return {"id": t.id, "message": "Modelo creado"}


@router.put("/{template_id}")
async def update_template(template_id: str, data: TemplateUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(WritingTemplate).where(WritingTemplate.id == template_id, WritingTemplate.tenant_id == current_user.tenant_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Modelo no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    await db.commit()
    return {"message": "Actualizado"}


@router.delete("/{template_id}")
async def delete_template(template_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(WritingTemplate).where(WritingTemplate.id == template_id, WritingTemplate.tenant_id == current_user.tenant_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Modelo no encontrado")
    t.is_active = False
    await db.commit()
    return {"message": "Eliminado"}
