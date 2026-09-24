# Rencana Implementasi Modul KYC & Payout (XenPlatform via Logikraf Hub)

| Atribut | Nilai |
|---|---|
| Nama Dokumen | Rencana Implementasi KYC & Payout |
| Versi Dokumen | 1.0 |
| Tanggal | 2026-09-23 |
| Status | Fase 0–4 dikerjakan (2026-09-24); Fase 5 (pilot) menunggu kredensial & penyedia |
| Dokumen Terkait | `docs/kyc-payout-module-blueprint.md`, `docs/Architecture.md`, `docs/PRD.md`, `docs/API-Contract.md`, `docs/logikraf/payment-hub-integration-guide.md` |

## 0. Status pengerjaan (2026-09-24)

| Fase | Status | Bukti |
|---|---|---|
| Fase 0 — Kontrak & dokumen | **Selesai (dokumen)** | PRD 2.4, Architecture 2.4, API-Contract 2.2, UI-UX 1.3; fee flat Rp2.500; istilah netral. Kontrak Hub H1–H9/W1 tertulis di Bab 4 (belum diverifikasi ke tim Hub). |
| Fase 1 — Data & klien Hub | **Selesai** | Migrasi `20260924120000_kyc_payout` (+`…121000_kyc_draft_nullable`): `AkunPembayaranTenant` diperluas, `RekeningBankTenant`, `KycSubmission`, `PencairanTenant` diperluas; klien Hub diperluas + `LOGIKRAF_HUB_MOCK`. |
| Fase 2 — KYC | **Selesai (mock)** | Modul `kyc` (4 endpoint) + webhook `account.verification` + consent + service agreement (Hub) + notifikasi status. |
| Fase 3 — Rekening, saldo, payout | **Selesai (mock)** | `RekeningBankTenant` CRUD, `GET /billing/saldo`, payout via Hub + webhook `payout.*`, ledger flat fee. |
| Fase 4 — UI & notifikasi | **Selesai (inti)** | `/verifikasi`, `/pengaturan/rekening`, `/pencairan` (saldo + rekening), istilah netral. |
| Fase 5 — Pilot & hardening | **Belum** | Butuh kredensial Hub/penyedia, aktivasi kanal per sub-akun, dan tenant nyata (payout tidak dapat diuji di sandbox). |

**Terkendala/dependensi:** verifikasi kontrak H1–H9 ke tim Hub, field wajib `INDIVIDUAL` (ID) & template service agreement, aktivasi kanal pembayaran per sub-akun, dan uji payout nyata.

## 1. Keputusan yang sudah ditetapkan

1. **Batas integrasi = Logikraf Payment Hub.** Hanya Hub yang memegang `XENDIT_API_KEY` (Master Account Logikraf) dan bicara ke Xendit. SmartHub **tidak pernah** menyimpan secret Xendit dan **tidak** menerima webhook Xendit langsung.
2. **Fee platform = FLAT Rp2.500 per transaksi** (Opsi B). Dipotong saat pembayaran via **Split Rule** (`with-split-rule` + `for-user-id`), dirutekan ke Master Account (Logikraf). Payout menarik **saldo bersih** sub-akun. MDR/biaya kanal ditanggung sub-akun RT. **Konsekuensi:** kebijakan fee berubah dari `maksimum(Rp2.500, 3%)` (Opsi A) → **flat Rp2.500**; PRD Bab 4.3, Aturan Bisnis #16, UI-UX, dan API-Contract harus diperbarui.
3. **KYC mode `on_behalf` saja.** SmartHub mengumpulkan data + dokumen + consent, Hub mengirimkan atas nama tenant (`POST /account_verification` dengan `for-user-id`). Tidak memakai alur invite (`send_email_invite=false`).
4. **KYC dapat dikelola `Ketua_RT`, `Sekretaris`, atau `Bendahara`** (Bendahara yang mengelola keuangan boleh memverifikasi).
5. **Sub-akun bertipe `MANAGED`**, entitas **`INDIVIDUAL`** untuk RT/perorangan.
6. **Dokumen KYC tidak disimpan di SmartHub.** File diteruskan ke Hub → Xendit `POST /files` (`purpose=KYC_DOCUMENT`); SmartHub hanya menyimpan `file_id` + metadata.
7. **Tanpa brand Xendit di permukaan pengguna.** Seluruh teks UI/notifikasi memakai istilah netral (lihat §5.7); nama penyedia hanya boleh muncul di dokumen/kode internal Hub.
8. **`service_agreement_document` = Opsi A, dibuat Hub.** SmartHub mengirim record consent (timestamp, IP, user-agent, versi teks, nama penandatangan); **Hub men-generate PDF perjanjian** dan mengunggahnya sebagai `KYC_DOCUMENT`, lalu memakainya di `POST /account_verification`. SmartHub tidak menyimpan berkas.

