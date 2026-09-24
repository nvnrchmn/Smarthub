# Runbook Pilot KYC & Pencairan

| Atribut | Nilai |
|---|---|
| Nama Dokumen | Runbook Pilot KYC/Payout |
| Versi | 1.0 |
| Tanggal | 2026-09-24 |
| Pemilik | Tim SmartHub |
| Status | Siap dipakai (Tahap P menunggu kredensial Hub) |
| Terkait | `docs/plans/kyc-payout-plan.md` Bab 4 · `docs/logikraf/payment-hub-integration-guide.md` · Rencana Hardening G-A…G-F |

> **Prinsip.** SmartHub tidak menyimpan berkas KTP/selfie dan tidak memegang secret penyedia. Semua panggilan ke penyedia melewati **Logikraf Payment Hub**. Dokumen KTP hanya lewat Hub → penyedia.

---

## 1. Prasyarat sebelum mulai

- [ ] Tenant pilot dipilih (1 RT) + operator harian (Ketua/Bendahara) ditunjuk.
- [ ] Kredensial Hub tersedia dan terisi di lingkungan uji/produksi:
  `LOGIKRAF_HUB_BASE_URL`, `LOGIKRAF_HUB_API_KEY` **atau** `LOGIKRAF_INTERNAL_API_KEY`,
  `LOGIKRAF_HUB_WEBHOOK_SECRET`, `LOGIKRAF_INTERNAL_API_KEY`.
- [ ] `LOGIKRAF_HUB_MOCK=false` dan konektivitas Hub terverifikasi (lihat §2).
- [ ] Webhook Hub diarahkan ke **`https://smarthub.logikraf.id/api/v1/billing/webhook`** dan HMAC
  `X-Logikraf-Signature-Hmac` cocok dengan `LOGIKRAF_HUB_WEBHOOK_SECRET` (fallback: shared secret
  mentah pada `X-Logikraf-Signature`).
- [ ] Hub live di **`https://logikraf.id`** (callback Xendit: `/api/webhooks/xendit`, `/api/webhooks/xendit/qris`);
  `LOGIKRAF_HUB_BASE_URL="https://logikraf.id"` di SmartHub.
- [ ] KTP pemilik akun RT **berbeda** dari KTP Master Account Logikraf.
- [ ] Aktivasi kanal QRIS per sub-akun sudah dijadwalkan dengan Logikraf.
- [ ] `WORKERS_ENABLED=true` agar alert harian berjalan.
- [ ] **Sisi Hub** (repo LogikaKreatifIndonesia): isi `XENDIT_PAYOUT_ROUTING_TYPE`,
      `XENDIT_KYC_MOBILE_NUMBER`, `XENDIT_KYC_INDUSTRY_CODE`, dan pastikan API key
      berizin MONEY-OUT + Account Write (lihat `docs/payment-hub-integration-guide.md` §9.4–9.6).
- [ ] Nominal uji disepakati: **QRIS ≤ Rp10.000**, **payout pertama ≤ Rp50.000**.

## 2. Verifikasi koneksi Hub (P1)

1. Pastikan `LOGIKRAF_HUB_MOCK=false`.
2. Jalankan pemeriksaan ringan dari environment yang sama dengan API:
   - panggil `GET /api/v1/billing/saldo` sebagai Bendahara; 503 = Hub belum dikonfigurasi.
   - periksa log API: setiap panggilan Hub mencatat `hub.path`, `hub.correlationId`, dan status.
3. Bila muncul `Hub menolak permintaan (401/403)`, periksa kunci internal/kredensial bersama tim Hub.
4. Catat `correlationId` saat mengeskalasi; jangan pernah mengirim NIK/berkas pada tiket.

## 3. Urutan onboarding RT (P2)

> Urutan berikut **wajib**: sub-akun → KYC → tunggu `LIVE` → aktivasi kanal → uji QRIS → payout.

1. **Buat sub-akun** — buka **Verifikasi Identitas** (`/verifikasi`) → *Mulai Verifikasi*
   (nama penanggung jawab + email). SmartHub memanggil `POST /api/client-store/accounts` (H1), header `X-Internal-Key`.
