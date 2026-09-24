#!/usr/bin/env bash
# Uji restore dari backup terenkripsi. Jalankan ke database TERPISAH, bukan produksi.
#
# Pemakaian:
#   DATABASE_URL="postgresql://.../smarthub_restore_test" \
#   BACKUP_ENCRYPTION_KEY="rahasia-panjang" \
#   ./scripts/restore-db.sh /var/backups/smarthub/smarthub-20260101T000000Z.sql.enc
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL wajib diisi}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY wajib diisi}"
FILE="${1:?Pakai: restore-db.sh <file.sql.enc>}"

if [ ! -f "$FILE" ]; then
  echo "Berkas backup tidak ditemukan: $FILE" >&2
  exit 1
fi

openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "$FILE" | psql "$DATABASE_URL"

echo "Restore selesai dari $FILE"
