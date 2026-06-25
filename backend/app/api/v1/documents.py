"""
XLegal — Gestión de Documentos
Carga de archivos adjuntos a expedientes y clientes.
Almacenamiento local en /app/media (montar volumen en producción).
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.document import Document
import uuid, os, shutil, mimetypes
from typing import Optional

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = os.environ.get("STORAGE_LOCAL_PATH", "/app/media")
MAX_FILE_MB = 25
ALLOWED_MIMES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "text/plain", "text/csv",
    "application/zip", "application/x-zip-compressed",
}

CATEGORIES = ["general", "contrato", "poder", "sentencia", "resolucion",
              "escrito", "prueba", "pericia", "notificacion", "otro"]


def _tenant_upload_dir(tenant_id: str) -> str:
    path = os.path.join(UPLOAD_DIR, "tenants", tenant_id)
    os.makedirs(path, exist_ok=True)
    return path


@router.get("")
async def list_documents(
    case_id: Optional[str] = None,
    client_id: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista documentos del tenant con filtros opcionales."""
    q = select(Document).where(Document.tenant_id == current_user.tenant_id)
    if case_id:
        q = q.where(Document.case_id == case_id)
    if client_id:
        q = q.where(Document.client_id == client_id)
    if category:
        q = q.where(Document.category == category)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    q = q.order_by(Document.created_at.desc()).offset((page - 1) * limit).limit(limit)
    docs = (await db.execute(q)).scalars().all()

    return {
        "items": [_doc_to_dict(d) for d in docs],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }


@router.post("")
async def upload_document(
    file: UploadFile = File(...),
    case_id: Optional[str] = Form(None),
    client_id: Optional[str] = Form(None),
    category: str = Form("general"),
    name: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Carga un archivo y lo asocia a un expediente o cliente."""
    # Validate size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_MB:
        raise HTTPException(400, f"Archivo demasiado grande. Máximo {MAX_FILE_MB} MB.")

    # Validate MIME
    mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
    if mime not in ALLOWED_MIMES:
        raise HTTPException(400, f"Tipo de archivo no permitido: {mime}")

    if category not in CATEGORIES:
        category = "general"

    # Build unique file path
    doc_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1].lower() or ".bin"
    safe_filename = f"{doc_id}{ext}"
    tenant_dir = _tenant_upload_dir(current_user.tenant_id)
    file_path = os.path.join(tenant_dir, safe_filename)

    # Write to disk
    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        id=doc_id,
        tenant_id=current_user.tenant_id,
        case_id=case_id,
        client_id=client_id,
        uploaded_by=current_user.id,
        name=name or file.filename or safe_filename,
        original_name=file.filename or safe_filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=mime,
        category=category,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return {"message": "Documento cargado correctamente", **_doc_to_dict(doc)}


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Descarga un documento por su ID."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.tenant_id == current_user.tenant_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    if not os.path.exists(doc.file_path):
        raise HTTPException(410, "Archivo no disponible en el servidor")

    return FileResponse(
        path=doc.file_path,
        filename=doc.original_name,
        media_type=doc.mime_type or "application/octet-stream",
    )


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina un documento (archivo + registro)."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.tenant_id == current_user.tenant_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")

    # Only uploader, firm admin or super admin can delete
    allowed_roles = ("firm_admin", "super_admin", "solo_lawyer")
    if str(doc.uploaded_by) != str(current_user.id) and current_user.role.value not in allowed_roles:
        raise HTTPException(403, "Sin permisos para eliminar este documento")

    # Remove file from disk
    try:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception:
        pass  # File might already be gone

    await db.delete(doc)
    await db.commit()
    return {"message": "Documento eliminado"}


def _doc_to_dict(d: Document) -> dict:
    size_kb = round((d.file_size or 0) / 1024, 1)
    return {
        "id": d.id,
        "name": d.name,
        "original_name": d.original_name,
        "category": d.category,
        "mime_type": d.mime_type,
        "file_size": d.file_size,
        "size_label": f"{size_kb} KB" if size_kb < 1000 else f"{round(size_kb/1024, 1)} MB",
        "case_id": d.case_id,
        "client_id": d.client_id,
        "uploaded_by": d.uploaded_by,
        "is_public": d.is_public,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "download_url": f"/api/v1/documents/{d.id}/download",
    }


@router.patch("/{doc_id}")
async def update_document(
    doc_id: str,
    data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Actualiza metadatos del documento (ej: shared_with_client)."""
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.tenant_id == current_user.tenant_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")

    allowed_fields = {"shared_with_client", "document_type", "description", "category"}
    for field, value in data.items():
        if field in allowed_fields:
            setattr(doc, field, value)

    await db.commit()
    return {"id": doc_id, "updated": True}
