# DLEGAL — Backlog de lo que falta (auditoría 2026-06-25)

Estado verificado: backend ~87% funcional, frontend ~90% conectado. Lo de abajo es lo que **falta o está incompleto** para ser un sistema jurídico de producción serio. Priorizado P0 (crítico) → P2 (deseable).

---

## P0 — Crítico (bloquea producción)

### Backend
- **Business Intelligence 100% mock** — `app/api/v1/business_intel.py` (líneas 40-238, 348-385): todos los endpoints de ads/analytics/marketing/leads devuelven datos hardcodeados; `churn_rate` fijo en 0.0. Reemplazar por queries reales (tenants, pagos, webhooks).
- **Seguridad de configuración** — `app/core/config.py`: `DEBUG=True` (l.8), `SECRET_KEY` hardcodeado (l.11), `FIRST_SUPERUSER_PASSWORD="XLegal"` (l.20), `CORS_ORIGINS="*"` (l.17). Deben venir de `.env` con validación que falle al iniciar en prod.
- **Credenciales de integraciones en texto plano** — `TenantIntegration.config` guarda API keys (PandaDoc/Stripe/etc.) sin cifrar (`integrations.py:150`). Cifrar con Fernet.
- **Migraciones Alembic son placeholders** — `alembic/versions/001_initial_schema.py:24` (`pass`); el esquema se crea por `create_all()` en `seed.py`. Generar migraciones reales (`--autogenerate`).
- **Webhooks de pago sin verificación de firma** — `payments_ext.py:269-293`: Bancard y MercadoPago no validan HMAC → webhooks falsificables pueden marcar pagos como cobrados. Verificar firma en todos los inbound.
- **Facturación sin validación de timbrado SET** — `billing.py:68-82`: números de factura generados sin validar timbrado/vigencia. Integrar o validar formato SET estricto.

### Frontend
- **Validación de formularios ausente** — clientes/casos/contactos/facturas/registro no validan email, CI, RUC, montos > 0, formatos. Solo chequean "no vacío".
- **Sin estados de error inline** — toda mutación usa solo `toast.error()`; falta feedback visual en formularios/tablas (~15 páginas).
- **Links muertos en búsqueda** — `search/page.tsx:188`: navega a `#` si falta `url`.

---

## P1 — Importante (afecta producción tras lanzar)

### Backend
- **Cobertura de tests** — 76 tests para 38+ módulos. Sin tests: pagos, e-firma, webhooks, integraciones, WhatsApp, Maps, Zoom, business_intel. Añadir 50+.
- **Logging/observabilidad** — `print()` en vez de logger (`email.py:16,28`); `except Exception: pass` silenciosos en `payments.py`, `tasks/reminders.py`, `documents.py`. Logger estructurado.
- **Rate limiting inexistente** — `main.py` sin middleware; login/pagos vulnerables a fuerza bruta. Añadir slowapi/Redis.
- **Aislamiento multi-tenant** — `models/base.py:16` sin ForeignKey; verificar `tenant_id` en el WHERE de todas las queries críticas (pagos, facturas, documentos).
- **Healthcheck incompleto** — `main.py:111-129` no chequea DB/Redis/integraciones.

### Frontend
- **Datos hardcodeados** — tribunales (`hearings:23-27`), tipos/estados de citas y tareas deberían venir del backend.
- **Responsive roto en móvil** — tabla de facturación 7 columnas sin scroll (`billing:99-163`); panel de caso ocupa toda la pantalla (`cases:178-323`).
- **Estados de carga inconsistentes** — sin loaders en botones de settings/reports; upload de documentos sin barra de progreso.
- **UI faltante para endpoints existentes** — webhooks outbound, business intelligence, crear/editar integraciones, generación de PDF, crear reunión Zoom/Meet.

---

## P2 — Deseable (calidad/pulido)

### Backend
- Paginación faltante en varios list endpoints (export, library, calendar).
- Búsqueda global probablemente con LIKE sin índices → full-text PostgreSQL.
- Auditoría de cambios incompleta (quién cambió qué en datos sensibles).
- Estrategia de backups no documentada en código.
- Cuotas de storage por tenant; archivado a S3/R2.

### Frontend
- **Accesibilidad**: faltan `<h1>` semánticos, `aria-label` en botones de cierre, "skip to content", 404 custom con contenido (`not-found.tsx` vacío).
- **SEO**: sin metadata por página (todo hereda `<title>` = DLEGAL).
- **Tech debt**: tipos `any` generalizados (20+), lógica duplicada (`daysUntil`/`DaysFromNow`, mapas de estado repetidos), sin reset de formularios tras submit.
- **Sin paginación**: `limit:200` hardcodeado carga todo en memoria.
- **Cero tests** de frontend (unit/e2e).

---

## Plan sugerido
- **Sprint 1 (P0)**: quitar DEBUG/secrets a .env, cifrar credenciales, business_intel real, HMAC en webhooks, migraciones Alembic, validación de formularios + estados de error.
- **Sprint 2 (P1)**: logging + rate limiting + healthcheck, 50+ tests backend, responsive móvil, UI de endpoints faltantes.
- **Sprint 3 (P2)**: accesibilidad, SEO, paginación, tipos, tests frontend.
