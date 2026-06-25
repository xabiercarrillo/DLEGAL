from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User, UserRole

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
        "user": {
            "id": str(user.id), "email": user.email, "full_name": user.full_name,
            "role": user.role.value, "tenant_id": user.tenant_id or "",
            "avatar_url": user.avatar_url,
            "phone": user.phone,
            "bar_number": user.bar_number,
            "specialties": user.specialties,
            "openai_api_key": user.openai_api_key,
        },
    }

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh")
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user_id = decode_token(data.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return {"access_token": create_access_token(str(user.id)), "token_type": "bearer"}

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.deps import get_current_user

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id), "email": current_user.email,
        "full_name": current_user.full_name, "role": current_user.role.value,
        "tenant_id": current_user.tenant_id or "",
        "phone": current_user.phone, "bar_number": current_user.bar_number,
        "avatar_url": current_user.avatar_url,
    }


# ── Password Reset ──────────────────────────────────────────────────────────
import secrets, hashlib, json
from datetime import datetime, timezone, timedelta

def _get_redis():
    """Redis client for token storage (survives restarts)."""
    import redis as redis_lib
    from app.core.config import settings
    try:
        url = getattr(settings, 'REDIS_URL', 'redis://redis:6379/0')
        return redis_lib.from_url(url, decode_responses=True)
    except Exception:
        return None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Solicita recuperación de contraseña.
    Siempre retorna 200 para no revelar si el email existe.
    """
    result = await db.execute(select(User).where(User.email == data.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if user:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        token_data = {"user_id": str(user.id), "email": user.email}
        r = _get_redis()
        if r:
            r.setex(f"pwd_reset:{token_hash}", 3600, json.dumps(token_data))  # 1h TTL
        # Build reset URL (frontend handles the form)
        reset_url = f"https://app.xlegal.com.py/reset-password?token={raw_token}"

        from app.core.email import send_password_reset_email
        await send_password_reset_email(user.email, user.full_name, reset_url)

    return {"message": "Si el email existe, recibirás un enlace para restablecer tu contraseña."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Restablece la contraseña con el token recibido por email."""
    from app.core.security import hash_password
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    r = _get_redis()
    raw = r.get(f"pwd_reset:{token_hash}") if r else None
    if not raw:
        raise HTTPException(400, "Token inválido, expirado o ya utilizado")
    token_data = json.loads(raw)

    if len(data.new_password) < 8:
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres")

    result = await db.execute(select(User).where(User.id == token_data["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(400, "Usuario no encontrado")

    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    if r: r.delete(f"pwd_reset:{token_hash}")  # Invalidate token

    return {"message": "Contraseña restablecida correctamente. Ya podés ingresar."}
