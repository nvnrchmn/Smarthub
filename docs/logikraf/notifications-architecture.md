# Arsitektur Notifikasi: WhatsApp & Email

> **Dokumen Platform Logikraf — salinan lokal.**
> Menjelaskan desain dan implementasi kanal notifikasi **WhatsApp (GoWA)** dan **Email (BillionMail)** yang dipakai oleh Logikraf Payment Hub dan produk SaaS di bawahnya (termasuk **SmartHub v1**).
> Sumber kebenaran tetap di tim Logikraf; perubahan lokal dapat tertimpa versi pusat.

| Atribut | Nilai |
|---|---|
| Pemilik dokumen | Tim Logikraf (platform) |
| Versi | 1.1 |
| Terakhir diperbarui | 2026-09-22 |
| Salinan disimpan | Repo SmartHub v1 — `docs/logikraf/` |
| Berlaku untuk | Logikraf Payment Hub; SmartHub **v1** (Node 22 + Express 5 + Prisma + Next.js 15) |

> **Catatan stack.** Bab 2–5 dan 7–8 memakai contoh **Go** (Logikraf V2), sedangkan bab 6 memakai contoh **Hono/Bun/Drizzle** yang ditujukan untuk "Smarthub V3" (produk lama). Untuk repo ini, padanan yang berlaku adalah **Express 5 + Prisma + Next.js 15** — lihat bab 6 yang sudah ditandai. Jangan menyalin contoh stack lama.

---

## Daftar Isi

