#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  XLegal — Restauración de PostgreSQL desde backup
#  Uso: ./scripts/restore_postgres.sh /opt/xlegal/backups/xlegal_2024-03-01_02-00-00.sql.gz
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_FILE="${1:-}"
CONTAINER="xlegal_postgres"
DB_NAME="xlegal"
DB_USER="xlegal"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    echo "Uso: $0 <ruta_al_backup.sql.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lht /opt/xlegal/backups/xlegal_*.sql.gz 2>/dev/null || echo "(ninguno)"
    exit 1
fi

echo "⚠️  ADVERTENCIA: Esto sobreescribirá la base de datos actual."
echo "   Backup a restaurar: $BACKUP_FILE"
read -p "   ¿Continuar? (escribe 'si' para confirmar): " CONFIRM

if [ "$CONFIRM" != "si" ]; then
    echo "Operación cancelada."
    exit 0
fi

echo "⏳ Deteniendo backend y celery..."
docker compose stop backend celery 2>/dev/null || true

echo "⏳ Restaurando base de datos..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

echo "⏳ Reiniciando servicios..."
docker compose start backend celery 2>/dev/null || true

echo "✅ Restauración completada desde: $(basename $BACKUP_FILE)"
