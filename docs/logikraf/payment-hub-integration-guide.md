# Panduan Integrasi Logikraf Payment Hub untuk Produk SaaS

> **Dokumen Platform Logikraf — salinan lokal.**
> Menjelaskan cara mengintegrasikan produk SaaS (mis. **SmartHub v1**) ke dalam **Logikraf Payment Hub** — sistem pembayaran terpusat yang dikelola oleh PT Logika Kreatif Indonesia.
> Salinan ini disimpan di repo SmartHub untuk memudahkan pengembangan. **Sumber kebenaran tetap di tim Logikraf**; perubahan lokal dapat tertimpa versi pusat.

| Atribut | Nilai |
|---|---|
| Pemilik dokumen | Tim Logikraf (platform) |
| Versi | 1.1 |
| Terakhir diperbarui | 2026-09-22 |
| Salinan disimpan | Repo SmartHub v1 — `docs/logikraf/` |
| Audience | Developer produk SaaS di bawah naungan Logikraf |

> **Catatan penamaan stack.** Dokumen ini menyebut "Smarthub V3" pada beberapa contoh. Untuk repo ini, produk yang berlaku adalah **SmartHub v1** (Node 22 + Express 5 + Prisma + Next.js 15). **Jangan** memakai contoh stack lama (Hono/Bun/Drizzle) sebagai acuan implementasi — padanan Express/Prisma-nya ada di `docs/logikraf/notifications-architecture.md` bab 6.

> **Peringatan kepala untuk SmartHub.** Repo SmartHub **tidak boleh memegang API key Xendit**. Semua pembayaran lewat Hub, dan webhook yang masuk ke SmartHub **berasal dari Hub** (ditandatangani `X-Logikraf-Signature`), bukan dari Xendit.

---

## Daftar Isi

