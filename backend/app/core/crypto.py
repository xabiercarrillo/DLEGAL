"""
XLegal — Cifrado de secretos (credenciales de integraciones de terceros).

Usa Fernet (cryptography) con una clave derivada de SECRET_KEY:
    key = base64.urlsafe_b64encode(sha256(SECRET_KEY).digest())

Funciones:
    encrypt_secret(plain) -> token cifrado (str)
    decrypt_secret(token) -> texto plano (str)

Diseño defensivo: si el descifrado falla (p. ej. un valor legado guardado en
texto plano antes de activar el cifrado), `decrypt_secret` devuelve el valor
original sin romper el flujo.
"""
import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger("xlegal.crypto")

# Prefijo que marca un valor como cifrado por este módulo.
_PREFIX = "enc::"


def _build_fernet() -> Fernet:
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


_fernet = _build_fernet()


def encrypt_secret(plain: str) -> str:
    """Cifra un texto plano y lo devuelve como token marcado con prefijo."""
    if plain is None:
        return plain
    if not isinstance(plain, str) or plain == "":
        return plain
    if plain.startswith(_PREFIX):
        # Ya está cifrado, no volver a cifrar.
        return plain
    token = _fernet.encrypt(plain.encode())
    return _PREFIX + token.decode()


def decrypt_secret(token: str) -> str:
    """Descifra un token. Si no está cifrado o falla, devuelve el valor original."""
    if token is None:
        return token
    if not isinstance(token, str) or not token.startswith(_PREFIX):
        # Valor legado en texto plano o no-string: devolver tal cual.
        return token
    raw = token[len(_PREFIX):]
    try:
        return _fernet.decrypt(raw.encode()).decode()
    except (InvalidToken, ValueError) as e:
        logger.warning("No se pudo descifrar un secreto: %s", e)
        return token


def is_encrypted(value: str) -> bool:
    """Indica si un valor ya está cifrado por este módulo."""
    return isinstance(value, str) and value.startswith(_PREFIX)


def decrypt_config(config: dict) -> dict:
    """
    Descifra un dict de config completo. Los valores cifrados (prefijo) se
    descifran; los valores planos legados pasan sin cambios. Seguro para usar
    en cualquier consumidor de credenciales de integraciones.
    """
    if not config:
        return config or {}
    return {k: (decrypt_secret(v) if isinstance(v, str) else v) for k, v in config.items()}
