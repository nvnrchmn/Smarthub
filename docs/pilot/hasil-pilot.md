# Hasil Pilot 3–5 RT

| Atribut | Nilai |
|---|---|
| Nama Dokumen | Hasil Pilot (Validasi Harga) |
| Versi Dokumen | 0.1 (template) |
| Tanggal | 2026-09-23 |
| Pemilik Dokumen | Pemilik Produk / Founder |
| Status | Kosong — diisi setelah pilot berjalan |
| Dokumen Terkait | `PRD.md` 2.3, `Architecture.md` 2.3, `docs/pilot/rencana-validasi-harga.md` |

> **Cara pakai.** Catat fakta dan angka apa adanya. Jangan menyimpulkan "berhasil" tanpa memenuhi kriteria go/no-go di `rencana-validasi-harga.md` Bab 6. Simpan bukti (tanggal trial, komitmen tertulis, tangkapan layar ringkasan kas) di luar repositori bila memuat data pribadi.

---

## 1. Ringkasan Eksekutif

| Pertanyaan | Jawaban |
|---|---|
| Jumlah RT yang menyelesaikan trial |  |
| Jumlah RT yang berkomitmen membayar ≥Rp75.000/bulan |  |
| Jumlah RT yang meminta QRIS |  |
| Rata-rata jam onboarding per RT |  |
| Keputusan (GO / PERTIMBANGKAN ULANG HARGA / NO-GO) |  |
| Tanggal keputusan |  |

---

## 2. Hasil per RT

| Nama RT | Jumlah rumah | Mulai trial | Selesai trial | Aktif dipakai? | Harga disetujui | Jam onboarding | Jam bendahara sebelum | Jam bendahara sesudah | Minta QRIS | Status | Bukti |
|---|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |

---

## 3. Jawaban Enam Pertanyaan Kunci

| # | Pertanyaan | Rangkuman jawaban lintas RT |
|---|---|---|
| 1 | Berapa jam/bulan bendahara mencatat iuran? |  |
| 2 | Berapa tunggakan yang tidak terdeteksi? |  |
| 3 | Apa yang terjadi saat pengurus berganti? |  |
| 4 | Apakah warga menuntut bukti pembayaran? |  |
| 5 | Apakah RT siap membayar langganan, dan berapa? |  |
| 6 | Apakah RT menuntut QRIS? |  |

---

## 4. Umpan Balik & Permintaan Fitur

| RT | Fitur yang diminta | Sering diminta? | Catatan kelayakan |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

Masalah/kendala yang berulang (onboarding, UX, data awal):

- 
- 

---

## 5. Keputusan Setelah Pilot

Pilih satu dan beri alasan berbasis data di Bab 2:

- [ ] **Lanjut ke multi-tenancy** — retrofit `id_tenant` + registrasi self-serve (PRD P1). Alasan: ___
- [ ] **Ubah harga** — sesuaikan Basic/Pro/diskon pilot. Usulan harga baru: ___
- [ ] **Ubah model** — ubah segmen, proposisi nilai, atau kanal akuisisi. Usulan: ___
- [ ] **Hentikan** — tidak ada bukti kesediaan bayar. Alasan: ___

**Gate berikutnya bila lanjut:**

- [ ] Retrofit `id_tenant` dimulai (hanya setelah gate pilot terpenuhi, `Architecture.md` Lampiran B.4).
- [ ] Bila ≥1 RT meminta QRIS: mulai negosiasi **tarif flat per transaksi** dengan Logikraf **sebelum** membangun integrasi Hub (PRD P2).
- [ ] Perbarui `PRD.md` / `Architecture.md` bila hasil pilot mengubah asumsi harga, kuota, atau prioritas.

---

## 6. Pelajaran Proses

| Pertanyaan | Catatan |
|---|---|
| Berapa lama rata-rata dari kontak pertama ke trial aktif? |  |
| Bagian onboarding mana yang paling memakan waktu? |  |
| Apakah alur transfer manual dipahami tanpa pelatihan tambahan? |  |
| Apakah ada RT yang kembali ke Excel? Mengapa? |  |
| Estimasi jam kerja per RT — dapatkah diskalakan? |  |

---

## 7. Pilot KYC & Pencairan (teknis)

Diisi mengikuti `docs/pilot/runbook-kyc-payout.md`. Catat hanya fakta (tanpa menyalin NIK/`file_id`/payload KYC).

| # | Item | Hasil | Tanggal | Bukti/Correlation-Id |
|---|---|---|---|---|
| 7.1 | Koneksi Hub terverifikasi (`LOGIKRAF_HUB_MOCK=false`) |  |  |  |
| 7.2 | Sub-akun dibuat (H1) |  |  |  |
| 7.3 | KYC disubmit (H3/H4) |  |  |  |
| 7.4 | Status `LIVE` (webhook `account.verification`) |  |  |  |
| 7.5 | Kanal QRIS aktif (badge di `/verifikasi`) |  |  |  |
| 7.6 | QRIS uji ≤ Rp10.000 terbayar |  |  |  |
| 7.7 | Ledger seimbang & rekonsiliasi `seimbang` |  |  |  |
| 7.8 | Payout pertama ≤ Rp50.000 `SELESAI` + bukti |  |  |  |
| 7.9 | Alert: tidak ada webhook/payout gagal menumpuk |  |  |  |

| Pertanyaan | Catatan |
|---|---|
| Berapa lama dari submit KYC ke `LIVE`? |  |
| Berapa lama aktivasi kanal QRIS (setelah `LIVE`)? |  |
| Apakah pesan "kanal belum aktif" dipahami pengurus? |  |
| Adakah payout dobel saat retry? (harusnya tidak) |  |
| Kendala/insiden + tindak lanjut |  |