2. **Unggah dokumen & submit KYC** — unggah KTP depan, KTP belakang, selfie (maks 5 MB; JPG/PNG/WEBP/PDF),
   isi data diri + data usaha, centang persetujuan, ketik nama penandatangan, lalu kirim (H3 + H4).
   Hub yang men-generate & mengunggah `service_agreement_document`.
3. **Tunggu `LIVE`** — status berubah lewat webhook `account.verification` (PASSED → LIVE).
   Bila `AWAITING_RESUBMISSION`, perbaiki data sesuai alasan lalu kirim ulang.
4. **Aktivasi kanal QRIS oleh Logikraf** (manual per sub-akun). Sampai aktif, halaman Verifikasi
   menampilkan **Kanal QRIS: Belum aktif** dan pembuatan QRIS ditolak dengan pesan netral.
5. **Tambah rekening pencairan** di **Rekening Pencairan** (`/pengaturan/rekening`); tandai default.
6. **Uji QRIS kecil** — buat tagihan uji ≤ Rp10.000, bayar, pastikan webhook pembayaran masuk,
   ledger seimbang, dan `net_ke_rt = jumlah − Rp2.500 − MDR`.
7. **Payout pertama** — ajukan ≤ Rp50.000 di **Pencairan Dana** (`/pencairan`), tunggu webhook
   `payout.*` sampai status `SELESAI`, verifikasi dana masuk + bukti transfer.
8. Jalankan `GET /api/v1/admin` → alert: pastikan tidak ada webhook/payout gagal yang menumpuk.

## 4. Peringatan penting

- **KTP ≠ Master.** KTP penanggung jawab RT harus berbeda dari KTP Master Account; kalau tidak, KYC ditolak.
- **Batas QRIS Rp10.000.000** per transaksi. Tagihan lebih besar harus dipecah atau transfer manual.
- **QRIS tidak otomatis aktif** setelah `LIVE`; menunggu aktivasi manual Logikraf.
- **Payout dobel dicegah** oleh `Idempotency-Key` stabil (`sb-pencairan-<id>`). Jangan mengubah
  kunci ini saat retry; status `DUPLICATE_ERROR` dari Hub bukan kegagalan.
- **Refund tidak mengembalikan split fee** (kebijakan platform). Sampaikan di T&C.
- **Jangan menyalin** NIK, `file_id`, atau payload KYC penuh ke tiket/chat/log. Gunakan NIK ter-mask.

## 5. Eskalasi

| Gejala | Tindakan |
|---|---|
| 401/403 dari Hub | Cek kunci internal & `LOGIKRAF_HUB_BASE_URL`; hubungi tim Hub dengan `correlationId`. |
| Timeout/5xx berulang | Klien Hub otomatis retry 2× (5xx/timeout). Bila tetap gagal, catat `correlationId` + jam, eskalasi ke Hub. |
| KYC `DECLINED` | Baca `failure_reasons` (netral) di halaman Verifikasi; perbaiki data bila memungkinkan, eskalasi bila bukan. |
| QRIS ditolak "kanal belum aktif" | Konfirmasi status aktivasi kanal ke Logikraf; jangan buat QRIS berulang. |
| Payout `GAGAL` | Cek `failure_code` di `/pencairan`; pastikan rekening benar; ajukan ulang lewat alur settlement. |
| Webhook hilang | Alert harian menampilkan webhook belum diproses; minta Hub mengirim ulang event. |

**Kontak:** kanal dukungan Logikraf (WhatsApp/tim Hub) + pemilik produk SmartHub. Sertakan
`correlationId`, waktu kejadian, dan `event_id` (bila webhook) — tanpa data pribadi.

## 6. Kriteria sukses pilot

- [ ] KYC `LIVE` untuk 1 RT nyata.
- [ ] Kanal QRIS aktif (terlihat di halaman Verifikasi).
- [ ] QRIS uji terbayar; ledger seimbang; rekonsiliasi `seimbang`.
- [ ] Payout `SELESAI` + dana masuk rekening + bukti transfer.
- [ ] Tidak ada webhook/payout gagal yang belum ditindaklanjuti.
- [ ] Hasil dicatat di `docs/pilot/hasil-pilot.md` §7.