1. [Gambaran Sistem](#1-gambaran-sistem)
2. [WhatsApp via GoWA](#2-whatsapp-via-gowa)
3. [Email via BillionMail](#3-email-via-billionmail)
4. [Pola Multi-Kanal](#4-pola-multi-kanal)
5. [Scheduler: Pengingat Otomatis](#5-scheduler-pengingat-otomatis)
6. [Smarthub V3: Integrasi di Masa Depan](#6-smarthub-v3-integrasi-di-masa-depan)
7. [Templating & Lokalisasi](#7-templating--lokalisasi)
8. [Monitoring & Error Handling](#8-monitoring--error-handling)
9. [Checklist Implementasi](#9-checklist-implementasi)

---

## 1. Gambaran Sistem

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Logikraf       │     │  Smarthub V3    │     │  Produk SaaS    │
│  Payment Hub    │     │  (Hono/Bun)     │     │  Lainnya        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              pkg/wa (Go WA Client)                              │
│              → HTTP ke GoWA server (mg001)                      │
└─────────────────────────────────────────────────────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  GoWA Server    │     │  BillionMail    │
│  :3001          │     │  (SMTP/IMAP)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
   WhatsApp User          Email User
```

| Kanal | Provider | Fungsi Utama | Kapan Dipakai |
|-------|----------|--------------|---------------|
| WhatsApp | GoWA (self-hosted) | Notifikasi instan, pengingat cepat | Order baru, verifikasi, pengiriman file |
| Email | BillionMail | Notifikasi formal, lampiran PDF | Invoice, pengingat tagihan, reset password |

---

## 2. WhatsApp via GoWA

### 2.1 Arsitektur

GoWA berjalan sebagai server terpisah di VPS (`:3001`) dengan device ID `mg001`. Aplikasi Logikraf memanggil GoWA via HTTP REST.

**Client Library:** `logikraf-v2/pkg/wa/wa.go`

> ⚠️ **Peringatan kepatuhan & risiko operasional (wajib dibaca sebelum dipakai untuk SmartHub).**
> GoWA adalah klien WhatsApp **non-resmi** (mengandalkan sesi WhatsApp Web), bukan WhatsApp Business Platform resmi. Konsekuensi yang harus diterima:
> 1. **Nomor pengirim dapat diblokir atau dibanned** tanpa peringatan, terutama bila volume pesan tinggi atau banyak penerima menandai pesan sebagai spam.
> 2. Tidak ada jaminan SLA maupun API kontrak dari WhatsApp; perubahan di sisi WhatsApp dapat memutus layanan tanpa pemberitahuan.
> 3. Tidak mendukung template message resmi, sehingga pesan transaksional (tagihan, invoice) tidak mendapat perlindungan kebijakan yang sama dengan WhatsApp Business API.
>
> **Mitigasi wajib:** gunakan nomor terpisah khusus notifikasi, batasi laju kirim (rate limit), sediakan mekanisme fallback (email via BillionMail atau notifikasi in-app), pantau tingkat gagal, dan jangan menjadikan WA satu-satunya kanal untuk informasi yang bersifat wajib (mis. tagihan berbayar).
>
> Server GoWA hanya boleh di-bind ke **localhost** (`127.0.0.1`) dan tidak diekspos ke internet; bila `WA_BASIC_AUTH` dikosongkan, pastikan akses hanya dari jaringan internal.

### 2.2 Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `WA_BASE_URL` | `http://127.0.0.1:3001` | URL server GoWA |
| `WA_DEVICE_ID` | `mg001` | ID device/nomor pengirim |
| `WA_BASIC_AUTH` | *(kosong)* | Basic auth untuk GoWA (format `user:pass`) |

### 2.3 API Reference

#### Send Message

```go
// Send — kirim pesan teks ke satu nomor.
func (c *Client) Send(phone, message string) error
```

**Request ke GoWA:**
```
POST /send/message
Content-Type: application/json

{
  "phone": "6281234567890",
  "message": "Halo, pesanan Anda sudah diproses.",
  "device_id": "mg001"
}
```

**Normalisasi nomor otomatis oleh `Normalize()`:**
- `08123456789` → `628123456789`
- `+62 812 3456 789` → `628123456789`
- `8123456789` → `628123456789`

### 2.4 Penggunaan di Kode

#### Import & Inisialisasi

```go
import "github.com/logikraf/logikraf-v2/pkg/wa"

func NotifyOrder(clientPhone, orderNumber string, amount uint) {
    c := wa.New()
    if !c.Enabled() {
        return  // skip jika WA tidak tersedia
    }
    
    msg := fmt.Sprintf(
        "Terima kasih, pembayaran untuk Order #%s telah kami terima.\n\nJumlah: Rp %s\n\nTim kami akan menghubungi Anda untuk langkah selanjutnya.",
        orderNumber, formatRupiah(amount),
    )
    _ = c.Send(clientPhone, msg)
}
```

#### Pemberitahuan Order Baru (GoWA)

```go
// logikraf-v2/internal/delivery/handler/order_wa.go
func notifyOrderWA(pt model.PaymentTransaction, orderID uint) {
    c := wa.New()
    if !c.Enabled() {
        return
    }
    
    // 1. Kabari admin
    if admin := setting("admin_notify_wa", "logikraf"); admin != "" {
        _ = c.Send(admin, fmt.Sprintf(
            "Pesanan baru masuk\nOrder #%d\nKlien: %s\nJumlah: Rp %s\nRef: %s",
            orderID, pt.ClientName, formatRupiah(pt.GrossAmount), pt.InvoiceRef,
        ))
    }
    
    // 2. Kabari klien
    if pt.ClientPhone != "" {
        _ = c.Send(pt.ClientPhone, fmt.Sprintf(
            "Terima kasih, pembayaran Anda sudah kami terima.\nOrder #%d\nJumlah: Rp %s\n\nTim Logikraf akan menghubungi Anda untuk langkah selanjutnya.",
            orderID, formatRupiah(pt.GrossAmount),
        ))
    }
}
```

### 2.5 Pesan Template (WhatsApp)

| Event | Template |
|-------|----------|
| Order dibuat | `Pesanan baru masuk\nOrder #{id}\nKlien: {name}\nJumlah: Rp {amount}\nRef: {ref}` |
| Pembayaran diterima | `Terima kasih, pembayaran Anda sudah kami terima.\nOrder #{id}\nJumlah: Rp {amount}` |
| Pengingat tagihan | `Pengingat tagihan {number}\nNama: {name}\nSisa tagihan: Rp {outstanding}\nJatuh tempo: {due_date}\n\nMohon selesaikan pembayaran.` |
| Verifikasi email | `Verifikasi email portal Logikraf\nTautan (berlaku 24 jam):\n{link}` |
| Reset password | `Reset kata sandi portal Logikraf\nTautan (berlaku 1 jam):\n{link}` |

---

## 3. Email via BillionMail

### 3.1 Arsitektur

Email dikirim via SMTP ke server BillionMail. Konfigurasi disimpan di database (tabel `settings`) dan di-load via `email.DefaultConfig()`.

**Client Library:** `logikraf-v2/pkg/email/email.go`

### 3.2 Konfigurasi

Konfigurasi email diambil dari `Settings` (DB) dengan key:
- `smtp_host` — hostname SMTP
- `smtp_port` — port (587/465)
- `smtp_user` — username SMTP
- `smtp_pass` — password SMTP
- `smtp_from` — alamat pengirim
- `smtp_from_name` — nama pengirim

> 🔐 **Keamanan rahasia SMTP.** `smtp_pass` adalah kredensial yang dapat dipakai mengirim email atas nama domain Logikraf. Nilai ini **wajib disimpan terenkripsi** di database (mis. AES-GCM dengan kunci dari secret manager), bukan plaintext, dan **tidak boleh** ikut ter-dump pada backup tanpa enkripsi. Akses ke tabel `settings` dibatasi ke peran admin, dan rotasi password SMTP harus didokumentasikan sebagai prosedur. Untuk SmartHub v1, kredensial platform seperti ini **tidak** disimpan di database tenant — cukup merujuk ke layanan bersama Logikraf.

```go
// Ambil konfigurasi dari DB
cfg := email.DefaultConfig()
if cfg.Host != "" {
    // Email siap dikirim
}
```

### 3.3 API Reference

#### Send Plain/HTML Email

```go
// Send — kirim email HTML ke satu atau banyak penerima.
func Send(cfg Config, to []string, subject, bodyHTML string) error
```

#### Send Invoice Reminder

```go
// SendInvoiceReminder — email pengingat tagihan dengan PDF terlampir.
func SendInvoiceReminder(
    cfg Config,
    to string,
    clientName string,
    invoiceNumber string,
    outstandingFormatted string,
    totalFormatted string,
    paidFormatted string,
    dueDate string,
    daysOverdue int,
    pdfAttachment []byte,
) error
```

### 3.4 Penggunaan di Kode

#### Kirim Email Verifikasi

```go
// logikraf-v2/pkg/auth/email_verify.go
func SendEmailVerification(user model.User) {
    if user.Email == "" {
        return
    }
    
    // Generate token
    token := generateSecureToken()
    link := portalBaseURL() + "/verify-email?token=" + token
    
    // Simpan token hash ke DB
    model.DB.Create(&model.EmailVerification{
        Email:     user.Email,
        TokenHash: hashToken(token),
        ExpiresAt: time.Now().Add(24 * time.Hour),
    })
    
    // Kirim email
    if cfg := email.DefaultConfig(); cfg.Host != "" {
        body := "<p>Halo " + name + ",</p>" +
            "<p>Terima kasih sudah mendaftar di portal Logikraf. " +
            "Mohon pastikan alamat email ini benar dengan menekan tautan berikut:</p>" +
            "<p><a href=\"" + link + "\">Verifikasi email saya</a></p>" +
            "<p>Tautan berlaku 24 jam dan hanya bisa dipakai sekali.</p>" +
            "<p>Salam,<br>Tim Logikraf</p>"
        
        go func() {
            _ = email.Send(cfg, []string{user.Email}, "Verifikasi email portal Logikraf", body)
        }()
    }
    
    // Kirim juga via WA jika ada nomor
    if num := clientWhatsApp(user.Email); num != "" {
        go func() {
            _ = wa.New().Send(num, "Verifikasi email portal Logikraf\nTautan (berlaku 24 jam):\n"+link)
        }()
    }
}
```

#### Kirim Pengingat Tagihan (dengan PDF)

```go
// logikraf-v2/pkg/scheduler/jobs.go
func RunReminderSend(ctx context.Context, db *gorm.DB) error {
    // ... query invoice yang jatuh tempo ...
    
    // 1. Kirim email dengan lampiran PDF
    pdf := generateInvoicePDF(inv, client, order)
    err := email.SendInvoiceReminder(
        cfg,
        client.Email,
        client.PICName,
        inv.InvoiceNumber,
        formatRupiah(outstanding),
        formatRupiah(inv.Total),
        formatRupiah(inv.PaidAmount),
        dueDate,
        daysOverdue,
        pdf,
    )
    
    // 2. Kirim juga via WA (lebih cepat dibaca)
    if client.Phone != "" {
        waMsg := "Pengingat tagihan " + inv.InvoiceNumber + "\n" +
            "Nama: " + name + "\n" +
            "Sisa tagihan: Rp " + formatRupiah(outstanding) + "\n" +
            "Jatuh tempo: " + dueDate
        if daysOverdue > 0 {
            waMsg += " (terlambat " + strconv.Itoa(daysOverdue) + " hari)"
        }
        _ = wa.New().Send(client.Phone, waMsg)
    }
    
    // 3. Log reminder
    db.Create(&model.InvoiceReminder{
        InvoiceID:   inv.ID,
        SentTo:      client.Email,
        DaysOverdue: daysOverdue,
        Outstanding: outstanding,
        Status:      "sent",
    })
}
```

### 3.5 Template Email (HTML)

#### Verifikasi Email
```html
<p>Halo {name},</p>
<p>Terima kasih sudah mendaftar di portal Logikraf.
   Mohon pastikan alamat email ini benar dengan menekan tautan berikut:</p>
<p><a href="{link}" style="padding:10px 20px;background:#1677ff;color:#fff;
   text-decoration:none;border-radius:6px;">Verifikasi email saya</a></p>
<p>Tautan berlaku 24 jam dan hanya bisa dipakai sekali.</p>
<p>Salam,<br>Tim Logikraf</p>
```

#### Reset Password
```html
<p>Halo {name},</p>
<p>Kami menerima permintaan reset kata sandi untuk akun Anda.
   Tekan tautan berikut untuk mengatur ulang:</p>
<p><a href="{link}">Reset kata sandi saya</a></p>
<p>Tautan berlaku 1 jam. Abaikan email ini bila tidak merasa meminta reset.</p>
```

#### Invoice / Tagihan
- Subject: `Tagihan {invoice_number} dari PT Logika Kreatif Indonesia`
- Body: Template HTML dengan tabel item + total
- Attachment: `invoice-{number}.pdf` (generated via `pkg/invoice`)

---

## 4. Pola Multi-Kanal

### 4.1 Kapan Mengirim via WA, Email, atau Keduanya?

| Event | WA | Email | Alasan |
|-------|:--:|:-----:|--------|
| Order baru (admin) | ✓ | | Instan, butuh respon cepat |
| Order baru (klien) | ✓ | ✓ | WA = konfirmasi cepat; Email = bukti formal |
| Pembayaran diterima | ✓ | | Langsung ke tangan |
| Tagihan/Invoice | | ✓ | Butuh PDF formal, arsip |
| Pengingat tagihan | ✓ | ✓ | WA = dibaca cepat; Email = lampiran PDF |
| Verifikasi email | ✓ | ✓ | Redundansi kanal |
| Reset password | ✓ | ✓ | Redundansi kanal |
| Ticket klien | ✓ | | Instan |
| Notifikasi sistem | ✓ | | Monitoring internal |

### 4.2 Pattern: Outbox + Queue (WAJIB untuk notifikasi transaksional)

> **Koreksi (revisi 1.1).** Revisi sebelumnya menganjurkan pola *fire-and-forget* lewat goroutine. Pola itu **tidak boleh** dipakai untuk notifikasi transaksional (tagihan, invoice, reset password, konfirmasi pembayaran) karena: pesan hilang saat proses restart/crash, tidak ada retry, tidak ada *dead-letter*, jumlah goroutine tak terbatas, dan kegagalan hanya tercatat di log.

Prinsipnya: **notifikasi tidak boleh menggagalkan transaksi bisnis, tetapi juga tidak boleh hilang.** Karena itu niat kirim ditulis ke database **di dalam transaksi yang sama** dengan perubahan bisnis, lalu dikirim oleh worker terpisah.

**Skema outbox:**

```sql
CREATE TABLE notification_outbox (
  id              BIGSERIAL PRIMARY KEY,
  event_key       TEXT NOT NULL UNIQUE,     -- kunci idempotensi, mis. "iuran:123:lunas"
  channel         TEXT NOT NULL,            -- 'wa' | 'email' | 'inapp'
  recipient       TEXT NOT NULL,
  template        TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending|sending|sent|failed|dead
  attempts        INT  NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at         TIMESTAMPTZ
);

CREATE INDEX notification_outbox_due_idx ON notification_outbox (status, next_attempt_at);
```

**Menulis niat kirim di dalam transaksi bisnis** (Express + Prisma — SmartHub v1):

```typescript
// apps/api/src/modules/keuangan/keuangan.service.ts (pola; TARGET)
await prisma.$transaction(async (tx) => {
  await tx.iuranRumah.update({
    where: { id_iuran },
    data: { status_bayar: 'Lunas', tgl_bayar: new Date() },
  });

  await tx.notificationOutbox.create({
    data: {
      eventKey: `iuran:${id_iuran}:lunas`,   // UNIQUE → tidak mungkin dobel
      channel: 'wa',
      recipient: nomorWarga,
      template: 'iuran_lunas',
      payload: { nominal, bulan, tahun, nama: namaWarga },
    },
  });
});
```

**Worker pengirim** (dipanggil scheduler, mis. tiap 30 detik):

```typescript
// apps/api/src/workers/notification.worker.ts (TARGET)
const KEMBALI_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]; // 1m, 5m, 15m, 1j
const MAKS_PERCOBAAN = 5;

const kirimBatch = async (): Promise<void> => {
  const due = await prisma.notificationOutbox.findMany({
    where: { status: 'pending', nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: 'asc' },
    take: 50,
  });

  for (const item of due) {
    try {
      await kirimKanal(item); // GoWA untuk 'wa', SMTP BillionMail untuk 'email'
      await prisma.notificationOutbox.update({
        where: { id: item.id },
        data: { status: 'sent', sentAt: new Date(), attempts: { increment: 1 } },
      });
    } catch (error) {
      const attempts = item.attempts + 1;
      const habis = attempts >= MAKS_PERCOBAAN;
      await prisma.notificationOutbox.update({
        where: { id: item.id },
        data: {
          attempts,
          status: habis ? 'dead' : 'pending',
          lastError: error instanceof Error ? error.message : String(error),
          nextAttemptAt: new Date(Date.now() + (KEMBALI_MS[attempts - 1] ?? 60 * 60_000)),
        },
      });
    }
  }
};
```

**Kebijakan retry:**

| Percobaan | Jeda berikutnya | Bila gagal lagi |
|---|---|---|
| 1 | 1 menit | lanjut |
| 2 | 5 menit | lanjut |
| 3 | 15 menit | lanjut |
| 4 | 1 jam | lanjut |
| 5 | — | status `dead` + **alert ke tim** + tampilkan di dasbor admin |

Aturan pendukung:
- **Fallback kanal**: bila `wa` berstatus `dead`, otomatis buat entri `email` (dan sebaliknya) untuk pesan yang sifatnya wajib.
- **Rate limit** wajib diterapkan di worker (mis. maksimum N pesan/menit dan jeda antar pesan) untuk melindungi nomor WhatsApp dan reputasi domain email.
- **Observability**: metrik `outbox_pending`, `outbox_sent_total`, `outbox_dead_total`, lama antre, dan tingkat kegagalan per kanal.

### 4.3 Pattern: Graceful Failure

Kegagalan notifikasi **tidak boleh** menggagalkan transaksi utama. Yang berubah dari revisi sebelumnya: "graceful" berarti **diantrekan**, bukan **dibuang**.

```go
// Logikraf V2 (Go) — versi yang benar: tulis ke outbox, jangan kirim langsung
func notifyOrderComplete(tx *gorm.DB, order Order, client Client) error {
    // Tidak ada goroutine, tidak ada kirim langsung.
    // Cukup catat niat kirim; worker yang mengurus pengiriman & retry.
    return tx.Create(&model.NotificationOutbox{
        EventKey:  fmt.Sprintf("order:%d:complete", order.ID),
        Channel:   "wa",
        Recipient: client.Phone,
        Template:  "order_complete",
        Payload:   payload(order),
    }).Error
}
```

> **Anti-pola yang dilarang** (semuanya muncul di revisi sebelumnya):
> ```go
> go func() { _ = wa.Send(phone, msg) }()   // ❌ hilang saat crash, tanpa retry
> _ = email.Send(cfg, to, subject, body)    // ❌ error diabaikan total
> ```
> Untuk SmartHub v1, bentuk yang benar adalah `prisma.$transaction` + tabel `NotificationOutbox` di atas — bukan `Promise` tanpa penanganan.

### 4.4 Preferensi & Persetujuan Pengguna (Consent)

Kanal WA dan email mengirim data pribadi (nama, nomor rumah, nominal tagihan). Karena itu pengiriman harus punya dasar dan dapat dihentikan.

**Klasifikasi pesan:**

| Klasifikasi | Contoh | Boleh di-opt-out? |
|---|---|---|
| **Transaksional** | Invoice langganan, konfirmasi pembayaran, reset password, verifikasi akun | **Tidak** — bagian dari layanan yang diminta pengguna |
| **Semi-transaksional** | Pengingat tagihan/iuran sebelum & sesudah jatuh tempo | **Ya**, dengan peringatan konsekuensi (mis. denda atau pembatasan layanan) |
| **Informatif/promosi** | Pengumuman fitur baru, penawaran paket | **Ya**, default tidak aktif |

**Data yang perlu disimpan (per pengguna, bukan per tenant):**
- `kanal_wa_aktif`, `kanal_email_aktif`, `kanal_inapp_aktif`
- `opt_out_promosi` + `opt_out_pada`
- `persetujuan_pada`, `persetujuan_versi` (versi teks persetujuan yang disetujui)
- `sumber_persetujuan` (mis. pendaftaran, impor oleh pengurus, persetujuan lisan yang dicatat)

**Aturan implementasi:**
1. Worker **wajib** memeriksa preferensi sebelum mengirim pesan kategori semi-transaksional/promosi; pesan transaksional tetap dikirim meskipun pengguna mematikan kanal.
2. Setiap email menyertakan tautan berhenti berlangganan; permintaan berhenti diproses maksimal 3 hari kerja.
3. Opt-out dicatat sebagai perubahan bersite `opt_out_pada` + pelaku, agar dapat dibuktikan saat audit.
4. Untuk WA, sediakan kanal permintaan berhenti (balas pesan atau via pengurus) karena GoWA non-resmi tidak punya mekanisme opt-out bawaan.
5. Data preferensi ikut terhapus/dianonimkan ketika akun dihapus sesuai kebijakan retensi UU PDP, kecuali yang wajib disimpan untuk kewajiban keuangan.

---

## 5. Scheduler: Pengingat Otomatis

### 5.1 Jadwal Cron

```go
// logikraf-v2/pkg/scheduler/jobs.go
type Job interface {
    Key() string
    Schedule() string  // cron expression
    Run(ctx, db) error
}
```

| Job Key | Schedule | Fungsi |
|---------|----------|--------|
| `invoice_reminders` | `0 9 * * *` (09:00) | Kirim pengingat tagihan via email+WA |
| `invoice_status_refresh` | `0 8 * * *` (08:00) | Update status invoice (sent→overdue) |

### 5.2 Logika Pengingat Tagihan

```
Jatuh tempo - 3 hari  → "Akan jatuh tempo"
Jatuh tempo (H)       → "Hari ini jatuh tempo"
Jatuh tempo + 1,3,7,14 → "Terlambat N hari"
Setelah H+14          → Setiap 14 hari sekali (berkala)
```

Implementasi:
```go
due := time.Date(inv.DueDate.Year(), inv.DueDate.Month(), inv.DueDate.Day(), 0, 0, 0, 0, tz)
today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, tz)
diff := int(today.Sub(due).Hours() / 24)

send := false
switch {
case diff == -3:        send = true  // 3 hari sebelum
case diff == 0:         send = true  // hari H
case diff == 1 || diff == 3 || diff == 7 || diff == 14: send = true
case diff > 14 && diff%14 == 0: send = true  // berkala
}
```

### 5.3 Idempotensi

Setiap pengiriman dicatat di `invoice_reminders` agar tidak dikirim dua kali di hari yang sama. Proses memilih invoice yang statusnya `sent` atau `partial` dan belum punya reminder hari ini.

---

## 6. Integrasi di Produk SaaS (Legacy V3 & SmartHub v1)

> ⚠️ **Penting.** Sub-bab 6.2–6.4 di bawah ditulis untuk **"Smarthub V3"** — produk lama yang memakai Hono/Bun/Drizzle. Isinya dipertahankan sebagai catatan sejarah, **bukan acuan implementasi**. Untuk repo ini gunakan **§6.5 (SmartHub v1)**.

### 6.1 Perbedaan Stack

| Aspek | Logikraf V2 (Go) — legacy | Smarthub V3 (Hono/Bun) — **legacy, tidak dipakai** | **SmartHub v1 (berlaku di repo ini)** |
|-------|---------------------------|---------------------------------------------------|----------------------------------------|
| Runtime | Go | Bun (TypeScript) | **Node.js 22 (ESM)** |
| HTTP server | Fiber | Hono | **Express 5** |
| HTTP client | net/http | `fetch()` | **`fetch()` bawaan Node 22** |
| Async | `go func()` | `Promise` / `setTimeout` | **`async/await` + worker terjadwal (outbox)** |
| DB | GORM | Drizzle ORM | **Prisma** |
| Validasi | manual | Zod | **Zod (`@smarthub/shared`)** |
| Logging | `log.Printf` | `console` | **pino** |

### 6.2 Rencana Implementasi WA di Smarthub V3

```typescript
// Smarthub V3: backend/src/lib/wa.ts
export interface WAConfig {
  baseURL: string
  deviceId: string
  basicAuth?: { user: string; pass: string }
}

export class WAClient {
  private config: WAConfig
  
  constructor(config: WAConfig) {
    this.config = config
  }
  
  async send(phone: string, message: string): Promise<void> {
    const normalized = this.normalize(phone)
    if (!normalized) throw new Error('Nomor kosong')
    
    const res = await fetch(`${this.config.baseURL}/send/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.basicAuth && {
          'Authorization': `Basic ${btoa(`${this.config.basicAuth.user}:${this.config.basicAuth.pass}`)}`
        })
      },
      body: JSON.stringify({
        phone: normalized,
        message,
        device_id: this.config.deviceId,
      }),
    })
    
    if (!res.ok) {
      throw new Error(`WA ${res.status}: ${await res.text()}`)
    }
  }
  
  private normalize(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('0')) return '62' + digits.slice(1)
    if (digits.startsWith('62')) return digits
    if (digits.startsWith('8')) return '62' + digits
    return digits
  }
}

// Instance default
export const wa = new WAClient({
  baseURL: process.env.WA_BASE_URL || 'http://127.0.0.1:3001',
  deviceId: process.env.WA_DEVICE_ID || 'mg001',
})
```

### 6.3 Rencana Implementasi Email di Smarthub V3

```typescript
// Smarthub V3: backend/src/lib/mailer.ts
import nodemailer from 'nodemailer'

export interface MailConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
  fromName: string
}

let transporter: nodemailer.Transporter | null = null

export function initMailer(cfg: MailConfig): void {
  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  })
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<void> {
  if (!transporter) throw new Error('Mailer tidak diinisialisasi')
  
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.from}>`,
    to,
    subject,
    html,
    attachments,
  })
}
```

