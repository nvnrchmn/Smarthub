# Rencana Validasi Harga — Pilot 3–5 RT

| Atribut | Nilai |
|---|---|
| Nama Dokumen | Rencana Validasi Harga (Pilot RT) |
| Versi Dokumen | 1.0 |
| Tanggal | 2026-09-23 |
| Pemilik Dokumen | Pemilik Produk / Founder |
| Status | Aktif — dijalankan sebelum investasi multi-tenancy |
| Dokumen Terkait | `PRD.md` 2.3, `Architecture.md` 2.3, `docs/pilot/hasil-pilot.md` |

> **Prinsip pilot.** Pilot ini **tidak menulis kode baru**. Tujuannya menguji kesediaan bayar RT dengan **produk yang sudah ada**: alur transfer manual (terbitkan tagihan → warga unggah bukti → bendahara verifikasi → kas terbarui). Multi-tenancy dan integrasi Logikraf Payment Hub **tidak dikerjakan sebelum pilot selesai** (lihat `Architecture.md` Lampiran B.4).

---

## 1. Tujuan & Hipotesis

**Hipotesis yang diuji:**

> **≥3 dari 5 RT bersedia membayar ≥Rp75.000/bulan untuk menggantikan pencatatan manual.**

Tujuan pilot:

1. Mengukur **kesediaan bayar** nyata (bukan minat lisan) atas langganan bulanan.
2. Mengukur **waktu onboarding per RT** (impor data, pembuatan akun, pelatihan) sebagai dasar keputusan skalabilitas.
3. Mengetahui apakah RT **menuntut QRIS** — sinyal untuk menegosiasikan tarif flat dengan Logikraf, bukan alasan membangun lebih dulu.
4. Mengumpulkan **data umpan balik** (jam kerja bendahara, tunggakan, bukti pembayaran) sebagai bahan testimoni.

**Bukan tujuan pilot:** membangun fitur baru, integrasi pembayaran, atau multi-tenancy. Aplikasi berjalan pada **satu instance per RT** (atau satu instance dengan data terpisah bila retrofit sudah ada).

**Ukuran keberhasilan dijaga terukur.** "Berhasil" hanya diakui bila memenuhi **Kriteria go/no-go** pada Bab 6 dengan angka, bukan kesan.

---

## 2. Profil Target

Cari **5 RT** dengan ciri berikut:

| Kriteria | Rentang |
|---|---|
| Jumlah rumah | 50–300 rumah |
| Iuran bulanan rutin | ≥Rp50.000 per rumah |
| Administrasi saat ini | Buku kas manual dan/atau spreadsheet, komunikasi lewat WhatsApp |
| Rotasi pengurus | Berganti setiap 1–3 tahun |
| Lokasi | Terjangkau untuk onboarding tatap muka/online oleh tim |

**Kecualikan** RT yang sudah memakai aplikasi kas berbayar lain atau yang tidak memiliki iuran rutin — keduanya mengaburkan sinyal harga.

---

## 3. Penawaran

Harga dan isi paket mengikuti `PRD.md` Bab 4.2. Selama pilot, **harga pilot** ditawarkan.

| Paket | Batas rumah | Bulanan | Tahunan | Isi utama |
|---|---|---|---|---|
| Basic | 100 | Rp75.000 | Rp750.000 | Kependudukan, keamanan, keuangan (termasuk transfer manual + verifikasi), diskusi |
| Pro | 300 | Rp150.000 | Rp1.500.000 | Semua Basic + marketplace, notifikasi WhatsApp/email, laporan ekspor |
| Enterprise | Tidak dibatasi | Rp400.000 | Rp4.000.000 | Semua Pro + multi-blok, SLA, pendampingan onboarding, ekspor lanjutan |
| **Pilot (6 bulan pertama)** | 300 | **Rp37.500** | — | Setara Pro, dengan imbalan **testimoni + data umpan balik** |

Ketentuan pilot:

- **Trial 30 hari** dengan seluruh fitur Pro, tanpa kartu/komitmen.
- Setelah trial, RT yang lanjut mendapat **harga pilot Rp37.500/bulan selama 6 bulan** (kuota ≤300 rumah, fitur setara Pro).
- Imbalan pilot: **testimoni** (boleh anonim) dan **data umpan balik** (jam kerja bendahara, tunggakan yang terdeteksi, alasan bertahan).
- **Diskon tahunan tidak berlaku selama pilot.** Tujuannya menguji kesediaan bayar **bulanan**, bukan mengunci komitmen tahunan lebih awal.
- Pembayaran langganan pada tahap pilot memakai **transfer manual + verifikasi** (volume satu tagihan per RT per bulan). QRIS untuk langganan/iuran menyusul bila integrasi Hub diaktifkan (PRD P2).

