"""
XLegal — Tareas Celery de Recordatorios Multi-Canal
Correo (Resend/SendGrid) + WhatsApp (Twilio) + Pusher (realtime)
"""
from celery import shared_task
from app.core.celery import celery_app


@celery_app.task(name="app.tasks.reminders.check_deadlines")
def check_deadlines():
    """Verifica plazos próximos y envía recordatorios por email + WhatsApp."""
    import asyncio
    asyncio.run(_async_check_deadlines())


async def _async_check_deadlines():
    from datetime import date, timedelta
    from sqlalchemy import select, and_
    from app.core.database import AsyncSessionLocal
    from app.models.deadline import Deadline
    from app.models.user import User
    from app.core.email import send_deadline_reminder
    from app.services.whatsapp import twilio_wa, msg_deadline_reminder
    from app.services.webhooks import dispatch_event, pusher

    async with AsyncSessionLocal() as db:
        today = date.today()
        alert_days = [1, 3, 7]
        for days in alert_days:
            target = today + timedelta(days=days)
            q = select(Deadline).where(
                and_(Deadline.due_date == target, Deadline.is_completed == False)
            )
            r = await db.execute(q)
            deadlines = r.scalars().all()

            # Group by lawyer
            from collections import defaultdict
            by_lawyer: dict = defaultdict(list)
            for d in deadlines:
                if d.lawyer_id:
                    by_lawyer[d.lawyer_id].append(d)

            for lawyer_id, dls in by_lawyer.items():
                ru = await db.execute(select(User).where(User.id == lawyer_id))
                user = ru.scalar_one_or_none()
                if not user:
                    continue

                dl_data = [{"title": d.title, "due_date": str(d.due_date), "days_left": days} for d in dls]

                # Email
                if user.email:
                    try:
                        await send_deadline_reminder(user.email, user.full_name or "", dl_data)
                    except Exception as e:
                        print(f"[Reminder email error] {e}")

                # WhatsApp
                whatsapp_num = getattr(user, "whatsapp_number", None) or getattr(user, "phone", None)
                if whatsapp_num:
                    for dl in dls[:3]:
                        msg = msg_deadline_reminder(user.full_name or "", dl.title, days)
                        try:
                            await twilio_wa.send_message(whatsapp_num, msg)
                        except Exception:
                            pass

                # Pusher realtime
                if user.tenant_id:
                    await pusher.notify_tenant(user.tenant_id, "deadline.due_soon", {
                        "days": days,
                        "deadlines": [{"title": d.title} for d in dls[:5]],
                        "lawyer_id": lawyer_id,
                    })
                    await dispatch_event(user.tenant_id, "deadline.due_soon", {
                        "days_left": days,
                        "count": len(dls),
                    }, db)


@celery_app.task(name="app.tasks.reminders.check_hearings")
def check_hearings():
    """Recordatorios de audiencias para mañana."""
    import asyncio
    asyncio.run(_async_check_hearings())


async def _async_check_hearings():
    from datetime import date, timedelta
    from sqlalchemy import select, and_, func
    from app.core.database import AsyncSessionLocal
    from app.models.hearing import Hearing
    from app.models.user import User
    from app.core.email import send_hearing_reminder
    from app.services.whatsapp import twilio_wa, msg_hearing_reminder

    async with AsyncSessionLocal() as db:
        tomorrow = date.today() + timedelta(days=1)
        q = select(Hearing).where(
            and_(
                func.date(Hearing.scheduled_at) == tomorrow,
                Hearing.status.in_(["scheduled", "confirmed"]),
            )
        )
        r = await db.execute(q)
        hearings = r.scalars().all()

        for h in hearings:
            if not h.lawyer_id:
                continue
            ru = await db.execute(select(User).where(User.id == h.lawyer_id))
            user = ru.scalar_one_or_none()
            if not user:
                continue

            date_str = h.scheduled_at.strftime("%d/%m/%Y %H:%M") if h.scheduled_at else ""
            # Email
            if user.email:
                try:
                    await send_hearing_reminder(
                        user.email, user.full_name or "",
                        [{"title": h.title or "Audiencia", "scheduled_at": date_str, "court": h.court or ""}]
                    )
                except Exception as e:
                    print(f"[Hearing email error] {e}")

            # WhatsApp
            whatsapp_num = getattr(user, "whatsapp_number", None) or getattr(user, "phone", None)
            if whatsapp_num:
                msg = msg_hearing_reminder(user.full_name or "", h.title or "Audiencia", date_str, h.court or "")
                try:
                    await twilio_wa.send_message(whatsapp_num, msg)
                except Exception:
                    pass


@celery_app.task(name="app.tasks.reminders.check_collections")
def check_collections():
    """Recordatorios de facturas vencidas o por vencer."""
    import asyncio
    asyncio.run(_async_check_collections())


