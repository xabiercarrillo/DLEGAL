import logging
from pydantic_settings import BaseSettings
from typing import List

logger = logging.getLogger("xlegal.config")

# Valores por defecto considerados inseguros en producción.
INSECURE_DEFAULTS = {
    "SECRET_KEY": "dev-secret-key-change-in-production",
    "FIRST_SUPERUSER_PASSWORD": "XLegal",
}


class Settings(BaseSettings):
    APP_NAME: str = "XLegal"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    # DEBUG se lee de la variable de entorno DEBUG; por defecto False (seguro).
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "postgresql+asyncpg://xlegal:xlegal_secret_2024@localhost:5432/xlegal"
    REDIS_URL: str = "redis://localhost:6379/0"
    # CORS_ORIGINS: lista coma-separada por env (ej: "https://app.xlegal.com.py,https://admin.xlegal.com.py").
    # Fallback "*" SOLO si no se define la variable de entorno. Parsear con `cors_origins_list`.
    CORS_ORIGINS: str = "*"

    FIRST_SUPERUSER_EMAIL: str = "xabiercarrillo@gmail.com"
    FIRST_SUPERUSER_PASSWORD: str = "XLegal"

    # ── IA ─────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: str = ""
    COHERE_API_KEY: str = ""

    # ── Email ─────────────────────────────────────────
    RESEND_API_KEY: str = ""
    SENDGRID_API_KEY: str = ""
    MAILGUN_API_KEY: str = ""
    MAILGUN_DOMAIN: str = ""

    # ── WhatsApp / SMS ────────────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"
    TWILIO_SMS_NUMBER: str = ""
    VONAGE_API_KEY: str = ""
    VONAGE_API_SECRET: str = ""

    # ── Pagos ─────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    MERCADOPAGO_ACCESS_TOKEN: str = ""
    MERCADOPAGO_WEBHOOK_SECRET: str = ""
    BANCARD_PRIVATE_KEY: str = ""
    BANCARD_PUBLIC_KEY: str = ""
    BANCARD_WEBHOOK_KEY: str = ""
    BANCARD_BASE_URL: str = "https://vpos.infonet.com.py"  # prod; staging: https://vpos.infonet.com.py:8888
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYU_API_KEY: str = ""
    PAYU_MERCHANT_ID: str = ""

    # ── Firma Electrónica ─────────────────────────────
    PANDADOC_API_KEY: str = ""
    DOCUSIGN_INTEGRATION_KEY: str = ""
    DOCUSIGN_ACCOUNT_ID: str = ""
    DOCUSIGN_USER_ID: str = ""
    DOCUSIGN_PRIVATE_KEY: str = ""
    SIGNNOW_CLIENT_ID: str = ""
    SIGNNOW_CLIENT_SECRET: str = ""

    # ── Almacenamiento ────────────────────────────────
    STORAGE_PROVIDER: str = "local"  # local | s3 | r2 | gcs
    STORAGE_LOCAL_PATH: str = "/app/media"
    MAX_UPLOAD_MB: int = 50
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = "xlegal-docs"
    AWS_REGION: str = "us-east-1"
    CF_R2_ACCOUNT_ID: str = ""
    CF_R2_ACCESS_KEY: str = ""
    CF_R2_SECRET_KEY: str = ""
    CF_R2_BUCKET: str = "xlegal-docs"
    GCS_BUCKET: str = ""
    GCS_CREDENTIALS_JSON: str = ""

    # ── Calendario ─────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    ZOOM_CLIENT_ID: str = ""
    ZOOM_CLIENT_SECRET: str = ""
    ZOOM_ACCOUNT_ID: str = ""

    # ── Mapas ──────────────────────────────────────────
    GOOGLE_MAPS_API_KEY: str = ""
    MAPBOX_TOKEN: str = ""

    # ── Automatización ────────────────────────────────
    PUSHER_APP_ID: str = ""
    PUSHER_KEY: str = ""
    PUSHER_SECRET: str = ""
    PUSHER_CLUSTER: str = "mt1"

    # ── Celery ────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    APP_URL: str = "https://app.xlegal.com.py"

    @property
    def cors_origins_list(self) -> List[str]:
        # Parsea la cadena coma-separada de CORS_ORIGINS a una lista.
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def warn_insecure_defaults(self) -> None:
        """
        Loguea WARNINGs si en producción se están usando valores por defecto
        inseguros. NO aborta el arranque: solo advierte para no romper el
        compose actual.
        """
        if self.ENVIRONMENT != "production":
            return

        for field, insecure_value in INSECURE_DEFAULTS.items():
            if getattr(self, field, None) == insecure_value:
                logger.warning(
                    "⚠️  SEGURIDAD: '%s' usa el valor por defecto inseguro en "
                    "producción. Definí una variable de entorno segura.",
                    field,
                )

        if self.cors_origins_list == ["*"]:
            logger.warning(
                "⚠️  SEGURIDAD: CORS_ORIGINS está en '*' (cualquier origen) en "
                "producción. Definí CORS_ORIGINS con la lista de dominios permitidos.",
            )

        if self.DEBUG:
            logger.warning(
                "⚠️  SEGURIDAD: DEBUG=True en producción. Desactivalo (DEBUG=False).",
            )

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
