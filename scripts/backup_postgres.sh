#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  XLegal — Backup automático de PostgreSQL
#  Uso: ./scripts/backup_postgres.sh
#  Cron: 0 2 * * * /opt/xlegal/scripts/backup_postgres.sh >> /var/log/xlegal_backup.log 2>&1
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────
CONTAINER="xlegal_postgres"
DB_NAME="xlegal"
DB_USER="xlegal"
BACKUP_DIR="/opt/xlegal/backups"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/xlegal_${DATE}.sql.gz"

# Optional: upload to S3/R2
S3_BUCKET="${BACKUP_S3_BUCKET:-}"  # Set in environment or .env
S3_PREFIX="db-backups"

# ── Crear directorio de backups ─────────────────────────────────────
mkdir -p "$BACKUP_DIR"

echo "────────────────────────────────────────────────────────────────"
echo "  🗄️  XLegal Backup — $(date '+%Y-%m-%d %H:%M:%S')"
echo "────────────────────────────────────────────────────────────────"

# ── Verificar contenedor corriendo ─────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "❌ ERROR: Contenedor ${CONTAINER} no está corriendo"
    exit 1
fi

# ── Dump + compress ─────────────────────────────────────────────────
echo "⏳ Generando dump..."
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✅ Backup creado: $BACKUP_FILE ($SIZE)"

# ── Verificar integridad del backup ────────────────────────────────
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "❌ ERROR: El backup está corrupto. Eliminando..."
    rm -f "$BACKUP_FILE"
    exit 1
fi
echo "✅ Integridad verificada"

# ── Upload a S3/R2 (si está configurado) ───────────────────────────
if [ -n "$S3_BUCKET" ]; then
    echo "⏳ Subiendo a S3/R2: s3://${S3_BUCKET}/${S3_PREFIX}/"
    if aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/${S3_PREFIX}/$(basename $BACKUP_FILE)" \
        --storage-class STANDARD_IA 2>/dev/null; then
        echo "✅ Subido a S3/R2"
    else
        echo "⚠️  No se pudo subir a S3/R2 (backup local disponible)"
    fi
fi

# ── Limpiar backups viejos (retención: 30 días) ─────────────────────
echo "🧹 Limpiando backups de más de ${RETENTION_DAYS} días..."
find "$BACKUP_DIR" -name "xlegal_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
REMAINING=$(ls "$BACKUP_DIR"/xlegal_*.sql.gz 2>/dev/null | wc -l)
echo "📦 Backups disponibles: $REMAINING"

# ── Resumen ────────────────────────────────────────────────────────
echo ""
echo "  Backup: $(basename $BACKUP_FILE)"
echo "  Tamaño: $SIZE"
echo "  Destino: $BACKUP_DIR"
echo "  Retención: ${RETENTION_DAYS} días"
echo ""
echo "✅ Backup completado exitosamente — $(date '+%Y-%m-%d %H:%M:%S')"
