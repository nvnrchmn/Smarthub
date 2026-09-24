# Status Kontrak Hub (dipakai SmartHub)

| Atribut | Nilai |
|---|---|
| Nama Dokumen | Status Kontrak Logikraf Payment Hub |
| Versi | 2.0 |
| Tanggal | 2026-09-24 |
| Status | **Terverifikasi terhadap kode Go Hub (`LogikaKreatifIndonesia`) + endpoint sub-akun baru** |
| Bukti uji | `apps/api/tests/hub-contract.test.ts`, `apps/api/tests/hub-resilience.test.ts` |
| Sumber | Kode Go Hub (`logikraf-v2/…/handler/client_store_*`, `cmd/server/main.go`) · `docs/plans/kyc-payout-plan.md` Bab 4 |

## 0. Deployment (live)

| Komponen | URL |
|---|---|
| Hub (LogikaKreatifIndonesia) | `https://logikraf.id` |
| Callback Xendit → Hub | `https://logikraf.id/api/webhooks/xendit` (invoice) dan `/api/webhooks/xendit/qris` |
| SmartHub | `https://smarthub.logikraf.id` |
| Webhook Hub → SmartHub (store `WebhookURL`) | `https://smarthub.logikraf.id/api/v1/billing/webhook` |
| Internal Finance API Hub → SmartHub | `https://smarthub.logikraf.id/api/v1/internal/*` |
| Master account Xendit | XenPlatform **MANAGED**; setiap tenant = sub-akun `INDIVIDUAL` (`for-user-id`) |

> **Koreksi penting (v2).** Versi 1.0 dokumen ini memakai `/client-store/*` dan header
> `X-Logikraf-Internal-Key`. Implementasi **Go Hub yang live** memakai path
> `/api/client-store-*` dan header **`X-Internal-Key`**. Endpoint sub-akun per tenant
> (akun/KYC/saldo/payout) ditambahkan di branch `feature/client-store-subaccounts-kyc-payout`
> pada repo Hub agar arsitektur "Logikraf = master Xendit, tenant = sub-akun" berjalan.

## 1. Mekanisme panggilan (terkunci)

| Hal | Nilai |
|---|---|
| Auth keluar (client store → Hub) | Header **`X-Internal-Key`** (milik ClientStore) |
| Auth masuk (Hub → SmartHub Internal Finance) | Header **`X-Internal-Key`** |
| Tanda tangan webhook | `X-Logikraf-Signature-Hmac` = HMAC-SHA256(raw body, `LOGIKRAF_HUB_WEBHOOK_SECRET`); `X-Logikraf-Signature` = shared secret mentah (kompatibilitas lama) |
| Konteks webhook | `X-Logikraf-Store`, `X-Logikraf-Tenant-Ref` |
| Timeout | `LOGIKRAF_HUB_TIMEOUT_MS` (default 10.000 ms) via `AbortController` |
| Retry | `LOGIKRAF_HUB_RETRY` (default 2×) hanya untuk 5xx/408/429/timeout; 4xx tidak diulang |
| Penelusuran | `X-Correlation-Id` per panggilan |
| Idempotensi payout | `Idempotency-Key` = `sb-pencairan-<id_pencairan>` + `external_id` sama |
| Idempotensi POST lain | akun → email; QRIS → `external_id`; KYC → `for_user_id`; unggah → SHA-256 isi berkas |
| Prefix transaksi | `sb-` (wajib cocok `ClientStore.ExtPrefix` Hub) |

## 2. Endpoint yang dikirim klien (terkunci test)