async def _async_check_collections():
    from datetime import date, timedelta
    from sqlalchemy import select, and_
    from app.core.database import AsyncSessionLocal
    from app.models.billing import Invoice
    from app.models.client import Client
    from app.core.email import send_invoice_reminder
    from app.services.whatsapp import twilio_wa, msg_invoice_reminder

    async with AsyncSessionLocal() as db:
        today = date.today()
        alert_date = today + timedelta(days=3)  # Vence en 3 días

        q = select(Invoice).where(
            and_(
                Invoice.status == "sent",
                Invoice.due_date <= alert_date,
                Invoice.due_date >= today,
            )
        )
        r = await db.execute(q)
        invoices = r.scalars().all()

        for inv in invoices:
            if not inv.client_id:
                continue
            rc = await db.execute(select(Client).where(Client.id == inv.client_id))
            client = rc.scalar_one_or_none()
            if not client:
                continue

            due_str = inv.due_date.strftime("%d/%m/%Y") if inv.due_date else ""

            # Email
            if client.email:
                try:
                    await send_invoice_reminder(
                        client.email,
                        client.full_name or "",
                        [{"number": str(inv.invoice_number or ""), "balance": float(inv.total or 0), "due_date": due_str}],
                        "XLegal",
                        "0993397400",
                    )
                except Exception as e:
                    print(f"[Collection email error] {e}")

            # WhatsApp (solo si vence en ≤ 3 días)
            whatsapp_num = getattr(client, "whatsapp", None) or getattr(client, "phone", None)
            if whatsapp_num:
                msg = msg_invoice_reminder(client.full_name or "", float(inv.total or 0), due_str, "su estudio jurídico")
                try:
                    await twilio_wa.send_message(whatsapp_num, msg)
                except Exception:
                    pass


# ─────────────────────────────────────────────────────────────────
#  TRIAL EXPIRY NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────

@celery_app.task(name="check_trial_expiry")
def check_trial_expiry():
    """
    Notifica a tenants cuyo trial vence en 3 días o mañana.
    Corre todos los días a las 9am hora Paraguay.
    """
    import asyncio
    asyncio.run(_async_check_trial_expiry())


async def _async_check_trial_expiry():
    from datetime import date, timedelta
    from sqlalchemy import select, and_
    from app.core.database import AsyncSessionLocal
    from app.models.tenant import Tenant
    from app.core.email import send_email, _base_template

    CONTACT_PHONE = "0993397400"

    async with AsyncSessionLocal() as db:
        today = date.today()

        for days_left in [3, 1]:
            target = today + timedelta(days=days_left)
            target_str = target.strftime("%Y-%m-%d")

            q = select(Tenant).where(
                and_(
                    Tenant.payment_status == "trial",
                    Tenant.trial_ends_at == target_str,
                    Tenant.is_active == True,
                )
            )
            result = await db.execute(q)
            tenants = result.scalars().all()

            for t in tenants:
                email_to = t.admin_email or t.email
                name = t.admin_name or t.name or "Estimado/a"
                if not email_to:
                    continue

                if days_left == 3:
                    subject = "⏳ Tu período de prueba XLegal vence en 3 días"
                    msg = f"""
                    <p>Hola <strong>{name}</strong>,</p>
                    <p>Te recordamos que tu período de prueba gratuita de <strong>XLegal</strong>
                    vence el <strong>{target_str}</strong> (en 3 días).</p>
                    <p>Para continuar usando todos los módulos sin interrupciones,
                    coordiná el pago de tu suscripción <strong>{t.plan.replace('_', ' ').title()}</strong>
                    con nuestro equipo:</p>
                    <p style="font-size:18px;font-weight:bold;">📱 {CONTACT_PHONE}</p>
                    <p>Aceptamos transferencia bancaria, Bancard y Mercado Pago.</p>
                    <p>Si ya realizaste el pago, ignorá este mensaje — nuestro equipo
                    lo procesará a la brevedad.</p>
                    """
                else:
                    subject = "🚨 Tu período de prueba XLegal vence MAÑANA"
                    msg = f"""
                    <p>Hola <strong>{name}</strong>,</p>
                    <p><strong>Tu acceso a XLegal se suspende mañana {target_str}.</strong></p>
                    <p>Para no perder el acceso a tus casos, clientes y documentos,
                    comunicate hoy mismo con nuestro equipo:</p>
                    <p style="font-size:20px;font-weight:bold;">📱 {CONTACT_PHONE}</p>
                    <p>El proceso de activación es inmediato una vez confirmado el pago.</p>
                    """

                html = _base_template(subject, msg)
                try:
                    await send_email(email_to, subject, html)
                except Exception:
                    pass  # Don't crash if one email fails