## 2. Fakta dari Xendit (terverifikasi 2026-09-23)

Sumber: balasan Merchant Support tiket **#2737051** + dokumentasi resmi.

| Hal | Keterangan |
|---|---|
| Verify on Behalf | **Aktif otomatis** karena XenPlatform Logikraf sudah aktif |
| Sub-akun individual | Diizinkan sebagai `MANAGED`, pilih `entity_type: INDIVIDUAL` |
| Buat sub-akun | `POST /v3/accounts` — `name`, `email`, `identity{country_of_incorporation:"ID", entity_type:"INDIVIDUAL"}`, `configuration.webhooks.recipient` (`MASTER_ACCOUNT`/`SUB_ACCOUNT`) |
| Upload dokumen | `POST /files`, `purpose=KYC_DOCUMENT` (PDF/JPG/PNG) |
| Ajukan KYC | `POST /account_verification`, header `for-user-id: <business id sub-akun>` |
| Webhook verifikasi | `account.verification` → status `PENDING_VERIFICATION`, `VERIFICATION_IN_PROGRESS`, `AWAITING_RESUBMISSION`, `PASSED`, `FAILED` (+ `failure_reasons[]`); `PASSED` → sub-akun `LIVE` |
| Status sub-akun (v3) | `REGISTERED`, `AWAITING_DOCS`, `PENDING_VERIFICATION`, `AWAITING_RESUBMISSION`, `LIVE`, `DECLINED`, `DORMANT`, `SUSPENDED`, `CLOSED` |
| Payment method QRIS/VA | **Tidak otomatis aktif** setelah LIVE; Logikraf harus mengaktifkan per sub-akun via Dashboard/koordinasi Xendit (belum ada API massal) |
| Consent | Wajib. Dua jalur: (1) **invite** email ke tenant agar mengisi & menyetujui sendiri; (2) **verify on behalf** dengan `service_agreement_document` yang ditandatangani |
| KTP tenant | Harus **berbeda** dari KTP Master Account |
| Split payment | `POST /split_rules` (flat/percent, mata uang IDR dll). Diterapkan saat transaksi via header `with-split-rule` + `for-user-id`. **Split 100% gagal**; sisakan untuk fee. **Refund tidak mengembalikan split fee.** Ada webhook status split |
| Payout | `POST /v3/payouts` (header `api-version: 2025-09-01`, `idempotency-key`, permission **MONEY-OUT**, `for-user-id` sub-akun). Status: `ACCEPTED`, `REQUESTED`, `READY`, `ROUTING`, `LOCKED`, `PENDING_COMPLIANCE_REVIEW`, `SUCCEEDED`, `FAILED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `REVERSED`. IDR minor unit = 1 (tanpa desimal). Rekening tujuan dikirim inline (`account_details`) |
| Webhook Xendit | Header `X-CALLBACK-TOKEN`; retry hingga 6× exponential backoff |
| Sandbox | Sub-akun test langsung `LIVE`, `entity_type` **wajib `CORPORATION`**, `send_email_invite=false`, recipient `MASTER_ACCOUNT`; **payout tidak dapat diuji** |

## 3. Arsitektur akhir

```
Warga ─QRIS→ [Sub-akun RT (Xendit MANAGED)] ─payout→ Rekening RT
                     │  ▲
        with-split-rule│  │split fee → Master (Logikraf)
                     ▼  │
        ┌────────────────────────────┐
        │  Logikraf Payment Hub       │  pemegang XENDIT_API_KEY
        │  - accounts (v3)            │  + X-CALLBACK-TOKEN
        │  - files / account_verification
        │  - QRIS (for-user-id) + split
        │  - payout (for-user-id), balance
        │  - normalisasi webhook
        └───────────────▲─────────────┘
                        │ internal key + webhook HMAC (X-Logikraf-Signature)
        ┌───────────────┴─────────────┐
        │  SmartHub (SaaS multi-tenant)│
        │  - UI KYC, rekening, saldo,  │
        │    pencairan                 │
        │  - mirror status + ledger    │
        └──────────────────────────────┘