### 6.4 Contoh: Notifikasi di Smarthub V3

```typescript
// backend/src/api/payments.routes.ts (future)
import { wa } from '../lib/wa'
import { sendMail } from '../lib/mailer'

paymentRoutes.post('/:id/confirm', async (c) => {
  const payment = await confirmPayment(c.req.param('id'))
  const house = await getHouse(payment.houseId)
  
  // ⚠️ LEGACY (Smarthub V3) — JANGAN DICONTOH. Pola fire-and-forget menghilangkan
  // notifikasi saat proses crash dan tidak punya retry. Untuk SmartHub v1 gunakan
  // outbox + worker (§4.2 dan §6.5).
  // Kirim notifikasi async (fire-and-forget)
  const msg = `Pembayaran IPL bulan ${payment.month} telah diterima.\nJumlah: Rp ${formatRp(payment.amount)}\nTerima kasih.`
  
  // WA ke penghuni
  if (house.contactPhone) {
    wa.send(house.contactPhone, msg).catch(err =>
      console.error('WA gagal:', err)
    )
  }
  
  // Email ke penghuni
  if (house.contactEmail) {
    sendMail(
      house.contactEmail,
      `Pembayaran IPL ${house.blok}-${house.nomorRumah}`,
      `<p>Pembayaran IPL bulan <strong>${payment.month}</strong> telah diterima.</p><p>Jumlah: Rp ${formatRp(payment.amount)}</p>`
    ).catch(err => console.error('Email gagal:', err))
  }
  
  return c.json({ data: payment })
})
```

