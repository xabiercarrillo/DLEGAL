"""
XLegal — Celery: Cola de tareas + Beat scheduler
Workers: recordatorios, emails, WhatsApp
"""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "xlegal",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.reminders"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/Asuncion",
    enable_utc=True,
    worker_concurrency=2,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)

# ── Beat Schedule (tareas periódicas) ─────────────────────────────────────
celery_app.conf.beat_schedule = {
    # Verificar plazos a vencer: 8am y 6pm hora Paraguay
    "check-deadlines-morning": {
        "task": "check_deadlines",
        "schedule": crontab(hour=8, minute=0),
    },
    "check-deadlines-evening": {
        "task": "check_deadlines",
        "schedule": crontab(hour=18, minute=0),
    },
    # Verificar audiencias del día siguiente: 7pm
    "check-hearings-daily": {
        "task": "check_hearings",
        "schedule": crontab(hour=19, minute=0),
    },
    # Cobranzas: lunes y jueves a las 9am
    "check-collections-weekly": {
        "task": "check_collections",
        "schedule": crontab(hour=9, minute=0, day_of_week="1,4"),
    },
    # Trial expiry notifications: diariamente a las 9am
    "check-trial-expiry-daily": {
        "task": "check_trial_expiry",
        "schedule": crontab(hour=9, minute=0),
    },
}
