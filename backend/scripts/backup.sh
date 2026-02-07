#!/bin/bash
# PikaBoard Database Backup Script
# Keeps 7 days of rolling backups

DB_PATH="/home/jndoye/.openclaw/workspace/shared/projects/pikaboard/backend/data/pikaboard.db"
BACKUP_DIR="/home/jndoye/.openclaw/workspace/shared/projects/pikaboard/backend/backups"
DATE=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/pikaboard_$DATE.db"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup using SQLite backup command (safer than cp for live DB)
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

if [ -f "$BACKUP_FILE" ]; then
  echo "✅ Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
  echo "❌ Backup failed!"
  exit 1
fi

# Remove backups older than 7 days
DELETED=$(find "$BACKUP_DIR" -name "pikaboard_*.db" -mtime +7 -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "🧹 Cleaned $DELETED old backups"
fi

# List current backups
echo ""
echo "📦 Current backups:"
ls -lh "$BACKUP_DIR"/pikaboard_*.db 2>/dev/null | tail -10
