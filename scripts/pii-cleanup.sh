#!/bin/bash
# PII Cleanup Migration Script
# Removes session_id and subagent_id from task_events table
# Removes session_key and run_id from activity metadata

set -e

DB_PATH="${DATABASE_PATH:-./backend/data/pikaboard.db}"

echo "🔒 PII Cleanup Migration"
echo "========================"
echo "Database: $DB_PATH"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at $DB_PATH"
    exit 1
fi

# Backup database first
BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$DB_PATH" "$BACKUP_PATH"
echo "✅ Database backed up to: $BACKUP_PATH"

# Clean up task_events table - set session_id and subagent_id to NULL
echo "🧹 Cleaning task_events table..."
sqlite3 "$DB_PATH" "UPDATE task_events SET session_id = NULL WHERE session_id IS NOT NULL;"
sqlite3 "$DB_PATH" "UPDATE task_events SET subagent_id = NULL WHERE subagent_id IS NOT NULL;"

# Clean up activity table - remove session_key and run_id from metadata
# This is more complex as it's JSON in a text field
echo "🧹 Cleaning activity table..."

# Get all activity IDs with metadata containing session_key or run_id
# Note: This is a simple approach - for production, consider a more robust JSON update
sqlite3 "$DB_PATH" "
UPDATE activity 
SET metadata = REPLACE(REPLACE(metadata, '\"session_key\":\"', '\"session_key\":\"[REDACTED]'), '\"run_id\":\"', '\"run_id\":\"[REDACTED]')
WHERE metadata LIKE '%session_key%' OR metadata LIKE '%run_id%';
"

echo "✅ PII cleanup completed!"
echo ""
echo "Summary:"
echo "  - task_events: session_id and subagent_id set to NULL"
echo "  - activity: session_key and run_id redacted in metadata"
echo ""
echo "Backup location: $BACKUP_PATH"