### Yang TIDAK termasuk dalam harga paket

- **QRIS iuran** — opsional per tenant, baru relevan bila RT memintanya; berlaku biaya layanan `maksimum(Rp2.500, 3% × nominal)` (PRD Bab 4.3). **Tanpa QRIS, tidak ada biaya transaksi sama sekali** bagi RT maupun SmartHub.
- **Sistem akuntansi penuh** (jurnal umum berpasangan) — SmartHub menyediakan catatan kas dan ekspor, bukan pengganti Accurate/Excel penuh.
- **Kartu kredit/cicilan**, modul RW/multi-RT, CCTV/IoT, dan multi-bahasa (lihat PRD Bab 3.4).

---

## 4. Skrip Percakapan

Fokus pada **waktu yang dihemat**, bukan daftar fitur. Jangan memulai dengan "ini aplikasinya"; mulailah dengan pertanyaan kerja bendahara.

### 4.1 Dengan Ketua RT (5–10 menit)

1. **Pembuka:** "Pak/Bu, berapa lama biasanya bendahara menyiapkan laporan kas tiap bulan, dan berapa kali harus menagih ulang warga yang belum bayar?"
2. **Gali masalah:** "Kalau ada warga yang mengaku sudah bayar tapi tidak tercatat, bagaimana cara memastikannya sekarang?"
3. **Saat pengurus berganti:** "Ketika bendahara berganti, berapa lama proses serah-terima catatan kas berjalan?"
4. **Jembatan solusi:** "SmartHub menyimpan catatan iuran per rumah, menerima bukti transfer dari warga, dan bendahara tinggal memverifikasi. Laporan bulanan langsung siap untuk rapat."
5. **Tawaran:** sebutkan harga **Rp37.500/bulan untuk 6 bulan pertama** (setelah trial 30 hari), batas 300 rumah, tanpa biaya transaksi karena memakai transfer manual.
6. **Penutup:** "Boleh saya bantu pasang dan isi data 20 rumah dulu sebagai contoh? Kalau setelah sebulan tidak menghemat waktu, tidak ada komitmen."

### 4.2 Dengan Bendahara (10–15 menit)

1. **Pembuka:** "Berapa jam per bulan Ibu/Bapak habiskan untuk mencatat iuran dan mencocokkan bukti transfer?"
2. **Gali masalah:** "Berapa tunggakan yang biasanya tidak terdeteksi sampai akhir tahun?"
3. **Tunjukkan alur nyata (bukan tur fitur):** terbitkan tagihan untuk seluruh rumah, warga unggah bukti dari HP, bendahara klik verifikasi, saldo kas terbarui otomatis.
4. **Transparansi:** tunjukkan bahwa warga dapat melihat status pembayarannya sendiri, sehingga berkurang pertanyaan "uang saya sudah masuk belum?".
5. **Penawaran:** jelaskan bahwa selama paket berjalan **tanpa QRIS**, tidak ada potongan biaya transaksi; QRIS hanya bila RT memintanya.
6. **Penutup:** sepakati tanggal onboarding dan minta komitmen **6 bulan** tertulis bila berminat.

**Aturan komunikasi:** jangan menjanjikan fitur yang belum ada; jangan menyebut QRIS sebagai keharusan; jangan menjanjikan pencairan dana instan (pencairan baru relevan bila QRIS aktif).

---

## 5. Enam Pertanyaan Kunci

Ajukan keenam pertanyaan ini ke setiap RT dan **catat jawabannya di lembar pelacakan** (Bab 7).

| # | Pertanyaan | Yang dicatat |
|---|---|---|
| 1 | Berapa jam per bulan bendahara mencatat iuran dan mencocokkan bukti? | Jam/bulan sebelum vs sesudah (perkiraan) |
| 2 | Berapa tunggakan yang tidak terdeteksi per tahun? | Perkiraan nominal/rumah |
| 3 | Apa yang terjadi saat pengurus berganti? | Lama serah-terima, risiko data hilang |
| 4 | Apakah warga menuntut bukti pembayaran? | Ya/tidak, bentuk tuntutan |
| 5 | Apakah RT siap membayar langganan, dan berapa? | Nominal yang disetujui atau alasan menolak |
| 6 | Apakah RT menuntut QRIS? | Ya/tidak, alasan |

