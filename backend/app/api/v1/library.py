from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.library import LegalNorm

router = APIRouter(prefix="/library", tags=["library"])

AREAS = ["laboral", "civil", "penal", "comercial", "tributario", "familia", "administrativo", "constitucional"]

@router.get("")
async def list_norms(
    search: str = Query(None),
    area: str = Query(None),
    category: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(LegalNorm).where(LegalNorm.is_active == True)
    if search:
        q = q.where(or_(
            LegalNorm.title.ilike(f"%{search}%"),
            LegalNorm.code.ilike(f"%{search}%"),
            LegalNorm.summary.ilike(f"%{search}%"),
        ))
    if area:
        q = q.where(LegalNorm.area == area)
    if category:
        q = q.where(LegalNorm.category == category)
    
    from sqlalchemy import func, select as sel
    total_q = sel(func.count()).select_from(q.subquery())
    from sqlalchemy.ext.asyncio import AsyncSession
    total = (await db.execute(total_q)).scalar() or 0
    
    q = q.order_by(LegalNorm.area, LegalNorm.code).offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    items = result.scalars().all()
    
    return {
        "items": [{
            "id": n.id, "code": n.code, "title": n.title,
            "summary": n.summary, "area": n.area, "category": n.category,
            "official_url": n.official_url,
        } for n in items],
        "total": total,
        "areas": AREAS,
    }


@router.get("/{norm_id}")
async def get_norm(norm_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(LegalNorm).where(LegalNorm.id == norm_id))
    norm = result.scalar_one_or_none()
    if not norm:
        from fastapi import HTTPException
        raise HTTPException(404, "Norma no encontrada")
    return {
        "id": norm.id, "code": norm.code, "title": norm.title,
        "summary": norm.summary, "full_text": norm.full_text,
        "area": norm.area, "category": norm.category,
        "official_url": norm.official_url,
    }