### 6.5 Padanan SmartHub v1 (Express 5 + Prisma + Next.js 15) — **ACUAN YANG BERLAKU**

Implementasi di repo ini memakai modul `notifikasi` yang sudah ada (`apps/api/src/modules/notifikasi/`) dan menambahkan adapter kanal + outbox. **Tidak ada pengiriman langsung dari request handler.**

**Adapter WhatsApp** (`apps/api/src/lib/wa.ts` — TARGET):

```typescript
import { env } from '../config/environment';
import { logger } from '../config/logger';

export interface HasilKirim {
  sukses: boolean;
  pesanError?: string;
}

export const normalisasiNomor = (nomor: string): string | null => {
  const digit = nomor.replace(/\D/g, '');
  if (digit.startsWith('0')) return `62${digit.slice(1)}`;
  if (digit.startsWith('62')) return digit;
  if (digit.startsWith('8')) return `62${digit}`;
  return digit.length >= 9 ? digit : null;
};

export const kirimWhatsApp = async (nomor: string, pesan: string): Promise<HasilKirim> => {
  const tujuan = normalisasiNomor(nomor);
  if (!tujuan) return { sukses: false, pesanError: 'nomor_tidak_valid' };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.WA_BASIC_AUTH) {
    headers.Authorization = `Basic ${Buffer.from(env.WA_BASIC_AUTH).toString('base64')}`;
  }

  const res = await fetch(`${env.WA_BASE_URL}/send/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone: tujuan, message: pesan, device_id: env.WA_DEVICE_ID }),
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, 'Pengiriman WA gagal');
    return { sukses: false, pesanError: `wa_${res.status}` };
  }

  return { sukses: true };
};
```

**Adapter email** (`apps/api/src/lib/mailer.ts` — TARGET):

```typescript
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/environment';

