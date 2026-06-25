#!/bin/bash
# XLegal v2.0.0 — Script de despliegue automático
# Uso: chmod +x deploy.sh && ./deploy.sh
# Soporte: 0993397400

set -e
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   XLegal v2.0.0 — Deploy Paraguay 🇵🇾   ║"
echo "║   Soporte: 0993397400                    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado."
    echo "   Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "✅ Docker instalado. Ejecute: newgrp docker && ./deploy.sh"
    exit 1
fi

# 2. Crear .env si no existe
if [ ! -f .env ]; then
    cp .env.example .env
    SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/cambiar-por-clave-aleatoria-de-64-chars-en-produccion/$SECRET/" .env
    echo "✅ .env creado con SECRET_KEY generado automáticamente"
    echo "⚠️  Edite .env con sus credenciales antes de continuar (RESEND_API_KEY, etc.)"
    echo ""
    read -p "¿Continuar con configuración mínima? (s/n): " CONT
    [ "$CONT" != "s" ] && [ "$CONT" != "S" ] && exit 0
fi

# 3. Build y arranque
echo ""
echo "🐳 Construyendo imágenes Docker (primera vez: ~5 min)..."
docker compose pull 2>/dev/null || true
docker compose up -d --build

echo ""
echo "⏳ Esperando que los servicios inicien..."
sleep 15

# 4. Verificar salud
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║   ✅ XLegal está funcionando             ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    echo "   🌐 Aplicación:    http://$(hostname -I | awk '{print $1}')"
    echo "   📖 API Docs:      http://$(hostname -I | awk '{print $1}')/docs"
    echo ""
    echo "   🔑 Super Admin:   xabiercarrillo@gmail.com / XLegal"
    echo "   🔑 Demo Admin:    admin@xlegal.com.py / Admin2024!"
    echo ""
    echo "   📞 Soporte:       0993397400"
    echo ""
else
    echo "⚠️  Servicio respondió HTTP $HTTP_CODE. Verificando logs..."
    docker compose logs --tail=30 backend
fi
