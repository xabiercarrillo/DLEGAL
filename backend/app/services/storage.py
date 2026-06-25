"""
XLegal — Almacenamiento Multi-Provider
Local: desarrollo y servidores pequeños
AWS S3: estándar industria, confiable
Cloudflare R2: S3-compatible, SIN costo de egreso, económico
Google Cloud Storage: alternativa enterprise

Abstracción: la app no sabe dónde se guarda el archivo.
Migrar de provider = cambiar STORAGE_PROVIDER en .env
"""
import os, uuid, mimetypes
import httpx
from app.core.config import settings


class LocalStorage:
    """Almacenamiento en disco local (por defecto)."""

    def __init__(self, base_path: str = None):
        self.base_path = base_path or settings.STORAGE_LOCAL_PATH
        os.makedirs(self.base_path, exist_ok=True)

    async def upload(self, file_bytes: bytes, filename: str, tenant_id: str,
                     content_type: str = None, folder: str = "docs") -> dict:
        path = os.path.join(self.base_path, "tenants", tenant_id, folder)
        os.makedirs(path, exist_ok=True)
        ext = os.path.splitext(filename)[1] or ".bin"
        key = f"{uuid.uuid4().hex}{ext}"
        full_path = os.path.join(path, key)
        with open(full_path, "wb") as f:
            f.write(file_bytes)
        return {"success": True, "key": key, "path": full_path, "provider": "local",
                "url": f"/api/v1/documents/serve/{tenant_id}/{folder}/{key}"}

    async def download(self, path: str) -> bytes | None:
        try:
            with open(path, "rb") as f:
                return f.read()
        except FileNotFoundError:
            return None

    async def delete(self, path: str) -> bool:
        try:
            os.remove(path)
            return True
        except Exception:
            return False

    async def get_url(self, path: str, expires: int = 3600) -> str:
        return f"/api/v1/documents/serve/{path}"


class S3Storage:
    """
    AWS S3 — via HTTP API directa (sin boto3 para no añadir dependencia).
    Para producción, usar boto3: pip install boto3
    """

    async def upload(self, file_bytes: bytes, filename: str, tenant_id: str,
                     content_type: str = None, folder: str = "docs") -> dict:
        try:
            import boto3
            from botocore.exceptions import ClientError

            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            ext = os.path.splitext(filename)[1] or ".bin"
            key = f"tenants/{tenant_id}/{folder}/{uuid.uuid4().hex}{ext}"
            ct = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

            s3.put_object(
                Bucket=settings.AWS_BUCKET_NAME,
                Key=key,
                Body=file_bytes,
                ContentType=ct,
            )
            url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
            return {"success": True, "key": key, "url": url, "provider": "s3"}
        except ImportError:
            return {"success": False, "error": "boto3 no instalado. pip install boto3"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_presigned_url(self, key: str, expires: int = 3600) -> str:
        try:
            import boto3
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            return s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.AWS_BUCKET_NAME, "Key": key},
                ExpiresIn=expires,
            )
        except Exception as e:
            return ""

    async def delete(self, key: str) -> bool:
        try:
            import boto3
            s3 = boto3.client("s3", aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                              aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
            s3.delete_object(Bucket=settings.AWS_BUCKET_NAME, Key=key)
            return True
        except Exception:
            return False


class CloudflareR2Storage:
    """
    Cloudflare R2 — S3-compatible, sin costo de egreso.
    Ideal para Paraguay: latencia baja (CDN Cloudflare).
    """

    @property
    def endpoint(self) -> str:
        return f"https://{settings.CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    async def upload(self, file_bytes: bytes, filename: str, tenant_id: str,
                     content_type: str = None, folder: str = "docs") -> dict:
        try:
            import boto3
            s3 = boto3.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=settings.CF_R2_ACCESS_KEY,
                aws_secret_access_key=settings.CF_R2_SECRET_KEY,
                region_name="auto",
            )
            ext = os.path.splitext(filename)[1] or ".bin"
            key = f"tenants/{tenant_id}/{folder}/{uuid.uuid4().hex}{ext}"
            ct = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
            s3.put_object(Bucket=settings.CF_R2_BUCKET, Key=key, Body=file_bytes, ContentType=ct)
            return {"success": True, "key": key, "provider": "r2",
                    "url": f"{self.endpoint}/{settings.CF_R2_BUCKET}/{key}"}
        except ImportError:
            return {"success": False, "error": "boto3 no instalado"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_presigned_url(self, key: str, expires: int = 3600) -> str:
        try:
            import boto3
            s3 = boto3.client("s3", endpoint_url=self.endpoint,
                              aws_access_key_id=settings.CF_R2_ACCESS_KEY,
                              aws_secret_access_key=settings.CF_R2_SECRET_KEY, region_name="auto")
            return s3.generate_presigned_url("get_object",
                                             Params={"Bucket": settings.CF_R2_BUCKET, "Key": key},
                                             ExpiresIn=expires)
        except Exception:
            return ""


def get_storage():
    """Retorna la instancia de storage según configuración."""
    provider = settings.STORAGE_PROVIDER
    if provider == "s3":
        return S3Storage()
    elif provider == "r2":
        return CloudflareR2Storage()
    else:
        return LocalStorage()
