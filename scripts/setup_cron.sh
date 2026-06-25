#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  XLegal — Setup del cron de backup automático
#  Ejecutar una sola vez en el servidor de producción
# ═══════════════════════════════════════════════════════════════════

XLEGAL_DIR="/opt/xlegal"
BACKUP_SCRIPT="$XLEGAL_DIR/scripts/backup_postgres.sh"
LOG_FILE="/var/log/xlegal_backup.log"

# Create log file
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

# Add cron job: backup diario a las 2:00 AM
CRON_LINE="0 2 * * * $BACKUP_SCRIPT >> $LOG_FILE 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "backup_postgres.sh"; then
    echo "ℹ️  El cron de backup ya está configurado:"
    crontab -l | grep "backup_postgres"
else
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "✅ Cron de backup configurado:"
    echo "   $CRON_LINE"
fi

echo ""
echo "  Logs: tail -f $LOG_FILE"
echo "  Test: $BACKUP_SCRIPT"