let transporter: Transporter | null = null;

const dapatkanTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
};

export const kirimEmail = async (
  ke: string,
  subjek: string,
  html: string,
  lampiran?: { filename: string; content: Buffer }[],
): Promise<void> => {
  await dapatkanTransporter().sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: ke,
    subject: subjek,
    html,
    attachments: lampiran,
  });
};
```

**Titik panggil yang benar** — bukan `kirimWhatsApp(...).catch(...)`, melainkan menulis ke outbox:

```typescript
// apps/api/src/modules/billing/billing.service.ts (TARGET)
await prisma.$transaction(async (tx) => {
  await tx.iuranRumah.update({ where: { id_iuran }, data: { status_bayar: 'Lunas' } });

  await tx.notificationOutbox.createMany({
    data: [
      {
        eventKey: `iuran:${id_iuran}:lunas:wa`,
        channel: 'wa',
        recipient: nomorWarga,
        template: 'iuran_lunas',
        payload: { nominal, bulan, tahun },
      },
      {
        eventKey: `iuran:${id_iuran}:lunas:bendahara`,
        channel: 'wa',
        recipient: nomorBendahara,
        template: 'pembayaran_masuk',
        payload: { nominal, rumah },
      },
    ],
  });
});
```

Pengiriman sesungguhnya dilakukan `apps/api/src/workers/notification.worker.ts` mengikuti kebijakan retry pada §4.2, dengan pemeriksaan preferensi pengguna (§4.4) sebelum mengirim.

**Perbedaan penting dibanding contoh legacy:**
1. Tidak ada `Promise` tanpa penanganan; kegagalan tersimpan di kolom `lastError` dan diretry.
2. Model data memakai skema nyata SmartHub (`Warga.no_hp`, `AkunPengguna.email`) — **bukan** `house.contactPhone`/`contactEmail` yang tidak ada di repo.
3. Format tanggal mengikuti konvensi repo (`YYYY-MM-DD` untuk data, `id-ID` untuk tampilan), bukan `DD-MM-YYYY` pada payload.
4. Konfigurasi rahasia (`SMTP_PASS`) berasal dari secret manager/env, tidak disimpan di tabel `settings` tenant.

---

## 7. Templating & Lokalisasi

### 7.1 Bahasa

Saat ini semua notifikasi menggunakan Bahasa Indonesia. Untuk multi-language di masa depan:

```go
type MessageTemplate struct {
    KeyID   string // "order_paid", "reminder_3d", etc.
    Lang    string // "id", "en"
    Channel string // "wa", "email"
    Body    string
}
```

### 7.2 Variabel Template

Placeholder yang tersedia:

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `{name}` | Nama klien | Ahmad Rizky |
| `{company}` | Nama perusahaan | PT Maju Bersama |
| `{order_id}` | ID pesanan | 1234 |
| `{invoice_number}` | Nomor invoice | INV-2026/0001 |
| `{amount}` | Jumlah (formatted) | 2.500.000 |
| `{due_date}` | Tanggal jatuh tempo | 15-09-2026 |
| `{link}` | Tautan akses | https://portal.logikraf.id/... |

### 7.3 Lokalisasi Tanggal

Gunakan format Indonesia (`DD-MM-YYYY`) untuk tanggal di pesan:

```go
invDueDate.Format("02-01-2006")  // 15-09-2026
```

---

## 8. Monitoring & Error Handling

### 8.1 Error Handling

| Error | Penanganan |
|-------|------------|
| GoWA tidak reachable | Masukkan kembali ke outbox dengan backoff; **jangan** gantungkan transaksi bisnis |
| SMTP connection refused | Retry terjadwal dari outbox (§4.2), lalu `dead` + alert setelah 5 percobaan |
| Nomor WA tidak valid | Normalize gagal → tandai `dead` dengan alasan `nomor_tidak_valid`, kirim fallback email bila ada |
| Email tidak terkirim permanen (bounce) | Tandai alamat bermasalah, hentikan pengiriman ke alamat itu, laporkan ke pengurus tenant |
| **Laju kirim melebihi batas** | Worker wajib membatasi N pesan/menit dan memberi jeda antar pesan (lihat §4.2) untuk melindungi nomor WA dan reputasi domain |

### 8.2 Logging

```go
// Log setiap pengiriman
log.Printf("✅ WA terkirim ke %s (order %d)", clientPhone, orderID)
log.Printf("❌ WA gagal ke %s: %v", clientPhone, err)
log.Printf("📧 Email terkirim ke %s (invoice %s)", clientEmail, invNumber)
```

### 8.3 Metrics (Future)

Untuk monitoring, catat metrik:
- `wa_sent_total` — total WA terkirim
- `wa_failed_total` — total WA gagal
- `email_sent_total` — total email terkirim
- `email_failed_total` — total email gagal
- `reminder_sent_total` — total pengingat tagihan

---

## 9. Checklist Implementasi

Saat mengintegrasikan notifikasi ke produk SaaS baru (seperti Smarthub V3):

### WhatsApp

- [ ] Pastikan GoWA server (`:3001`) hanya dapat diakses dari jaringan internal
- [ ] Set env vars: `WA_BASE_URL`, `WA_DEVICE_ID`, `WA_BASIC_AUTH`
- [ ] Implementasi `normalisasiNomor()` untuk nomor Indonesia
- [ ] **Tulis ke outbox** di dalam transaksi bisnis — jangan kirim langsung, jangan fire-and-forget
- [ ] Worker dengan retry + backoff + dead-letter, dan **rate limit** laju kirim (§4.2)
- [ ] Graceful failure — kegagalan notifikasi tidak menggagalkan transaksi
- [ ] Validasi nomor tidak kosong sebelum kirim
- [ ] Sediakan **fallback** ke email/in-app bila WA `dead`

### Email

- [ ] Dapatkan kredensial SMTP dari admin (BillionMail) — simpan **terenkripsi**, bukan plaintext
- [ ] Set env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`
- [ ] Buat template HTML reusable
- [ ] Attachment PDF? Gunakan generator invoice yang tersedia
- [ ] **Tulis ke outbox** (sama seperti WA), bukan kirim langsung
- [ ] Graceful failure + dead-letter + alert
- [ ] Sertakan tautan berhenti berlangganan dan hormati preferensi pengguna (§4.4)
- [ ] Test kirim ke email uji sebelum production

