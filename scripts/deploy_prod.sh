#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  XLegal — Deploy en servidor de producción (Ubuntu + Docker)
#  Uso: sudo ./scripts/deploy_prod.sh
#  Probado en: Linode, DigitalOcean, VPS Ubuntu 22.04
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

XLEGAL_DIR="/opt/xlegal"
DOMAIN="${DOMAIN:-xlegal.com.py}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         XLegal v2.0.0 — Deploy Paraguay 🇵🇾                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Verificar root ─────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ejecutar como root: sudo $0"
    exit 1
fi

# ── 2. Instalar Docker si no está ─────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo "⏳ Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker instalado"
else
    echo "✅ Docker ya instalado: $(docker --version)"
fi

# ── 3. Copiar archivos ────────────────────────────────────────────
echo "⏳ Copiando archivos a $XLEGAL_DIR..."
mkdir -p "$XLEGAL_DIR"
cp -r . "$XLEGAL_DIR/"
cd "$XLEGAL_DIR"

# ── 4. Configurar .env ────────────────────────────────────────────
if [ ! -f ".env" ]; then
    cp .env.example .env
    # Generate random SECRET_KEY
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/dev-secret-key-change-in-production/$SECRET/g" .env
    echo ""
    echo "⚠️  ACCIÓN REQUERIDA: Completar variables en .env"
    echo "   nano $XLEGAL_DIR/.env"
    echo ""
    echo "   Variables obligatorias:"
    echo "   - RESEND_API_KEY (email transaccional)"
    echo "   - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (WhatsApp)"
    echo "   - BANCARD_PRIVATE_KEY + BANCARD_PUBLIC_KEY (pagos PY)"
    echo "   - OPENAI_API_KEY o ANTHROPIC_API_KEY (LEXI IA)"
    echo ""
    read -p "¿Ya completaste el .env? (s/n): " DONE
    if [ "$DONE" != "s" ]; then
        echo "Deploy pausado. Edita .env y ejecuta nuevamente."
        exit 0
    fi
else
    echo "✅ .env existente encontrado"
fi

# ── 5. Backup de BD si existe ────────────────────────────────────
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "xlegal_postgres"; then
    echo "⏳ Backup previo al deploy..."
    ./scripts/backup_postgres.sh
fi

# ── 6. Build y levantar ──────────────────────────────────────────
echo "⏳ Construyendo imágenes Docker (esto puede tardar 3-5 min)..."
docker compose build --no-cache

echo "⏳ Levantando servicios..."
docker compose up -d

# ── 7. Esperar health check ─────────────────────────────────────
echo "⏳ Esperando que los servicios arranquen..."
for i in {1..30}; do
    if curl -sf http://localhost/health >/dev/null 2>&1; then
        echo "✅ Backend respondiendo correctamente"
        break
    fi
    echo "   Intento $i/30..."
    sleep 5
done

# ── 8. Configurar backup automático ─────────────────────────────
./scripts/setup_cron.sh

# ── 9. Opcional: Let's Encrypt SSL ──────────────────────────────
if command -v certbot &>/dev/null; then
    echo ""
    read -p "¿Configurar SSL con Let's Encrypt para $DOMAIN? (s/n): " SSL
    if [ "$SSL" = "s" ]; then
        certbot --nginx -d "$DOMAIN" -d "app.$DOMAIN" --non-interactive --agree-tos -m "xabiercarrillo@gmail.com"
    fi
fi

# ── Resumen ─────────────────────────────────────────────────────
IP=$(curl -s ifconfig.me 2>/dev/null || echo "TU_IP")
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ XLegal desplegado exitosamente                          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Landing:    http://${IP}/                                  ║"
echo "║  Aplicación: http://${IP}/login                             ║"
echo "║  API Docs:   http://${IP}/docs                              ║"
echo "║  Super Admin: xabiercarrillo@gmail.com / XLegal             ║"
echo "║  Soporte:    0993397400                                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Logs: docker compose logs -f"
echo "  Backup: ./scripts/backup_postgres.sh"
