# DLEGAL v2.0.0 — Sistema de Gestión Jurídica Paraguay 🇵🇾

> Software de gestión jurídica multi-tenant diseñado específicamente para abogados y estudios jurídicos del Paraguay.

**Contacto / Ventas:** `0993397400` | [WhatsApp](https://wa.me/595993397400)

---

## 🚀 Despliegue Rápido (Ubuntu 22/24 + Docker)

### 1. Requisitos del servidor
```bash
# Ubuntu 22.04 LTS o superior
# Mínimo: 2 vCPU, 4 GB RAM, 40 GB SSD
# Docker y Docker Compose instalados
```

### 2. Instalar Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Subir y descomprimir el proyecto
```bash
scp xlegal_v2.zip usuario@tu-servidor.com:/opt/
ssh usuario@tu-servidor.com
cd /opt && unzip xlegal_v2.zip && cd xlegal
```

### 4. Configurar variables de entorno
```bash
cp .env.example .env
nano .env
```

Variables mínimas a configurar en `.env`:
```env
# Seguridad (CAMBIAR OBLIGATORIO)
SECRET_KEY=genera-clave-aleatoria-de-64-chars-aqui

# Super Admin
FIRST_SUPERUSER_EMAIL=xabiercarrillo@gmail.com
FIRST_SUPERUSER_PASSWORD=DLEGAL

# Email (Resend - https://resend.com — plan free: 3.000 emails/mes)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Opcional: WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Opcional: IA
OPENAI_API_KEY=sk-...
```

### 5. Levantar la aplicación
```bash
docker compose up -d --build
```

Primera vez tarda ~5 minutos (descarga imágenes, instala dependencias, compila frontend).

### 6. Verificar que funciona
```bash
docker compose ps           # todos deben estar "Up"
docker compose logs backend  # ver logs del backend
curl http://localhost/health  # debe responder JSON
```

---

## 🔐 Accesos del sistema

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Super Admin | xabiercarrillo@gmail.com | DLEGAL | Super Admin |
| Demo Admin | admin@xlegal.com.py | Admin2024! | Firm Admin |
| Demo Abogado | abogado@demo.com.py | Demo2024! | Lawyer |

> ⚠️ Cambiar todas las contraseñas en producción.

---

## 🌐 URLs

| Servicio | URL |
|---------|-----|
| Aplicación | http://tu-servidor.com |
| API Docs | http://tu-servidor.com/docs |
| API ReDoc | http://tu-servidor.com/redoc |
| Health | http://tu-servidor.com/health |

---

## 📦 Planes de Suscripción

| Plan | Usuarios | Precio |
|------|----------|--------|
| Solo | 1 abogado | ₲ 75.000/mes |
| Buffet S | Hasta 5 | ₲ 300.000/mes |
| Buffet M | Hasta 10 | ₲ 500.000/mes |
| Buffet L | Ilimitado | Consultar: 0993397400 |

---

## 🔧 Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Reiniciar un servicio
docker compose restart backend

# Backup de base de datos
docker exec xlegal_postgres pg_dump -U xlegal xlegal > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i xlegal_postgres psql -U xlegal xlegal < backup_20240101.sql

# Ver uso de recursos
docker stats

# Actualizar a nueva versión
docker compose down
# (subir nueva versión)
docker compose up -d --build
```

---

## 🏗️ Arquitectura

```
nginx (puerto 80/443)
  ├── /api/v1/*  →  FastAPI backend (puerto 8000)
  │                  ├── PostgreSQL 16
  │                  ├── Redis 7
  │                  └── Celery (recordatorios automáticos)
  └── /*         →  Next.js 14 frontend (puerto 3000)
```

---

## 📋 Módulos incluidos (33 routers / 173 endpoints)

**Gestión Legal:** Casos, Clientes, Audiencias, Plazos, Tareas, Mediaciones, Citas, Documentos  
**Biblioteca:** Normas jurídicas paraguayas, Modelos de escritos (10 plantillas base)  
**Finanzas:** Facturación, Ingresos, Gastos, Cobranzas, Presupuestos, Contabilidad  
**Herramientas:** Calculadora Ley 213/93, LEXI IA (OpenAI/Claude/Cohere), Búsqueda global  
**Integraciones v2:** PandaDoc, DocuSign, Bancard PY, Mercado Pago, Stripe, PayPal, WhatsApp, Zoom, Google Calendar, Mapas  
**Admin:** Multi-tenant, Super Admin panel, Auditoría, Exportación de datos  

---

## 🔒 SSL / HTTPS (producción)

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Obtener certificado (reemplazar con tu dominio)
certbot --nginx -d app.xlegal.com.py

# El certificado se renueva automáticamente
```

---

## 📞 Soporte

**Teléfono / WhatsApp:** 0993397400  
**Email:** xabiercarrillo@gmail.com

---

*DLEGAL v2.0.0 — Paraguay 🇵🇾 | © 2024*

---

## Reuniones Virtuales

La página **Reuniones Virtuales** (`/reuniones`) permite:
- Crear reuniones Zoom con un clic — recibís el link para el cliente y el link de host
- Crear eventos con Google Meet — se sincroniza al calendario y envía invitación
- Ver todas las reuniones próximas desde Google Calendar y Calendly
- Copiar links con un clic para compartir por WhatsApp

**Requiere**: Configurar Zoom o Google Calendar en Integraciones.

---

## Firma Electrónica en Documentos

En la página Documentos, los PDFs muestran el botón ✍️ (Firma). Al hacer clic:
1. Seleccionás el proveedor (PandaDoc o DocuSign)
2. Agregás los firmantes (nombre + email)
3. Los firmantes reciben un email con el link para firmar
4. El documento firmado queda disponible para descargar

**Requiere**: Configurar PandaDoc o DocuSign en Integraciones.

---

## Backup automático

```bash
# Configurar backup diario automático (2 AM):
sudo ./scripts/setup_cron.sh

# Backup manual:
./scripts/backup_postgres.sh

# Restaurar:
./scripts/restore_postgres.sh /opt/xlegal/backups/xlegal_FECHA.sql.gz

# Ver logs de backup:
tail -f /var/log/xlegal_backup.log
```

Los backups se guardan en `/opt/xlegal/backups/` con retención de 30 días.  
Para backup en la nube, configurar `BACKUP_S3_BUCKET` en `.env`.

---

## CI/CD (GitHub Actions)

El pipeline en `.github/workflows/ci.yml` ejecuta automáticamente:
1. **Tests** del backend (74 tests, PostgreSQL real)
2. **Build** del frontend (Next.js + TypeScript)
3. **Build y push** de imágenes Docker a Docker Hub (solo en `main`)
4. **Deploy automático** al servidor de producción via SSH (solo en `main`)

### Secrets requeridos en GitHub:
```
DOCKER_USERNAME      # Usuario Docker Hub
DOCKER_PASSWORD      # Password/token Docker Hub  
DEPLOY_HOST          # IP o dominio del servidor
DEPLOY_USER          # Usuario SSH (ej: ubuntu)
DEPLOY_SSH_KEY       # Clave SSH privada (sin passphrase)
```
