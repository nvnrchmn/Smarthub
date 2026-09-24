# Audit Keamanan Ringan — Hardening KYC/Payout (Tahap G-F)

| Atribut | Nilai |
|---|---|
| Nama Dokumen | Temuan Audit Keamanan Ringan |
| Versi | 1.0 |
| Tanggal | 2026-09-24 |
| Lingkup | Modul `kyc`, `billing`, klien `config/hub.ts`, unggahan dokumen, log |
| Metode | Pembacaan kode + uji negatif otomatis (`tests/kyc-security.test.ts`, `tests/hub-resilience.test.ts`, `tests/billing-hardening.test.ts`) |

> Audit ringan ini **bukan** uji penetrasi. Fokus: PII di log/pesan error, batas unggahan, rate limit, dan kebocoran kredensial. Uji penetrasi penuh tetap prasyarat go-live komersial.

## Temuan & perbaikan

| # | Temuan | Risiko | Perbaikan | Bukti |
|---|---|---|---|---|
| A1 | Pesan error Hub sebelumnya menyertakan **payload JSON mentah** (bisa memuat nama penyedia/data) | Kebocoran informasi ke pengguna | `HubApiError` menyimpan `statusCode`/`code` terpisah; `message` selalu netral (`Hub menolak permintaan (4xx)`), payload hanya untuk log internal | `tests/hub-resilience.test.ts` (pesan tidak memuat `XENDIT`/payload) |
| A2 | Log panggilan Hub berpotensi memuat payload/NIK | Kebocoran PII | Log hanya `path`, `method`, `status`, `percobaan`, `correlationId` | `config/hub.ts` (`logGagal`, `logger.debug`) |
| A3 | Tidak ada timeout → permintaan menggantung | DoS internal / worker macet | `AbortController` + `LOGIKRAF_HUB_TIMEOUT_MS` (default 10 dtk) | `tests/hub-resilience.test.ts` (timeout→retry) |
| A4 | Retry bisa menggandakan operasi tulis | Payout/QRIS dobel | Retry hanya 5xx/timeout; `Idempotency-Key` stabil (payout `sb-pencairan-<id>`, QRIS `external_id`, akun email, KYC `for_user_id`, unggah SHA-256) | `tests/hub-contract.test.ts`, `tests/billing-hardening.test.ts` |
| A5 | Retry pada `4xx` memboroskan kuota & menyamarkan error | Beban & diagnosa | 4xx tidak diulang; hanya 5xx/408/429/timeout | `tests/hub-resilience.test.ts` |
| A6 | `kyc/*` hanya mengandalkan limit global `/api/v1` | Penyalahgunaan unggahan | Rate limit khusus: `initiate`/`submit` 10/menit, `dokumen` 20/menit | `kyc.routes.ts` |
| A7 | Unggahan tanpa uji negatif | Berkas berbahaya/oversize lolos | Tipe diizinkan (JPG/PNG/WEBP/PDF) + batas `MAX_UPLOAD_SIZE_MB`; uji negatif | `tests/kyc-security.test.ts` (422 tipe & ukuran, 401 tanpa token) |
| A8 | Header auth masuk tidak selaras dengan panduan Hub | Integrasi gagal / bypass | Terima `X-Logikraf-Internal-Key` (utama) + varian lama; constant-time compare | `internal-auth.middleware.ts`, `verifyInternalKey` |
| A9 | Status payout final bisa mundur oleh event tertunda | Status salah | Status `SELESAI/GAGAL/DIBATALKAN` tidak dimundurkan | `tests/billing-hardening.test.ts` |
| A10 | `payment_channels` tidak ditegakkan | QRIS gagal di produksi | Guard kanal + status `kanal_qris_aktif`; pesan netral | `tests/billing-hardening.test.ts` |

## Tidak dilakukan (sesuai larangan)

- Menyimpan secret penyedia di SmartHub (tidak ada).
- Menerima webhook penyedia langsung di SmartHub (hanya Hub).
- Menyimpan berkas KTP/selfie di DB/disk SmartHub (hanya `file_id` + metadata).
- Menampilkan nama penyedia di UI/notifikasi/pesan error.

## Sisa risiko (diterima untuk pilot)

| Risiko | Mitigasi |
|---|---|
| Rate limit in-memory (tidak lintas instance) | Cukup untuk pilot 1 instance; Redis saat multi-instance |
| Log pino tanpa retensi/redaksi terpusat | Tidak mencetak PII; tracing/error-tracking di Milestone 5 |
| Belum ada uji penetrasi penuh | Dijadwalkan sebelum go-live komersial (Architecture Lampiran B.3) |
