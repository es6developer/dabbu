#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_HOST="${MYSQL_HOST:-mysql}"
DB_PORT="${MYSQL_PORT:-3306}"
DB_USER="${MYSQL_USER:-dabbu}"
DB_PASSWORD="${MYSQL_PASSWORD:-dabbu}"
DB_NAME="${MYSQL_DATABASE:-dabbu}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of $DB_NAME..."

docker exec mysql mysqldump \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  -p"$DB_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Backup completed: ${DB_NAME}_${TIMESTAMP}.sql.gz"

if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  aws s3 cp "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz" "s3://${S3_BACKUP_BUCKET}/database/${DB_NAME}_${TIMESTAMP}.sql.gz"
  echo "[$(date)] Backup uploaded to S3"
fi

find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Old backups cleaned (retention: ${RETENTION_DAYS} days)"
