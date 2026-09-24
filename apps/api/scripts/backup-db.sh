#!/usr/bin/env bash
# Backup harian terenkripsi untuk PostgreSQL SmartHub.
# Alur: pg_dump -> enkripsi AES-256-CBC (PBKDF2) -> berkas .sql.enc
#
# Pemakaian:
#   DATABASE_URL="postgresql://..." \
#   BACKUP_ENCRYPTION_KEY="rahasia-panjang" \
#   BACKUP_DIR="/var/backups/smarthub" \
#   ./scripts/backup-db.sh
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL wajib diisi}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY wajib diisi}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/smarthub-$STAMP.sql.enc"

pg_dump --no-owner --no-privileges "$DATABASE_URL" \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_ENCRYPTION_KEY -out "$OUT"

echo "Backup terenkripsi tersimpan: $OUT"

find "$BACKUP_DIR" -name 'smarthub-*.sql.enc' -type f -mtime "+$RETENTION_DAYS" -delete
echo "Retensi $RETENTION_DAYS hari diterapkan."