1. [Arsitektur Sistem](#1-arsitektur-sistem)
2. [Prasyarat & Registrasi](#2-prasyarat--registrasi)
3. [Autentikasi & Keamanan](#3-autentikasi--keamanan)
4. [Membuat Invoice (Checkout)](#4-membuat-invoice-checkout)
5. [QRIS Payment Request](#5-qris-payment-request)
6. [Webhook & Callback](#6-webhook--callback)
7. [Settlement & Pencairan Dana](#7-settlement--pencairan-dana)
8. [Platform Fee Engine](#8-platform-fee-engine)
9. [XenPlatform Managed Sub-Account](#9-xenplatform-managed-sub-account)
10. [Multi-Tenant Pattern (Smarthub)](#10-multi-tenant-pattern-smarthub)
11. [Best Practices & Pitfalls](#11-best-practices--pitfalls)
12. [Contoh Implementasi Lengkap](#12-contoh-implementasi-lengkap)
13. [Checklist Go-Live](#13-checklist-go-live)

---

## 1. Arsitektur Sistem

### Single-Door Architecture

Logikraf menggunakan **arsitektur satu pintu** (single-door) untuk semua pembayaran:

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOGIKRAF PAYMENT HUB                         │
│                   (logikraf.id/logikraf-v2)                     │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Invoice   │  │    QRIS     │  │      Settlement         │ │
│  │   Engine    │  │   Engine    │  │      (Payout)           │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│  ┌──────┴────────────────┴──────────────────────┴─────────────┐ │
│  │              Xendit API (Verified Account)                  │ │
│  │         — One account, one webhook endpoint —               │ │
│  └─────────────────────────┬───────────────────────────────────┘ │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐
        │ MysticGlide│  │  Smarthub │  │  Store Lain│
        │  (MG)      │  │   (SB)    │  │            │
        └───────────┘  └───────────┘  └───────────┘
```

### Prinsip Utama

| Prinsip | Penjelasan |
|---------|------------|
| **Satu Key Xendit** | Seluruh ekosistem menggunakan satu API key Xendit milik Logikraf. Client app TIDAK PERNAH memegang key Xendit. |
| **Satu Webhook** | Semua callback Xendit masuk ke `https://logikraf.id/api/webhooks/xendit`, lalu di-route ke client store berdasarkan `external_id` prefix. |
| **Prefix Routing** | Setiap client store punya prefix unik (mis. `mg-`, `sb-`) untuk membedakan transaksi. |
| **Internal Auth** | Client app dan Hub saling autentikasi via header **`X-Internal-Key`** (symmetric secret). Ini header yang dipakai kode Go Hub yang live; `X-Internal-Key` pada revisi dokumen sebelumnya **tidak dipakai**. |

---

## 2. Prasyarat & Registrasi

### 2.1 Registrasi Client Store

Sebelum bisa menerima pembayaran, produk SaaS Anda harus terdaftar sebagai **Client Store** di dashboard Admin Logikraf:

1. Login ke `https://logikraf.id/admin`
2. Buka menu **Payment Hub** → **Client Stores**
3. Klik **[+ Tambah Client]**
4. Isi:
   - **Nama:** Nama produk (mis. "Smarthub V3")
   - **Prefix:** Kode unik (mis. `sb-`)
   - **Webhook URL:** Endpoint callback di app Anda (mis. `https://smarthub.logikraf.id/api/v1/billing/webhook/logikraf`). Sebaiknya **jangan** memakai nama `xendit`, karena pengirimnya adalah Hub.
5. **Internal Key** akan auto-generate (hex 24 byte). Simpan aman di env Anda.

### 2.2 Environment Variables

Tambahkan variabel berikut ke `.env` atau systemd `EnvironmentFile` aplikasi Anda:

```bash
# Payment Hub
LOGIKRAF_HUB_URL=https://logikraf.id
LOGIKRAF_INTERNAL_KEY=<internal-key-dari-dashboard>

# Opsional: fallback langsung ke Xendit (dev only, jangan di production)
# XENDIT_API_KEY=
# XENDIT_CALLBACK_TOKEN=
```

> ⚠️ **Jangan pernah hardcode key di source code.** Selalu via environment variables.

---

## 3. Autentikasi & Keamanan

### 3.1 Header Autentikasi

Setiap request ke Payment Hub harus menyertakan header:

```http
X-Internal-Key: <your-internal-key>
Content-Type: application/json
```

### 3.2 Verifikasi Webhook Signature

Saat Logikraf meneruskan webhook ke app Anda, ia menyertakan header:

```http
X-Logikraf-Signature: <hmac-sha256-payload>
```

App Anda **WAJIB** memverifikasi signature ini untuk memastikan payload berasal dari Logikraf:

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;

  const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');

  // timingSafeEqual MELEMPAR EXCEPTION bila panjang buffer berbeda,
  // sehingga panjang harus diperiksa lebih dulu (juga menutup DoS dari signature cacat).
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
```

> Fungsi ini identik dengan yang dipakai pada contoh webhook handler di §12.2. Gunakan **satu** implementasi yang sama di seluruh aplikasi; jangan menyalin versi berbeda.

### 3.3 Constant-Time Comparison

Selalu gunakan constant-time comparison untuk membandingkan key/signature (tahan timing attack):

```go
import "crypto/subtle"

func VerifyInternalKey(provided, expected string) bool {
    return subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) == 1
}
```

---

## 4. Membuat Invoice (Checkout)

### 4.1 Endpoint

```http
POST https://logikraf.id/api/client-store-invoices
```

### 4.2 Request Body

```json
{
  "external_id": "SB-INV-20260922-001",
  "amount": 150000,
  "payer_email": "warga@rt05.id",
  "given_names": "Budi Santoso",
  "description": "Iuran Bulan September 2026 - RT 05/RW 03",
  "success_redirect_url": "https://smarthub.logikraf.id/payment/success",
  "failure_redirect_url": "https://smarthub.logikraf.id/payment/failed",
  "metadata": {
    "product_subtotal": 150000,
    "store": "smarthub",
    "tenant_id": "tenant-abc-123"
  }
}
```

### 4.3 Validasi

| Field | Aturan |
|-------|--------|
| `external_id` | Harus diawali prefix store (case-insensitive). Untuk Smarthub: `sb-` |
| `amount` | Minimal Rp 1.000 |
| `amount` (kanal QRIS) | **Maksimum Rp 10.000.000** — batas kanal QRIS Xendit. Di atas itu transaksi akan ditolak; pecah tagihan atau pakai kanal lain |
| `metadata.product_subtotal` | Opsional. Digunakan untuk menghitung platform fee (basis = subtotal produk, bukan ongkir) |

### 4.4 Response (201 Created)

```json
{
  "id": "5f7b2c3a1d4e5f6a7b8c9d0e",
  "external_id": "SB-INV-20260922-001",
  "invoice_url": "https://checkout.xendit.co/web/5f7b2c3a1d4e5f6a7b8c9d0e",
  "amount": 150000,
  "status": "PENDING",
  "expiry_date": "2026-09-23T10:00:00.000Z"
}
```

### 4.5 Redirect User

Setelah mendapat `invoice_url`, redirect user ke sana:

```typescript
// Frontend (React)
window.location.href = response.invoice_url;
```

---

## 5. QRIS Payment Request

### 5.1 Endpoint

```http
POST https://logikraf.id/api/client-store-qris
```

### 5.2 Request Body

```json
{
  "external_id": "SB-QRIS-20260922-001",
  "amount": 75000,
  "description": "Iuran Bulan September 2026"
}
```

### 5.3 Response (201 Created)

```json
{
  "reference_id": "SB-QRIS-20260922-001",
  "external_id": "SB-QRIS-20260922-001",
  "qr_string": "000201010212...<EMV QR string panjang>",
  "amount": 75000,
  "expires_at": "2026-09-22T11:00:00.000Z",
  "simulate_allowed": false,
  "store": {
    "name": "Smarthub V3",
    "prefix": "sb-"
  }
}
```

### 5.4 Cek Status QRIS

```http
GET https://logikraf.id/api/payment/qris/:reference_id
```

Response:

```json
{
  "reference_id": "SB-QRIS-20260922-001",
  "status": "UNPAID",
  "amount": 75000,
  "paid_at": null
}
```

### 5.5 SSE Stream (Real-time Status)

```http
GET https://logikraf.id/api/payment/qris/:reference_id/stream
```

> ⚠️ **Endpoint ini tidak boleh dipanggil langsung dari browser.** `EventSource` **tidak dapat mengirim header kustom**, sedangkan semua endpoint Hub memerlukan `X-Internal-Key`. Selain itu memaparkan internal key ke browser berarti membocorkan kredensial platform.
>
> **Pola yang benar:** stream diteruskan lewat **backend aplikasi** (proxy). Browser memanggil endpoint milik aplikasi sendiri; backend menambahkan header internal lalu meneruskan stream. Contoh path relatif di bawah **hanya benar** jika endpoint tersebut ada di aplikasi Anda, bukan di Hub.

Contoh proxy di backend aplikasi (Express/Node — SmartHub v1):

```typescript
// apps/api/src/modules/billing/billing.routes.ts (TARGET)
billingRouter.get('/qris/:reference_id/stream', authenticate, async (req, res) => {
  const upstream = await fetch(
    `${env.LOGIKRAF_HUB_URL}/api/payment/qris/${req.params.reference_id}/stream`,
    {
      headers: {
        'X-Internal-Key': env.LOGIKRAF_INTERNAL_KEY,
        Accept: 'text/event-stream',
      },
    },
  );

  if (!upstream.ok || !upstream.body) {
    res.status(upstream.status).json({ status: 'error', message: 'Gagal membuka stream status', errors: [] });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  upstream.body.pipe(res);
});
```

Baru setelah itu frontend boleh memakai `EventSource` ke endpoint aplikasi sendiri:

```typescript
// Web (Next.js) — memanggil BFF milik SmartHub, bukan Hub
const evtSource = new EventSource(`/api/bff/billing/qris/${refId}/stream`);
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.status === 'PAID' || data.status === 'SUCCEEDED') {
    evtSource.close();
    // Tetap tunggu webhook Hub sebagai sumber final (lihat §6.4)
  }
};
```

> SSE hanya untuk kenyamanan tampilan. **Status final tetap ditentukan oleh webhook Hub**, bukan oleh stream.

### 5.6 Simulate Payment (Test Mode Only)

```http
POST https://logikraf.id/api/payment/qris/:reference_id/simulate
```

> ⚠️ **Hanya berfungsi saat `QRIS_MODE=test` atau `QRIS_ALLOW_SIMULATE=true`.** Pastikan env production `QRIS_ALLOW_SIMULATE=false`.

---

## 6. Webhook & Callback

### 6.1 Alur Webhook

```
Xendit → logikraf.id/api/webhooks/xendit
            ↓
      Hub verifikasi X-Callback-Token
            ↓
      Cari client store by prefix (external_id)
            ↓
      Forward payload ke client webhook_url
            ↓
      Client app update order → PAID
```

### 6.2 Payload yang Diterima Client App

```json
{
  "event_id": "evt_5f7b2c3a1d4e5f6a7b8c9d0e",
  "id": "5f7b2c3a1d4e5f6a7b8c9d0e",
  "external_id": "SB-INV-20260922-001",
  "status": "PAID",
  "amount": 150000,
  "paid_at": "2026-09-22T10:15:30.000Z",
  "payment_id": "pay-abc-123",
  "fees_paid_amount": 3000,
  "metadata": {
    "product_subtotal": 150000,
    "store": "smarthub"
  }
}
```

Tipe TypeScript untuk payload di atas (gunakan ini, jangan `any`):

```typescript
export interface LogikrafWebhookPayload {
  /** Kunci idempotensi — WAJIB ada. Bila Hub belum mengirimkannya, minta ditambahkan. */
  event_id: string;
  /** ID transaksi internal Hub. */
  id: string;
  /** ID yang Anda kirim saat membuat transaksi, berprefix store (mis. `sb-`). */
  external_id: string;
  status: 'PAID' | 'SETTLED' | 'EXPIRED' | 'FAILED' | 'REFUNDED';
  amount: number;
  paid_at: string | null;
  payment_id?: string;
  /** Biaya penyedia yang dibebankan pada transaksi (MDR). */
  fees_paid_amount?: number;
  metadata?: Record<string, unknown>;
}
```


### 6.3 Implementasi Webhook Handler

> Contoh di bawah memakai Hono (stack lama). **Logikanya sama** untuk Express/Prisma di SmartHub v1 — yang penting: verifikasi signature dari raw body, catat `event_id` sebagai kunci idempotensi, dan pisahkan `PAID` dari `SETTLED`.
>
> Perhatikan juga penamaan path: webhook yang masuk ke aplikasi Anda berasal dari **Hub**, bukan dari Xendit langsung. Sebaiknya jangan menamainya `xendit` agar tidak menyesatkan.

```typescript
// Handler webhook dari Logikraf Hub
// verifySignature() ada di §3.2 — gunakan implementasi yang sama, jangan menyalin ulang.
app.post('/api/webhooks/logikraf-hub', async (c) => {
  const signature = c.req.header('X-Logikraf-Signature');
  const payload = await c.req.text(); // raw body, JANGAN di-parse lebih dulu

  // 1. Verifikasi signature atas raw body
  if (!signature || !verifySignature(payload, signature, process.env.LOGIKRAF_INTERNAL_KEY!)) {
    return c.json({ error: 'invalid signature' }, 401);
  }

  // 2. Parse setelah signature valid
  const body = JSON.parse(payload) as LogikrafWebhookPayload;

  // 3. Catat event_id (kunci idempotensi) — lihat §6.4
  const baru = await catatWebhookEvent(body.event_id, body.status, payload);
  if (!baru) {
    return c.json({ status: 'ignored', reason: 'duplicate_event' });
  }

  // 4. Tangani PAID dan SETTLED sebagai peristiwa berbeda
  if (body.status === 'PAID') {
    const updated = await db
      .update(orders)
      .set({
        status: 'paid',
        paid_at: new Date(body.paid_at),
        payment_fee: body.fees_paid_amount ?? 0,
        provider_ref: body.id,
      })
      .where(and(eq(orders.externalId, body.external_id), eq(orders.status, 'pending')))
      .returning();

    if (updated.length > 0) {
      await notifyWargaPaid(body.external_id);
    }
  } else if (body.status === 'SETTLED') {
    // Settlement TIDAK boleh menimpa status 'paid' dan tidak boleh dibuang sebagai duplikat
    await catatSettlement(body.external_id, body.paid_at);
  } else {
    return c.json({ status: 'ignored', reason: `status=${body.status}` });
  }

  return c.json({ status: 'processed' });
});
```

> **Catatan konsistensi contoh.** Revisi sebelumnya memakai `result.rowsAffected`, sementara contoh di §12.2 memakai `.returning()` + `result.length`. Keduanya adalah API yang berbeda; pada Drizzle gunakan `.returning()` dan periksa panjang array. Jangan mencampur keduanya.

### 6.4 Idempotency (Kritis!)

Webhook Hub (dan Xendit di baliknya) bisa dikirim berkali-kali, termasuk setelah aplikasi Anda sempat gagal merespons. Ada **dua lapis** pengamanan yang wajib dipasang:

**Lapis 1 — kunci event unik.** Simpan setiap event yang diterima pada tabel tersendiri dengan `event_id` **unik**, lalu lewati event yang sudah pernah diproses:

```sql
-- Wajib: constraint unik agar duplikat tertolak di level database
CREATE UNIQUE INDEX webhook_event_event_id_key ON webhook_event (event_id);

-- Catat event; bila konflik, berarti sudah pernah diterima → lewati
INSERT INTO webhook_event (event_id, tipe, payload, received_at)
VALUES (:event_id, :tipe, :payload, now())
ON CONFLICT (event_id) DO NOTHING;
```

**Lapis 2 — transisi status yang aman.** Update hanya dari status yang diharapkan:

```sql
-- Hanya ubah bila status masih pada tahap sebelumnya
UPDATE invoices
SET status = 'paid', paid_at = :paid_at, provider_ref = :provider_ref
WHERE external_id = :external_id AND status = 'pending';
```

Jika tidak ada baris terupdate → ini duplikat, abaikan dan tetap balas `200`.

**`PAID` dan `SETTLED` adalah dua peristiwa berbeda.** Jangan memperlakukannya sebagai satu status:

| Event | Arti | Tindakan |
|---|---|---|
| `PAID` | Dana diterima dari pembayar | Tandai tagihan **Lunas**, catat `fees_paid_amount`, kirim notifikasi |
| `SETTLED` | Dana selesai disettle ke saldo penerima | Catat **waktu & nilai settlement**; **jangan** menimpa status `paid` atau menolaknya sebagai duplikat |

Contoh kesalahan yang harus dihindari: handler memfilter hanya saat `status = 'pending'`, lalu menerima `SETTLED` setelah `PAID` dan membuangnya — akibatnya jejak settlement hilang dan rekonsiliasi tidak cocok. Simpan settlement sebagai kolom/event terpisah (mis. `settled_at`, `settled_amount`).

Balas selalu `200` untuk event yang sudah diproses agar Hub tidak mengulang pengiriman tanpa henti.

---

## 7. Settlement & Pencairan Dana

### 7.1 Arsitektur Settlement

```
Warga bayar → Dana masuk akun Logikraf (Xendit)
                    ↓
              Client app (Smarthub) mencatat revenue
                    ↓
              Owner lihat saldo di dashboard Smarthub
                    ↓
              Owner klik "Ajukan Pencairan"
                    ↓
              Logikraf transfer manual + upload bukti
                    ↓
              Owner download bukti di dashboard Smarthub
```

### 7.2 Internal Finance API (WAJIB disediakan Client App)

Client app harus expose endpoint berikut (di luar grup auth JWT):

```http
GET  /api/v1/internal/finance/summary
GET  /api/v1/internal/settlements
PATCH /api/v1/internal/settlements/:id/paid        (multipart: proof file)
PATCH /api/v1/internal/settlements/:id/processing
PATCH /api/v1/internal/settlements/:id/unlock
```

Semua endpoint diakses dengan header `X-Internal-Key`.

### 7.3 Finance Summary Response

```json
{
  "data": {
    "total_revenue": 15000000,
    "product_revenue": 14500000,
    "shipping_total": 500000,
    "pending_total": 2000000,
    "settled_total": 10000000,
    "outstanding": 3000000,
    "available_for_payout": 2500000,
    "xendit_fee_total": 300000,
    "net_revenue": 14700000
  }
}
```

### 7.4 Settlement Status Flow

```
PENDING → PROCESSING → PAID
   ↓          ↓
(dibatalkan) (gagal → unlock → PENDING)
```

| Status | Arti |
|--------|------|
| `pending` | Menunggu diproses Logikraf |
| `processing` | Sedang ditransfer (locked, tidak bisa dibatalkan) |
| `paid` | Dana sudah diterima owner + bukti tersedia |

---

## 8. Platform Fee Engine

### 8.1 Konsep

Logikraf mengenakan **biaya layanan platform** kepada client store:

| Komponen | Nilai (default) |
|----------|-----------------|
| Setup (sekali bayar) | Rp 1.500.000 |
| Biaya operasional bulanan | Rp 50.000 |
| Biaya layanan transaksi | 2% dari subtotal produk |
| Minimum bulanan | Rp 100.000 (3 bulan pertama dibebaskan) |
| Diskon volume | 1,5% (>Rp 25 jt/bln), 1% (>Rp 50 jt/bln) |

### 8.2 Cara Kerja

1. **Accrual:** Setiap transaksi PAID, hub otomatis mencatat fee ke tabel `platform_fees`.
2. **Basis fee:** `subtotal produk` (bukan ongkir). Kirim via `metadata.product_subtotal`.
3. **Rekap bulanan:** Fee transaksi + biaya operasional + minimum dihitung per bulan.
4. **Penagihan:**
   - **Mode Managed:** Fee dipotong otomatis saat pencairan dana.
   - **Mode LIVE:** Logikraf kirim invoice bulanan (jatuh tempo tgl 10).

### 8.3 Mengirim Product Subtotal

```json
{
  "external_id": "SB-INV-001",
  "amount": 160000,
  "metadata": {
    "product_subtotal": 150000,
    "shipping": 10000
  }
}
```

Fee 2% dihitung dari **150000** (bukan 160000).

### 8.4 Fee Reversal saat Refund

Jika order direfund, fee platform ikut dibalik:

```http
POST https://logikraf.id/api/client-store-fee-reverse
```

Body:

```json
{
  "external_id": "SB-INV-001"
}
```

> **Penting untuk rekonsiliasi.** Xendit **tidak** mengembalikan porsi split fee secara otomatis saat refund. Endpoint ini adalah **koreksi pembukuan di ledger Hub** (mengurangi akrual fee yang sudah tercatat), bukan penarikan dana kembali dari Xendit. Konsekuensinya:
> - Setelah `fee-reverse`, catat koreksi di ledger aplikasi Anda pada periode yang sama agar laporan bulanan tidak selisih.
> - Fee yang sudah dibayarkan pada periode sebelumnya tetap memerlukan penyesuaian manual (kredit periode berikutnya), bukan penghapusan otomatis.


---

## 9. XenPlatform Managed Sub-Account

### 9.1 Konsep

Setiap client store bisa punya **sub-account Xendit sendiri** (KTP pemilik ≠ master). Setelah KYC LIVE:

- Dana langsung masuk sub-account store (bukan akun induk)
- Store bisa tarik saldo sendiri via portal partners.logikraf.id
- Logikraf tetap potong fee otomatis

### 9.2 Status KYC

| Status | Arti |
|--------|------|
| `INVITED` | Menunggu undangan KYC dari email |
| `AWAITING_DOCS` | Menunggu upload dokumen |
| `DRAFT` | Dokumen terupload, belum disubmit |
| `IN_REVIEW` | Sedang diverifikasi Xendit |
| `LIVE` | Verified, bisa terima pembayaran |
| `REJECTED` | Ditolak, perlu perbaiki dokumen |

### 9.3 Webhook XenPlatform

Hub menerima event berikut dari Xendit:

- `account.created`
- `account.verification`
- `payout.succeeded` / `payout.failed`
- `split_rule.created`

Event di-forward ke client app via internal endpoint.

---

## 10. Multi-Tenant Pattern (Smarthub)

### 10.1 Struktur Data Smarthub

Smarthub adalah SaaS multi-tenant (RT/RW). Setiap tenant = satu komplek perumahan.

```
Smarthub (SB)
├── Tenant A (RT 05/RW 03)
│   ├── Warga 1
│   ├── Warga 2
│   └── ...
├── Tenant B (RT 12/RW 01)
│   ├── Warga 1
│   └── ...
└── ...
```

### 10.2 Prefix Convention

Untuk membedakan transaksi antar-tenant di Smarthub:

```
sb-{tenant_id}-{type}-{timestamp}-{random}
```

Contoh:

```
sb-tenant-abc-inv-20260922-001
sb-tenant-xyz-qris-20260922-002
```

### 10.3 RLS (Row-Level Security)

Semua query ke PostgreSQL harus filter by `tenant_id`:

```sql
-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### 10.4 Webhook Handler di Smarthub

Ketika webhook datang, Smarthub harus:

1. Verifikasi `X-Logikraf-Signature`
2. Parse `external_id` → extract `tenant_id`
3. Set `app.current_tenant` session variable
4. Update invoice (idempotent)
5. Kirim notifikasi WA ke warga

---

## 11. Best Practices & Pitfalls

### 11.1 ✅ DO

| Praktik | Alasan |
|---------|--------|
| Selalu verifikasi `X-Logikraf-Signature` | Mencegah pemalsuan webhook |
| Gunakan idempotency (`WHERE status='pending'`) | Mencegah double-processing |
| Kirim `metadata.product_subtotal` | Fee dihitung dari subtotal, bukan ongkir |
| Set `QRIS_ALLOW_SIMULATE=false` di production | Mencegah pelunasan palsu |
| Filter by `tenant_id` di semua query | Data isolation |
| Log semua webhook received | Audit trail |

### 11.2 ❌ DON'T

| Larangan | Alasan |
|----------|--------|
| Jangan hardcode Xendit key di client app | Key hanya milik Logikraf |
| Jangan tampilkan QR string < 150 chars | Placeholder, tidak bisa discan |
| Jangan update order tanpa cek status | Bisa overwrite status `paid` |
| Jangan hapus settlement `processing`/`paid` | Arsip permanen |
| Jangan trust `external_id` dari user | Selalu validate prefix server-side |

### 11.3 Common Pitfalls

#### 1. Prefix Validation Harus Case-Insensitive

```go
// SALAH
if !strings.HasPrefix(externalID, "sb-") { ... }

// BENAR
if !strings.HasPrefix(strings.ToLower(externalID), "sb-") { ... }
```

#### 2. Jangan Duplikasi Prefix

Jika nomor order sudah `SB-20260922-001`, jangan tambah prefix lagi jadi `sb-SB-20260922-001`.

#### 3. Refund QRIS: Didukung Xendit, tetapi Belum Diekspos Hub

> **Koreksi (revisi 1.1).** Revisi sebelumnya menyatakan "QRIS tidak bisa refund via API". Itu tidak akurat: kanal QRIS Xendit **mendukung refund**, termasuk refund sebagian, dengan dua batasan yang perlu diperhatikan — **masa berlaku refund ±7 hari** dan **dukungan berbeda per penerbit/e-wallet** (misalnya GoPay tidak menerima refund sebagian).

Yang sebenarnya terjadi: **Hub belum mengekspos API refund QRIS**, sehingga alur yang tersedia saat ini bersifat manual:

1. Logikraf transfer manual ke warga
2. Upload bukti di dashboard
3. Order status → `refunded`
4. Panggil `POST /api/client-store-fee-reverse` agar fee platform ikut dibalik di ledger Hub (lihat §8.4)

Jika Anda memerlukan refund QRIS otomatis, ajukan sebagai permintaan fitur ke tim Logikraf — kemampuan di sisi Xendit sudah tersedia.

#### 4. Test Mode vs Live Mode

Jika QR string pendek (`some-random-qr-string`), penyebabnya:
- **Test Mode aktif** di dashboard Xendit, ATAU
- `QRIS_ALLOW_SIMULATE=true` di env

Jangan cari bug kode — cek dashboard Xendit dulu.

---

## 12. Contoh Implementasi Lengkap

### 12.1 Service Layer (TypeScript/Bun)

```typescript
// src/services/payment-hub.ts

const HUB_URL = process.env.LOGIKRAF_HUB_URL!;
const INTERNAL_KEY = process.env.LOGIKRAF_INTERNAL_KEY!;

export interface CreateInvoiceRequest {
  external_id: string;
  amount: number;
  payer_email?: string;
  given_names?: string;
  description?: string;
  success_redirect_url?: string;
  failure_redirect_url?: string;
  metadata?: Record<string, unknown>;
}

export interface InvoiceResponse {
  id: string;
  external_id: string;
  invoice_url: string;
  amount: number;
  status: string;
  expiry_date: string;
}

export class PaymentHubService {
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${HUB_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`PaymentHub ${res.status}: ${err.error || res.statusText}`);
    }

    return res.json();
  }

  async createInvoice(req: CreateInvoiceRequest): Promise<InvoiceResponse> {
    return this.request<InvoiceResponse>('POST', '/api/client-store-invoices', req);
  }

  async createQRIS(externalId: string, amount: number, description?: string) {
    return this.request('POST', '/api/client-store-qris', {
      external_id: externalId,
      amount,
      description,
    });
  }

  async getQRISStatus(referenceId: string) {
    return this.request('GET', `/api/payment/qris/${referenceId}`);
  }

  async reversePlatformFee(externalId: string) {
    return this.request('POST', '/api/client-store-fee-reverse', {
      external_id: externalId,
    });
  }
}

export const paymentHub = new PaymentHubService();
```

### 12.2 Webhook Handler (Hono)

```typescript
// src/routes/webhooks.ts

import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '../db';
import { invoices } from '../db/schema';
import { and, eq } from 'drizzle-orm';

const app = new Hono();

// verifySignature() diimpor dari SATU modul bersama — implementasinya ada di §3.2.
// Jangan mendefinisikan ulang di sini; dua implementasi berbeda = celah keamanan.
import { verifySignature } from '../lib/logikraf-signature';

const HUB_SECRET = process.env.LOGIKRAF_INTERNAL_KEY!;

app.post('/logikraf-hub', async (c) => {
  const signature = c.req.header('X-Logikraf-Signature');
  const rawBody = await c.req.text();

  // 1. Verify
  if (!signature || !verifySignature(rawBody, signature)) {
    return c.json({ error: 'invalid signature' }, 401);
  }

  // 2. Parse
  const body = JSON.parse(rawBody);

  // 3. Only process PAID/SETTLED
  if (body.status !== 'PAID' && body.status !== 'SETTLED') {
    return c.json({ status: 'ignored', reason: `status=${body.status}` });
  }

  // 4. Idempotent update
  const result = await db
    .update(invoices)
    .set({
      status: 'paid',
      paidAt: new Date(body.paid_at),
      xenditInvoiceId: body.id,
      paymentFee: body.fees_paid_amount || 0,
      paidAmount: body.amount,
    })
    .where(
      and(
        eq(invoices.externalId, body.external_id),
        eq(invoices.status, 'pending')
      )
    )
    .returning();

  if (result.length === 0) {
    return c.json({ status: 'ignored', reason: 'already_paid_or_not_found' });
  }

  // 5. Async notifications (don't block webhook)
  const invoice = result[0];
  c.executionCtx.waitUntil(
    Promise.all([
      notifyWargaPaid(invoice),
      notifyBendaharaPaid(invoice),
    ])
  );

  return c.json({ status: 'processed', invoice_id: invoice.id });
});

interface InvoiceRingkas {
  id: number;
  externalId: string;
  paidAmount: number;
  status: string;
}

async function notifyWargaPaid(invoice: InvoiceRingkas): Promise<void> {
  // Kirim WA ke warga: "Iuran Anda sudah dibayar..."
}

async function notifyBendaharaPaid(invoice: InvoiceRingkas): Promise<void> {
  // Kirim WA ke bendahara: "Pembayaran masuk Rp X..."
}

export default app;
```

### 12.3 Checkout Flow (Frontend)

```typescript
// src/hooks/useCheckout.ts

import { useState } from 'react';
import { api } from '../lib/api';

interface TenantCheckoutContext {
  id: string;
  userEmail: string;
  userName: string;
  complexName: string;
  currentPeriod: string;
}

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutWithInvoice = async (orderId: string, amount: number, tenant: TenantCheckoutContext) => {
    setLoading(true);
    setError(null);

    try {
      const externalId = `sb-${tenant.id}-inv-${Date.now()}`;
      
      const res = await api.post('/api/payment/create-invoice', {
        external_id: externalId,
        amount,
        payer_email: tenant.userEmail,
        given_names: tenant.userName,
        description: `Iuran ${tenant.complexName} - ${tenant.currentPeriod}`,
        success_redirect_url: `${window.location.origin}/payment/success?ref=${externalId}`,
        failure_redirect_url: `${window.location.origin}/payment/failed?ref=${externalId}`,
        metadata: {
          product_subtotal: amount,
          tenant_id: tenant.id,
          store: 'smarthub',
        },
      });

      // Redirect to Xendit checkout
      window.location.href = res.invoice_url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga');
    } finally {
      setLoading(false);
    }
  };

  const checkoutWithQRIS = async (orderId: string, amount: number, tenant: TenantCheckoutContext) => {
    setLoading(true);
    setError(null);

    try {
      const externalId = `sb-${tenant.id}-qris-${Date.now()}`;
      
      const res = await api.post('/api/payment/create-qris', {
        external_id: externalId,
        amount,
        description: `Iuran ${tenant.complexName}`,
      });

      // Validate QR string length
      if (res.qr_string.length < 150) {
        throw new Error('QRIS belum bisa diterbitkan: akun pembayaran belum diverifikasi.');
      }

      // Redirect to QR payment page
      window.location.href = `/pay/qris/${res.reference_id}`;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga');
    } finally {
      setLoading(false);
    }
  };

  return { checkoutWithInvoice, checkoutWithQRIS, loading, error };
}
```

### 12.4 Reconciliation Cron

```typescript
// src/cron/reconcile-qris.ts

import { db } from '../db';
import { invoices } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { paymentHub } from '../services/payment-hub';

export async function reconcileQRIS() {
  // Cari invoice QRIS yang masih pending > 1 jam
  const pending = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.paymentMethod, 'qris'),
        eq(invoices.status, 'pending'),
        // created_at < NOW() - INTERVAL '1 hour'
      )
    )
    .limit(50);

  let paid = 0;
  let skipped = 0;
  let failed = 0;

  for (const inv of pending) {
    try {
      const status = await paymentHub.getQRISStatus(inv.externalId);
      
      if (status.status === 'PAID') {
        // Update to paid
        await db
          .update(invoices)
          .set({
            status: 'paid',
            paidAt: new Date(status.paid_at),
            paidAmount: status.amount,
          })
          .where(eq(invoices.id, inv.id));
        
        await notifyWargaPaid(inv);
        paid++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Reconcile failed for ${inv.externalId}:`, err);
      failed++;
    }
  }

  if (pending.length > 0) {
    console.log(`Reconcile QRIS: checked=${pending.length}, paid=${paid}, skipped=${skipped}, failed=${failed}`);
  }
}
```

---

## 13. Checklist Go-Live

### Sebelum Go-Live

- [ ] Client Store terdaftar di dashboard Logikraf
- [ ] `LOGIKRAF_HUB_URL` dan `LOGIKRAF_INTERNAL_KEY` ter-set di env
- [ ] Webhook endpoint milik **aplikasi Anda** (mis. `/api/v1/billing/webhook/logikraf`) dapat diakses dari internet. Yang memanggil endpoint ini adalah **Hub**, bukan Xendit
- [ ] Signature verification berfungsi
- [ ] Idempotency test passed (replay webhook → tidak double update)
- [ ] `metadata.product_subtotal` terkirim dengan benar
- [ ] `QRIS_ALLOW_SIMULATE=false` di production
- [ ] RLS aktif untuk semua tabel tenant
- [ ] Internal Finance API tersedia (untuk settlement)
- [ ] Notifikasi WA berfungsi (warga + bendahara)

### Saat Go-Live

- [ ] Test dengan pembayaran kecil (Rp 1.000 - Rp 10.000)
- [ ] Verifikasi order status berubah → `paid`
- [ ] Verifikasi webhook masuk di log
- [ ] Verifikasi notifikasi WA terkirim
- [ ] Cek dashboard Logikraf → transaksi muncul
- [ ] Cek platform_fee tercatat (jika applicable)

### Setelah Go-Live

- [ ] Monitor log error selama 24 jam
- [ ] Reconciliation cron berjalan (tiap 5 menit)
- [ ] Backup database berfungsi
- [ ] Dokumentasi internal di-update

---

## Referensi API Lengkap

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `POST` | `/api/client-store-invoices` | Buat invoice checkout |
| `POST` | `/api/client-store-qris` | Buat QRIS payment |
| `GET` | `/api/payment/qris/:ref` | Cek status QRIS |
| `GET` | `/api/payment/qris/:ref/stream` | SSE stream status |
| `POST` | `/api/payment/qris/:ref/simulate` | Simulasi bayar (test) |
| `POST` | `/api/client-store-refunds` | Refund invoice |
| `POST` | `/api/client-store-fee-reverse` | Balik platform fee |
| `POST` | `/api/client-store-invoices/:id/expire` | Force expire invoice |

---

## Kontak & Support

- **Dashboard Admin:** https://logikraf.id/admin
- **Payment Hub:** https://logikraf.id/admin/payment-hub
- **Technical Issue:** Hubungi tim Logikraf via WhatsApp

---

---

## Changelog Salinan Lokal

### 1.1 — 2026-09-22 (revisi oleh tim SmartHub)
Koreksi teknis pada salinan lokal:

1. Nama header autentikasi **dikoreksi menjadi `X-Internal-Key`** sesuai kode Go Hub yang live (sebelumnya dokumen memakai `X-Logikraf-Internal-Key`).
2. Contoh `verifySignature` §3.2 diperbaiki agar dapat dikompilasi (impor `timingSafeEqual`, guard panjang buffer, `try/catch`), dan §12.2 kini merujuk pada implementasi tunggal tersebut.
3. SSE §5.5: ditambahkan aturan bahwa stream **harus** diproksi lewat backend (EventSource tidak dapat mengirim header) beserta contoh Express; path relatif diperjelas.
4. Idempotensi §6.4 diperluas: `event_id` unik sebagai lapis pertama, dan `PAID` vs `SETTLED` dipisahkan; `event_id` ditambahkan ke contoh payload §6.2.
5. Batas nominal QRIS (**maks Rp10.000.000**) dicatat di §4.3.
6. §11.3 poin 3 dikoreksi: QRIS Xendit **mendukung** refund dengan batasan per penerbit; yang belum tersedia adalah eksposurnya di Hub.
7. §8.4 diperjelas: fee reversal adalah **koreksi ledger Hub**, bukan pemulihan dana dari Xendit.
8. Contoh kode diselaraskan (`.returning()` + `result.length`), `any` diganti tipe eksplisit, dan path webhook contoh diganti menjadi `/logikraf-hub`.
9. Ditambahkan catatan penamaan: **SmartHub v1** vs "Smarthub V3" (stack lama Hono/Bun yang tidak dipakai).

> Semua perubahan di atas hanya pada **salinan lokal**. Ajukan ke tim Logikraf agar dokumen pusat ikut diperbarui.

> 📝 **Catatan:** Dokumen ini bersifat living document. Update terakhir: 2026-09-22. Untuk perubahan API, lihat changelog di repository LogikaKreatifIndonesia.