### Pengingat Tagihan (Jika Ada)

- [ ] Jadwalkan cron job (08:00 untuk status refresh, 09:00 untuk reminder)
- [ ] Implementasi logika cadence (-3, 0, +1, +3, +7, +14, +14n)
- [ ] Simpan log pengiriman agar tidak double-send
- [ ] Sertakan PDF invoice sebagai attachment

### Multi-Tenant (acuan SmartHub v1)

- [ ] Setiap tenant dapat memiliki pengaturan notifikasi sendiri
- [ ] WA sender dapat per-tenant (`device_id` berbeda) atau bersama (`mg001`)
- [ ] Email sender dapat per-tenant atau bersama
- [ ] Scope akses notifikasi berdasarkan peran (Platform_Admin, pengurus, warga)
- [ ] Preferensi & opt-out dicatat **per pengguna** (§4.4), bukan hanya per tenant

---

## Lampiran: Env Vars Lengkap

```bash
# WhatsApp (GoWA)
WA_BASE_URL=http://127.0.0.1:3001
WA_DEVICE_ID=mg001
WA_BASIC_AUTH=user:pass  # opsional

# Email (BillionMail) — disimpan di DB Settings, bisa juga via env
SMTP_HOST=smtp.billionmail.id
SMTP_PORT=587
SMTP_USER=noreply@logikraf.id
SMTP_PASS=app_password_here
SMTP_FROM=noreply@logikraf.id
SMTP_FROM_NAME="PT Logika Kreatif Indonesia"
```