| Fungsi | Method & path | Catatan |
|---|---|---|
| `hubCreateQris` | `POST /api/client-store-qris` | body `{external_id, amount, description, expires_in_minutes?, account_id?, tenant_ref?}`; balasan `reference_id` |
| `hubGetQris` | `GET /api/payment/qris/{reference_id}` | status QRIS |
| `hubCreateAccount` | `POST /api/client-store/accounts` | body `{tenant_ref, legal_name, email, entity_type}`; Hub membuat sub-akun via Xendit `POST /v3/accounts` (`ID`/`INDIVIDUAL`) |
| `hubGetAccount` | `GET /api/client-store/accounts/{id}` atau `?tenant_ref=` | — |
| `hubGetBalance` | `GET /api/client-store/balance?account_id={id}` | saldo sub-akun |
| `hubGetAgreement` | `GET /api/client-store/agreement` | naskah perjanjian `{version, text, hash}` |
| `hubUploadKycFile` | `POST /api/client-store/kyc/files` | multipart `purpose=KYC_DOCUMENT` + `account_id` + `file` |
| `hubSubmitKyc` | `POST /api/client-store/kyc/submit` | payload KYC + `for_user_id` + `consent` clickwrap |
| `hubCreatePayout` | `POST /api/client-store/payouts` | + header `Idempotency-Key`; `recipient` |
| `hubGetPayout` | `GET /api/client-store/payouts/{id}` | `id` = provider id / `external_id` |

## 3. Webhook Hub → SmartHub

Hub meneruskan **payload Xendit mentah** (bukan `{event_id,type,data}`). SmartHub
menormalkannya (`packages/shared/src/schemas/billing.ts`):

| Bentuk masuk | Contoh | Normalisasi |
|---|---|---|
| Invoice (flat) | `{id, external_id, status:"PAID", amount, metadata}` | `type = payment.succeeded` |
| Payment request | `{event:"payment_request.succeeded", data:{reference_id, status}}` | `type = payment.succeeded` |
| Payout v3 | `{event:"v3_payout.succeeded", data:{reference_id, status}}` | `type = payout` |
| Akun XenPlatform | `{event:"account.verification", business_id, data:{status}}` | `type = account.verification` |

`event_id` = `id` (invoice) atau `data.id` (payment request) untuk idempotensi.

### Service agreement (clickwrap)

Sesuai email Xendit (24 Sep 2026), tidak ada template wajib — yang penting **bukti
persetujuan tenant**. Hub menggenerate PDF otomatis berisi identitas, waktu, IP,
User-Agent, Log ID, hash naskah, dan naskah penuh; diunggah ke `POST /files`, lalu
`file_id`-nya dilampirkan sebagai `service_agreement_document` pada
`POST /account_verification`. SmartHub mengambil naskah via `GET /api/client-store/agreement`
dan mengirim blok `consent` (`version, hash, agreed_at, ip, user_agent, log_id, signer_name`);
versi/hash di luar naskah berlaku ditolak `422`. Naskah Hub: `agreement_v1.md`.

## 4. Yang ditambahkan di repo Hub (branch `feature/client-store-subaccounts-kyc-payout`)

- Model `ClientSubAccount` (store_id, tenant_ref, sub_account_id, status_kyc, kanal) + `Payout`.
- Handler `client_store_partner.go`: accounts, KYC files/submit, balance, payouts.
- `client_store_qris.go`: dukung `for-user-id` per tenant + simpan sub-akun di `QrisPayment`.
- Webhook: forward QRIS ke store, forward payout/akun ke store pemilik sub-akun,
  tambah header `X-Logikraf-Signature-Hmac` + `X-Logikraf-Tenant-Ref`.
- Dokumen `docs/payment-hub-integration-guide.md` diperbaiki (`X-Internal-Key`, HMAC, §9.4).

## 5. Item terbuka

| # | Item | Dampak |
|---|---|---|
| B1 | ~~Skema field `POST /account_verification`~~ → **selesai dipetakan** (`client_store_kyc_mapping.go`, uji `TestBuildAccountVerification`) | Nilai yang belum dikumpulkan UI (mobile, role, industry, registration/establishment) diambil dari env; validasi nilai final perlu 1× uji live |
| B2 | Bentuk `payment_channels` pada webhook akun | Guard kanal menerima boolean/string/objek/array (defensif) |
| B3 | Prefix `sb-` pada `ClientStore.ExtPrefix` Hub | QRIS/payout ditolak bila tidak cocok |
| B4 | `for-user-id` untuk balance/payout memerlukan money-out + RSA key | Payout gagal bila belum aktif |
| B5 | Status pembayaran QRIS `GET /api/payment/qris/:ref` untuk sub-akun | — |