---

## 6. Kriteria Go/No-Go

Keputusan diambil setelah **≥3 RT** menyelesaikan trial dan diwawancara ulang.

| Hasil | Kriteria terukur | Tindak lanjut |
|---|---|---|
| **GO** | **≥3 RT** berkomitmen membayar **≥Rp75.000/bulan** (atau menandatangani komitmen 6 bulan) **DAN ≥1 RT meminta QRIS** | Lanjut: retrofit `id_tenant` + registrasi self-serve (PRD P1); mulai negosiasi tarif flat QRIS dengan Logikraf |
| **PERTIMBANGKAN ULANG HARGA** | **2 RT** berminat tetapi menolak harga | Evaluasi struktur harga/diskon; ulangi penawaran ke prospek baru sebelum memutuskan |
| **NO-GO** | **<2 RT** bersedia membayar, **atau** bendahara kembali ke Excel dalam **2 bulan** | Hentikan investasi multi-tenancy; tinjau ulang model (harga, segmen, atau proposisi nilai) |

Catatan: **tidak ada RT yang meminta QRIS** bukan alasan no-go; itu sinyal bahwa fokus tetap pada alur manual dan langganan.

---

## 7. Lembar Pelacakan per RT

Isi satu baris per RT (perbarui sepanjang pilot). Rekapnya dipindahkan ke `hasil-pilot.md`.

| Nama RT | Jumlah rumah | Kontak | Minat (Y/T) | Harga disetujui | Mulai trial | Impor data (jam) | Jam bendahara sebelum | Alasan menolak | Permintaan fitur/QRIS | Status akhir |
|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |

Jangan mencatat data pribadi warga (NIK, nomor HP warga) di dokumen ini — cukup data tingkat RT.

---

## 8. Checklist Kesiapan Teknis Pilot

Jalur tercepat **tanpa multi-tenancy**:

- [ ] Satu instance per RT (atau satu instance dengan data terpisah bila retrofit `id_tenant` sudah jalan).
- [ ] Impor data awal rumah + KK + warga (Excel) — **pekerjaan manual; catat jam kerjanya per RT**.
- [ ] Akun untuk ketua, bendahara, sekretaris, keamanan, dan sebagian warga.
- [ ] **Uji end-to-end alur manual:** terbitkan tagihan → warga unggah bukti → bendahara verifikasi → kas terbarui → ringkasan benar.
- [ ] Backup harian terenkripsi + **satu kali uji restore** ke lingkungan terpisah.
- [ ] Aplikasi dapat diakses dari HP di luar rumah (HTTPS + domain).
- [ ] Perkiraan **jam kerja onboarding per RT** tercatat (menentukan apakah model bisnis dapat diskalakan).

> **Estimasi jam kerja per RT** wajib diisi. Angka ini adalah keluaran utama pilot selain kesediaan bayar: bila satu RT butuh puluhan jam onboarding manual, retrofit multi-tenancy dan wizard self-serve menjadi prioritas lebih tinggi.

---

## 9. Matriks Harga Final

Harga yang **benar-benar akan ditawarkan** selama pilot (bukan rentang):

| Item | Ketentuan final |
|---|---|
| Trial | 30 hari, seluruh fitur Pro, tanpa komitmen |
| Harga pilot | **Rp37.500/bulan × 6 bulan** (kuota ≤300 rumah, fitur setara Pro), syarat testimoni + data umpan balik |
| Basic | Rp75.000/bulan · Rp750.000/tahun (hemat 2 bulan) |
| Pro | Rp150.000/bulan · Rp1.500.000/tahun (hemat 2 bulan) |
| Enterprise | Rp400.000/bulan · Rp4.000.000/tahun |
| Diskon tahunan selama pilot | **Tidak berlaku** (pilot menguji komitmen bulanan) |
| QRIS iuran | Opsional; bila diaktifkan, biaya layanan `maksimum(Rp2.500, 3% × nominal)`, MDR ±0,7% dan biaya transfer ditanggung RT (PRD Bab 4.3) |
| Biaya transaksi tanpa QRIS | **Rp0** (transfer manual) |

Perubahan harga di luar tabel ini memerlukan persetujuan pemilik produk (pertanyaan terbuka PRD/plan).