```

Prinsip: **satu secret Xendit**, **satu logika normalisasi webhook**, SmartHub tipis dan dapat diuji tanpa Xendit.

## 4. Kontrak Hub yang harus disepakati (Fase 0)

Semua endpoint Hub memakai kredensial internal **`X-Internal-Key`** (diverifikasi dari kode Go Hub), kecuali webhook satu arah Hub→SmartHub. Endpoint sub-akun per tenant sudah diimplementasikan di branch Hub `feature/client-store-subaccounts-kyc-payout`.

| # | Endpoint Hub (final) | Padanan Xendit | Dipakai SmartHub |
|---|---|---|---|
| H1 | `POST /api/client-store/accounts` | `POST /v2/accounts` (MANAGED) | Buat sub-akun per `tenant_ref` (legal_name, email, entity_type) |
| H2 | `GET /api/client-store/accounts/{id}` | `GET /v2/accounts/{id}` | Sinkron status KYC/akun |
| H3 | `POST /api/client-store/kyc/files` | `POST /files` | Unggah dokumen KYC, balikan `file_id` |
| H4 | `POST /api/client-store/kyc/submit` | `POST /account_verification` | Kirim data KYC + `file_id` + consent via `for-user-id` |
| H5 | `POST /api/client-store-qris` | Payment Request QRIS + `for-user-id` | Buat QRIS iuran atas nama sub-akun tenant |
| H6 | `GET /api/client-store/balance?account_id=` | Balance sub-akun | Saldo tersedia |
| H7 | `POST /api/client-store/payouts` | `POST /v3/payouts` | Pencairan ke rekening RT (`Idempotency-Key`) |
| H8 | `GET /api/client-store/payouts/{id}` | `GET /v3/payouts/{id}` | Detail/status payout |
| H9 | `POST /api/client-store/bank-accounts` (opsional) | Withdrawal bank account | Belum diimplementasikan |
| W1 | Webhook Hub→SmartHub | payload Xendit mentah: akun, payout, pembayaran QRIS/invoice | Normalisasi di SmartHub; HMAC `X-Logikraf-Signature-Hmac` (+ `X-Logikraf-Tenant-Ref`) |

**Kontrak data yang harus diputuskan bersama Hub:** bentuk payload H4 untuk `INDIVIDUAL` (field wajib ID individual masih perlu dipastikan, mis. `business_legal_name`, `business_description`, `business_intents`, `business_source_of_funds`, alamat, `authorized_person_*`, `ID_NATIONAL_ID_KTP` depan+belakang, selfie), format pemetaan status, dan skema retry webhook.

## 5. Perubahan di SmartHub

### 5.1 Model & migrasi (Prisma, ikut konvensi repo)

| Model | Aksi | Isi |
|---|---|---|
| `AkunPembayaranTenant` | Perluas (menggantikan catatan "KYC di portal partner") | `xendit_account_id` (sudah), `status_kyc`, `entity_type`, `money_out_enabled`, `payment_channels_aktif` (bool/JSON), `kyc_submitted_at`, `kyc_verified_at`, `failure_reasons` |
| `RekeningBankTenant` | **Baru** | `id_tenant`, `bank_code`, `bank_name`, `account_number`, `account_holder`, `is_default`, `status_verifikasi` |
| `KycSubmission` | **Baru** (metadata, tanpa file) | `id_tenant`, `entity_type`, `legal_name`, `email`, `ktp_number` (masked/hash), `dob`, `gender`, `nationality`, `address` (Json), `file_ids` (Json), `status`, `failure_reasons` (Json), `consent` (timestamp/IP/user-agent), `service_agreement_file_id` |
| `PencairanTenant` | Perluas | tambah `xendit_payout_id`, `failure_code`, `failure_reason`, `id_rekening`, `metode`; status `MENUNGGU/PROCESSING/SELESAI/GAGAL/DIBATALKAN` |
| `WebhookEvent` | Pakai ulang | idempotensi event Hub (termasuk `account.verification`, `payout.*`, `split.*`) |
| `LedgerTransaksi`/`LedgerEntry` | Pakai ulang | Jurnal QRIS + split fee + payout |

Catatan: **jangan** membuat tabel bernama `smarthub_*` seperti di blueprint; gunakan penamaan Prisma yang sudah ada.

### 5.2 Modul API

- **Modul `kyc` (baru):**
  - `GET /api/v1/kyc` — status KYC tenant (mirror)
  - `POST /api/v1/kyc/initiate` — kirim data + consent (+ buat sub-akun bila belum ada) → H1/H4
  - `POST /api/v1/kyc/dokumen` — multipart → H3 (tidak disimpan di SmartHub)
  - `POST /api/v1/kyc/submit` — kirim KYC + service agreement → H4
  - RBAC: `Ketua_RT`, `Sekretaris`, `Bendahara`
- **Modul `billing` (diperluas):**
  - `GET /billing/saldo` → H6
  - `GET/POST/PATCH/DELETE /billing/rekening` → `RekeningBankTenant` (+ H9 bila ada)
  - `POST /billing/pencairan` (sudah ada) → H7; `GET /billing/pencairan` (sudah ada)
  - `POST /billing/webhook` (sudah ada) → tambah tipe `account.verification`, `payout.*`, `split.*`
- **Internal Finance API (sudah ada):** tetap untuk settlement Hub.

### 5.3 Webhook & status mapping

`account.verification` (Xendit→Hub→SmartHub):

| Xendit | SmartHub `status_kyc` |
|---|---|
| `PENDING_VERIFICATION` | `PENDING_VERIFICATION` |
| `VERIFICATION_IN_PROGRESS` | `VERIFICATION_IN_PROGRESS` |
| `AWAITING_RESUBMISSION` | `AWAITING_RESUBMISSION` (+ `failure_reasons`) |
| `PASSED` | `LIVE` |
| `FAILED` | `DECLINED` |

`payout.*` (Xendit→Hub→SmartHub):

| Xendit | SmartHub |
|---|---|
| `ACCEPTED`, `REQUESTED`, `READY`, `LOCKED`, `PENDING_COMPLIANCE_REVIEW` | `MENUNGGU` |
| `ROUTING` | `PROCESSING` |
| `SUCCEEDED` | `SELESAI` |
| `FAILED`, `REJECTED`, `EXPIRED`, `REVERSED` | `GAGAL` (+ `failure_code`) |
| `CANCELLED` | `DIBATALKAN` |

### 5.4 Fee split — DIPUTUSKAN: flat Rp2.500

- **Split Rule:** satu rule `flat` **Rp2.500** tujuan Master Account (Logikraf), diterapkan pada transaksi QRIS iuran (`with-split-rule` + `for-user-id` sub-akun).
- **MDR/biaya kanal** ditanggung sub-akun RT (otomatis dipotong dari saldo sub-akun). Fee yang diterima SmartHub = Rp2.500 flat.
- **Perubahan kode:** `hitungRincianBiaya` di `apps/api/src/config/hub.ts` saat ini memakai `maksimum(Rp2.500, 3%)` → ganti menjadi **flat Rp2.500**.
- **Perubahan dokumen:** PRD Bab 4.3 & Aturan Bisnis #16, `UI-UX-Design` (teks fee), dan `API-Contract` (contoh fee) harus diselaraskan ke flat Rp2.500.
- **Catatan Xendit:** **split 100% gagal** (sisakan untuk fee kanal), **refund tidak mengembalikan split fee**, dan kegagalan split menahan dana di sub-akun (perlu rekonsiliasi/transfer manual).

### 5.5 Worker & notifikasi

- Worker baru: `kyc-status-sync` (polling H2 sebagai fallback bila webhook hilang) + pemroses webhook `account.verification`/`payout.*` (idempoten via `WebhookEvent`).
- Notifikasi WA/email ke Ketua/Bendahara saat status KYC/ payout berubah (pakai outbox + worker notifikasi yang sudah ada).

### 5.6 UI (web)

- `/verifikasi` — wizard KYC (data diri → dokumen → service agreement → consent → submit) + status & alasan perbaikan.
- `/pencairan` — tambah: saldo tersedia, rekening tujuan, form tarik saldo, riwayat (perluas halaman yang sudah ada).
- `/pengaturan/rekening` — CRUD rekening bank.
- Dashboard: kartu status verifikasi + saldo + tombol "Tarik Saldo".

### 5.7 Istilah UI (tanpa brand penyedia)

Nama penyedia pembayaran **tidak boleh muncul** di UI, notifikasi, atau pesan error yang dilihat pengguna. Gunakan istilah netral:

| Internal (kode/Hub) | Istilah UI/notifikasi |
|---|---|
| Xendit / XenPlatform | (tidak disebut) |
| KYC / account_verification | **Verifikasi Identitas** |
| Sub-account | **Akun Pembayaran RT** |
| Split rule / fee | **Biaya layanan** |
| Payout | **Pencairan Dana** |
| Bank account | **Rekening Pencairan** |
| `AWAITING_RESUBMISSION` | "Perlu perbaikan data" |
| `LIVE` | "Terverifikasi" |
| `DECLINED` | "Verifikasi gagal" |

Pesan error dari penyedia diterjemahkan ke bahasa netral di Hub/SmartHub (jangan teruskan `error_code`/nama vendor mentah ke pengguna).

### 5.8 Consent & `service_agreement_document`

- **Checkbox tidak cukup untuk API.** Xendit meminta **berkas** (`file_id` dari `POST /files`, `purpose=KYC_DOCUMENT`; format PDF/JPG/PNG). Checkbox hanya sah sebagai **UX pengumpulan consent**.
- Pada mode **on-behalf tanpa invite**, bukti persetujuan harus dilampirkan sebagai `service_agreement_document`.
- **DIPUTUSKAN (Opsi A):** UX = checkbox (+ ketik nama) → **Hub men-generate PDF** agreement dari record consent, mengunggahnya (`purpose=KYC_DOCUMENT`), dan memakainya sebagai `service_agreement_document` saat submit. SmartHub **tidak** menghasilkan/menyimpan berkas.
- SmartHub menyimpan hanya `file_id` + record consent: timestamp, IP, user-agent, versi teks perjanjian, dan nama penandatangan.

## 6. Fase implementasi

### Fase 0 — Kontrak & dokumen (1 minggu)
- Sepakati endpoint H1–H9 + format webhook W1 dengan tim Hub, termasuk **payload consent untuk H4** dan template PDF `service_agreement_document` yang dibuat Hub.
- Selaraskan `PRD`, `Architecture`, `API-Contract`, `UI-UX`: **KYC kembali ke SmartHub (mode on-behalf)**, payout/rekening/saldo masuk, "KYC dihapus" dicabut, **fee berubah ke flat Rp2.500**, dan tegaskan Hub-only (tanpa secret Xendit di SmartHub).
- Audit istilah: hilangkan brand penyedia dari UI/notifikasi/error dan ganti dengan istilah netral (§5.7).
- Terima: dokumen tidak lagi bertentangan; kontrak Hub tertulis; kebijakan fee flat Rp2.500 konsisten di semua dokumen.

### Fase 1 — Data & klien Hub (1 minggu)
- Migrasi Prisma (§5.1) + klien Hub (`config/hub.ts` diperluas) + tipe shared.
- Terima: `pnpm -r typecheck/lint/test` hijau; migrasi jalan di dev/test.

### Fase 2 — KYC (2 minggu)
- Modul `kyc` + webhook `account.verification` + consent + service agreement + notifikasi.
- Terima: alur KYC end-to-end lolos di mode mock Hub; status berubah via webhook; dokumen tidak tersimpan di DB SmartHub.

### Fase 3 — Rekening, saldo, payout (2 minggu)
- `RekeningBankTenant` CRUD, `GET /billing/saldo` (H6), payout (H7/H8) + webhook `payout.*`; perluas `PencairanTenant`; ledger & split fee.
- Terima: pengajuan payout → status → webhook; saldo tampil; ledger seimbang & rekonsiliasi seimbang.

### Fase 4 — UI & notifikasi (1 minggu)
- Wizard **Verifikasi Identitas**, halaman **Rekening Pencairan**, halaman **Pencairan Dana** + saldo, kartu dashboard, notifikasi perubahan status — **semua memakai istilah netral (§5.7)**.
- Terima: jalur pengguna lengkap dari verifikasi sampai pencairan berhasil (mode mock); tidak ada nama penyedia di UI.

### Fase 5 — Pilot & hardening (1 minggu)
- 1–2 tenant nyata (payout tidak dapat diuji di sandbox), monitoring, audit, dokumentasi final.
- Terima: KYC LIVE, QRIS aktif, payout pertama berhasil, laporan rekonsiliasi bersih.

## 7. Risiko & item terbuka

1. **`service_agreement_document`** — **selesai:** Opsi A, dibuat Hub dari record consent (§5.8). Sisa: konfirmasi ke Hub **field wajib `INDIVIDUAL` (ID)** dan template teks perjanjian yang dipakai Hub.
2. **Aktivasi QRIS/VA per sub-akun manual** — butuh langkah operasional Logikraf; tandai status "kanal belum aktif" di UI dan checklist ops.
3. **Sandbox tidak bisa uji payout** dan sub-akun test dipaksa `CORPORATION` → butuh Hub mock + pilot nyata.
4. **Split fee** — flat Rp2.500; split gagal menahan dana di sub-akun (rekonsiliasi/transfer manual); refund tidak mengembalikan split fee.
5. **Data sensitif** — jangan pernah kirim KTP/selfie/NPWP via email/log; file hanya lewat Hub→Xendit; simpan `file_id`/metadata; nomor KTP di `KycSubmission` di-hash/mask.
6. **KTP tenant ≠ KTP Master** — validasi/peringatan saat onboarding.
7. **Branding** — audit teks agar nama penyedia tidak bocor ke UI/notifikasi/error (termasuk komentar model `AkunPembayaranTenant` yang kini usang).
8. **Legal** — opini hukum aliran dana & KYC/PDP tetap prasyarat go-live.

## 8. Yang TIDAK dikerjakan
- Menyimpan secret Xendit di SmartHub.
- Menerima webhook Xendit langsung di SmartHub.
- Menyimpan file KTP/selfie/NPWP di DB/disk SmartHub.
- Tabel `smarthub_*` dengan penamaan terpisah dari skema Prisma.