---

---

## Changelog Salinan Lokal

### 1.1 — 2026-09-22 (revisi oleh tim SmartHub)
1. **§4.2 diganti total**: pola *fire-and-forget* (goroutine + log) diganti **outbox + worker + retry + dead-letter**, lengkap dengan skema tabel, contoh Express/Prisma, dan tabel kebijakan retry.
2. **§4.3 diperjelas**: "graceful failure" berarti diantrekan, bukan dibuang; ditambahkan daftar anti-pola yang dilarang.
3. **§4.4 baru**: preferensi kanal & persetujuan pengguna (transaksional vs semi-transaksional vs promosi, opt-out, dasar UU PDP).
4. **§2.1**: ditambahkan peringatan kepatuhan & risiko operasional GoWA (klien non-resmi, risiko ban nomor, wajib rate limit, bind localhost).
5. **§3.2**: ditambahkan kewajiban enkripsi `smtp_pass` at-rest dan larangan menyimpannya di database tenant SmartHub.
6. **§6 direstrukturisasi**: contoh Go/Hono/Bun ditandai **legacy (produk V3)**; ditambahkan **§6.5 padanan SmartHub v1** (Express 5 + Prisma + Next.js 15) yang menjadi acuan, termasuk koreksi model data (`Warga.no_hp`, `AkunPengguna.email`).
7. **§8.1**: baris error handling disesuaikan dengan outbox + ditambahkan baris batas laju kirim.
8. Header dokumen kini memuat metadata versi/pemilik dan catatan stack.

> Semua perubahan di atas hanya pada **salinan lokal**. Ajukan ke tim Logikraf agar dokumen pusat ikut diperbarui.

> 📝 **Catatan:** Dokumen ini akan diperbarui seiring perkembangan implementasi platform Logikraf. Untuk repo ini, acuan implementasi adalah **§6.5** dan `docs/Architecture.md` SmartHub v1 bab integrasi eksternal.
