# API Contract — SmartHub SaaS

| Atribut | Nilai |
|---|---|
| Nama Produk | SmartHub — Platform Manajemen Warga & Kas RT |
| Versi Dokumen | 2.2 (KYC & Payout via Hub; Fee Flat Rp2.500) |
| Tanggal | 2026-09-22 |
| Pemilik Dokumen | Tim Teknis / Founder |
| Base URL | `/api/v1` |
| Format | JSON (UTF-8) |
| Autentikasi | JWT Bearer — `Authorization: Bearer <JWT>`; di web token dipegang cookie httpOnly oleh BFF Next.js |
| Otorisasi | RBAC (matriks di `PRD.md` bab 6) + isolasi tenant dari JWT; endpoint internal di luar JWT (lihat Konvensi) |
| Status | Disetujui untuk menjadi acuan implementasi |
| Dokumen Terkait | `PRD.md` 2.3, `Architecture.md` 2.3, `UI-UX-Design.md` 1.1, `docs/pilot/rencana-validasi-harga.md`, `docs/logikraf/payment-hub-integration-guide.md`, `docs/logikraf/notifications-architecture.md` |

> **Sumber kebenaran hak akses adalah matriks RBAC di `PRD.md` bab 6.** Nama entitas, modul, dan istilah mengikuti `PRD.md`. Dokumen ini menambahkan kontrak transport (HTTP) di atas keputusan produk tersebut.

> **Penyelarasan Platform Logikraf (2.1).** SmartHub saat ini adalah **SmartHub v1** (Node 22 + Express 5 + Prisma + Next.js 15). Nama "Smarthub V3" (Hono/Bun/Drizzle) adalah produk lama dan **bukan** acuan dokumen ini. Seluruh pembayaran melewati **Logikraf Payment Hub**; SmartHub terdaftar sebagai **Client Store Logikraf** dengan prefix `external_id` **`sb-`** dan **tidak pernah memegang API key Xendit**. Webhook pembayaran masuk ke SmartHub berasal dari **Hub**, bukan dari Xendit langsung.

> **Penanda status.** Endpoint bertanda **TERIMPLEMENTASI** benar-benar ada di kode (`apps/api/src/modules/**/*.routes.ts`) pada 2026-09-22. Endpoint bertanda **TARGET** adalah kontrak yang direncanakan untuk Fase SaaS dan **belum ada di kode**; penanda ini konsisten dengan `PRD.md` Lampiran A.2.

---

## Konvensi

### Envelope Respons

- **Sukses**: `{ "status": "success", "message": <string>, "data": <object|array|null> }`, ditambah `"meta"` bila respons berpaginasi.
- **Error**: `{ "status": "error", "message": <string>, "errors": [{ "field": <string>, "message": <string> }] }`.

```json
{
  "status": "error",
  "message": "Akses ditolak untuk role ini",
  "errors": []
}
```

### Kode Status HTTP

| Kode | Arti |
|---|---|
| `200` | Sukses umum (`GET`, `PATCH`, `PUT`, sebagian `POST`) |
| `201` | Sumber daya baru dibuat (`POST` pembuatan) |
| `204` | Sukses tanpa body (bila digunakan) |
| `400` | Permintaan tidak valid (mis. JSON rusak, aksi tidak boleh) |
| `401` | Belum terautentikasi / token tidak valid |
| `403` | Terautentikasi tetapi tidak berhak (role atau tenant) |
| `404` | Sumber daya tidak ditemukan atau di luar lingkup tenant |
| `409` | Konflik (data duplikat, laporan ganda, referensi masih dipakai) |
| `422` | Validasi gagal (skema Zod) |
| `500` | Kesalahan server |

Error validasi (422) selalu membawa daftar `errors` per field:

```json
{
  "status": "error",
  "message": "Validasi gagal",
  "errors": [
    { "field": "nomor_rumah", "message": "Nomor rumah wajib diisi" }
  ]
}
```

### Paginasi

- **Offset** — query `page` (default `1`), `limit` (default `20`), `sort` (contoh `-createdAt`). Respons menyertakan:

```json
{ "meta": { "page": 1, "limit": 20, "total": 57 } }
```

- **Cursor** — dipakai oleh **feed diskusi**. Query `limit` + `cursor` (opsional). Respons menyertakan:

```json
{ "meta": { "limit": 10, "total": 57, "next_cursor": 42, "has_more": true } }
```

`next_cursor` bernilai `null` bila tidak ada halaman berikutnya.

### Uang & Tanggal

- **Uang** selalu **string desimal 2 angka** pada respons, contoh `"75000.00"`. Nominal boleh dikirim klien sebagai angka maupun string, tetapi selalu dikembalikan sebagai string.
- **Tanggal** date-only memakai `YYYY-MM-DD` (contoh `"2026-09-22"`); timestamp memakai ISO 8601 UTC (contoh `"2026-09-22T13:23:34.651Z"`).

### Autentikasi & Token

- Header: `Authorization: Bearer <JWT>`.
- **Payload token (saat ini)**: `{ id_pengguna, nik, role }`. Pada web, token disimpan pada cookie httpOnly dan tidak diekspos ke JavaScript halaman; seluruh panggilan API dari browser melewati BFF Next.js.
- Pada **TARGET Fase SaaS**, payload token pengguna tenant diperluas menjadi `{ id_pengguna, nik, role, id_tenant }`. Selama transisi, `id_tenant` boleh diresolusi server-side dari `id_pengguna`, tetapi **tidak pernah** berasal dari klien.
- Autentikasi akun platform memakai tabel terpisah `AkunPlatform` (bukan `AkunPengguna`) dengan audiens token sendiri; peran platform tidak pernah bercampur dengan peran RT.

### Isolasi Tenant — `id_tenant` Hanya dari JWT

> **Aturan tanpa kecuali.** `id_tenant` **selalu** diambil dari token hasil autentikasi, **tidak pernah** diterima dari klien — tidak lewat body, query, path, header (`X-Tenant-ID`), maupun cookie pilihan pengguna.

Konsekuensi kontrak:

1. Tidak ada endpoint yang menerima `id_tenant` sebagai input. Permintaan yang menyertakannya diabaikan atau ditolak `400`.
2. Setiap query data domain otomatis ter-scope ke `id_tenant` pelaku. Sumber daya milik tenant lain berperilaku **`404`** (bukan `403`) agar keberadaannya tidak bocor.
3. Akses sumber daya lintas tenant lewat ID langsung akan gagal pada filter tenant, sehingga mencegah IDOR lintas tenant.
4. Peran platform tidak otomatis memiliki `id_tenant`; akses mereka ke data tenant hanya lewat fitur konsol yang tercatat audit (bab 11).

### Endpoint Internal (Hub → SmartHub)

Kelompok endpoint **internal** bukan bagian dari API publik produk. Kontrak ini hanya dipakai oleh **Logikraf Payment Hub** untuk settlement dan rekonsiliasi (bab 10) dan **wajib disediakan bila** integrasi Hub (QRIS iuran) diaktifkan; alur transfer manual yang menjadi baseline **tidak memerlukannya** (PRD Bab 3.3 & 13).

- **Header autentikasi:** `X-Logikraf-Internal-Key` (symmetric secret dari dashboard Logikraf). Bandingkan nilai dengan *constant-time compare* dan tolak `401` bila tidak cocok.
- **Di luar JWT:** endpoint internal **tidak** memakai `Authorization: Bearer` dan **tidak** ter-scope tenant dari JWT; identitas tenant datang dari data Hub yang sudah tepercaya.
- **Hanya untuk Hub:** endpoint tidak dipublikasikan, dibatasi pada jaringan internal/allowlist IP Hub, dan **tidak boleh** didaftarkan di OpenAPI maupun dokumentasi publik produk.
- **Tanpa kebocoran rahasia:** respons tidak memuat API key Xendit maupun nilai `X-Logikraf-Internal-Key`.
- **Audit:** setiap aksi internal tercatat pada audit log.

Daftar lengkap endpoint internal ada di `10.16`–`10.20`.

### Versi & Kebijakan Deprecation

- Versi API berada di path: `/api/v1`. Perubahan **breaking** hanya dirilis pada versi mayor baru (`/api/v2`).
- Perubahan **non-breaking** (menambah field respons, menambah nilai enum, menambah endpoint) boleh terjadi di dalam `/api/v1`.
- Endpoint yang akan dihentikan: (a) ditandai **Deprecated** di dokumen ini minimal **90 hari** sebelum penghapusan, (b) mengirim header respons `Deprecation: true` dan `Sunset: <HTTP-date>`, (c) tetap dilayani hingga tanggal `Sunset`, dan (d) endpoint pengganti dicantumkan.
- Perubahan perilaku yang tidak mengubah bentuk kontrak didokumentasikan pada `Lampiran D — Changelog`.

### Catatan Multi-Tenant pada Modul Existing

Mulai Fase SaaS, seluruh endpoint pada bab 1–8 **tetap sama secara bentuk** tetapi berubah perilaku:

- Setiap daftar (list) hanya mengembalikan data tenant pelaku; filter `id_tenant` tidak pernah tersedia sebagai parameter klien.
- Kolom `id_tenant` boleh disertakan pada respons konsol admin platform (bab 11), tetapi **tidak** pada respons untuk pengguna tenant.
- Endpoint akun (`/auth/akun*`) hanya menjangkau akun di tenant yang sama dengan pelaku.

---

## 1. Modul Autentikasi & Akun (`/api/v1/auth`)

**Status: TERIMPLEMENTASI.**

### Ringkasan Endpoint

| # | Method | Path | Akses | Deskripsi |
|---|---|---|---|---|
| 1.1 | POST | `/auth/login` | Public | Login tiga identitas (email / nomor HP / username) |
| 1.2 | POST | `/auth/register` | Ketua_RT, Sekretaris | Membuat akun pengguna dari warga terdata |
| 1.3 | GET | `/auth/me` | Semua Role | Profil pengguna aktif |
| 1.4 | PATCH | `/auth/password` | Semua Role | Ubah password sendiri |
| 1.5 | POST | `/auth/logout` | Semua Role | Logout |
| 1.6 | GET | `/auth/akun` | Ketua_RT, Sekretaris | Daftar akun pengguna tenant |
| 1.7 | GET | `/auth/akun/kandidat` | Ketua_RT, Sekretaris | Warga terdata yang belum punya akun |
| 1.8 | PATCH | `/auth/akun/:id_pengguna` | Ketua_RT, Sekretaris | Ubah role & email akun |
| 1.9 | POST | `/auth/akun/:id_pengguna/reset-password` | Ketua_RT, Sekretaris | Buat tautan reset password |
| 1.10 | POST | `/auth/reset-password` | Public (token) | Reset password dengan token |
| 1.11 | PATCH | `/auth/akun/:id_pengguna/status` | Ketua_RT | Ubah status akun (Aktif/Nonaktif) |
| 1.12 | POST | `/auth/upload` | Semua Role | Unggah berkas (`multipart/form-data`) |

### 1.1 Login Pengguna (TERIMPLEMENTASI)

- `POST /api/v1/auth/login` — Public.
- `identifier` menerima **email**, **nomor HP**, atau **username**. Jenis ditentukan otomatis:

| Bentuk `identifier` | Diperlakukan sebagai |
|---|---|
| mengandung `@` | email |
| hanya digit setelah `+`, `-`, spasi, `(`, `)`, `.` dibuang | nomor HP |
| selain itu | username (tidak case-sensitive) |

Username yang **seluruhnya angka ditolak** saat pembuatan/ubah akun, sehingga tidak pernah bentrok dengan nomor HP. Pesan gagal selalu seragam (`Email atau password salah`) agar tidak membocorkan akun mana yang terdaftar.

```json
{ "identifier": "ketuart@smarthub.local", "password": "PasswordSuperRT123" }
```

```json
{ "identifier": "081200000001", "password": "PasswordSuperRT123" }
```

```json
{ "identifier": "budi_santoso", "password": "PasswordSuperRT123" }
```

- Response Sukses (200 OK):

```json
{
  "status": "success",
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "pengguna": {
      "id_pengguna": 1,
      "nik": "3273012345670001",
      "email": "ketuart@smarthub.local",
      "role": "Ketua_RT"
    }
  }
}
```

### 1.2 Registrasi Akun Warga/Pengurus Baru (TERIMPLEMENTASI)

- `POST /api/v1/auth/register` — Ketua_RT, Sekretaris.
- Satu NIK maksimal satu akun. Username dibuat otomatis dari nama warga bila tidak diisi (UC-02).

```json
{
  "nik": "3273019876543210",
  "email": "budi.warga@email.com",
  "password": "WargaPassword55",
  "role": "Warga"
}
```

- Response Sukses (201 Created):

```json
{ "status": "success", "message": "Akun berhasil dibuat", "data": { "id_pengguna": 12, "nik": "3273019876543210", "role": "Warga" } }
```

### 1.3 Ambil Profil Pengguna Aktif (TERIMPLEMENTASI)

- `GET /api/v1/auth/me` — Semua Role.

```json
{
  "status": "success",
  "message": "Profil pengguna",
  "data": {
    "id_pengguna": 1,
    "nik": "3273012345670001",
    "email": "ketuart@smarthub.local",
    "role": "Ketua_RT",
    "status_akun": "Aktif"
  }
}
```

### 1.4 Ubah Password Sendiri (TERIMPLEMENTASI)

- `PATCH /api/v1/auth/password` — Semua Role.

```json
{ "password_lama": "PasswordSuperRT123", "password_baru": "PasswordBaru123" }
```

- Response Sukses (200 OK): `{ "status": "success", "message": "Password berhasil diubah", "data": null }`.

### 1.5 Logout (TERIMPLEMENTASI)

- `POST /api/v1/auth/logout` — Semua Role.
- Response Sukses (200 OK): `{ "status": "success", "message": "Logout berhasil", "data": null }`.
- **TARGET Fase SaaS:** logout juga mencabut `SesiRefreshToken` terkait.

### 1.6 Daftar Akun Pengguna (TERIMPLEMENTASI)

- `GET /api/v1/auth/akun?role=Warga&status_akun=Aktif&page=1&limit=20` — Ketua_RT, Sekretaris. Offset pagination.

```json
{
  "status": "success",
  "message": "Daftar akun",
  "data": [
    { "id_pengguna": 12, "nik": "3273019876543210", "email": "budi.warga@email.com", "role": "Warga", "status_akun": "Aktif" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 1.7 Daftar Kandidat Warga untuk Akun Baru (TERIMPLEMENTASI)

- `GET /api/v1/auth/akun/kandidat?q=Rina&page=1&limit=20` — Ketua_RT, Sekretaris.
- Hanya mengembalikan warga yang **belum memiliki akun**; `q` mencari pada `nama_lengkap` (case-insensitive) dan `nik`.

```json
{
  "status": "success",
  "message": "Daftar warga tanpa akun",
  "data": [
    { "nik": "3273019999990001", "nama_lengkap": "Rina Calon Akun", "no_kk": "3273011122334401", "nomor_rumah": "A-01", "blok": "Blok A" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 1.8 Ubah Role & Email Akun (TERIMPLEMENTASI)

- `PATCH /api/v1/auth/akun/:id_pengguna` — Ketua_RT, Sekretaris (UC-03).
- Minimal satu field diisi. Pengurus **tidak dapat** mengubah role akunnya sendiri (mencegah kehilangan akses Ketua RT).

```json
{ "role": "Bendahara", "email": "dewi.baru@smarthub.local" }
```

```json
{
  "status": "success",
  "message": "Data akun diperbarui",
  "data": {
    "id_pengguna": 3,
    "nik": "3273012345670003",
    "email": "dewi.baru@smarthub.local",
    "role": "Bendahara",
    "status_akun": "Aktif",
    "nama_lengkap": "Dewi Kartika"
  }
}
```

### 1.9 Buat Tautan Reset Password — Sisi Pengurus (TERIMPLEMENTASI)

- `POST /api/v1/auth/akun/:id_pengguna/reset-password` — Ketua_RT, Sekretaris.
- Tautan berlaku **1 jam** dan **sekali pakai** (token tidak berlaku setelah password berubah). Perilaku saat ini mengembalikan tautan ke pengurus untuk diteruskan; **TARGET Fase SaaS** mengirim otomatis via email (UC-13).

```json
{
  "status": "success",
  "message": "Tautan reset password dibuat",
  "data": {
    "id_pengguna": 5,
    "email": "warga@smarthub.local",
    "reset_link": "https://app.smarthub.local/reset-password?token=eyJhbGciOiJIUzI1NiIs...",
    "expires_at": "2026-09-22T13:23:34.651Z"
  }
}
```

### 1.10 Reset Password dengan Token (TERIMPLEMENTASI)

- `POST /api/v1/auth/reset-password` — Public (memerlukan token dari 1.9).

```json
{ "token": "eyJhbGciOiJIUzI1NiIs...", "password_baru": "PasswordBaru123" }
```

- Response Sukses (200 OK): `{ "status": "success", "message": "Password berhasil direset, silakan login kembali", "data": null }`.
- Response Gagal (400 Bad Request):

```json
{ "status": "error", "message": "Tautan reset password sudah pernah digunakan", "errors": [] }
```

### 1.11 Ubah Status Akun (TERIMPLEMENTASI)

- `PATCH /api/v1/auth/akun/:id_pengguna/status` — Ketua_RT (UC-03).
- Menonaktifkan akun **tidak** menghapus data warga terkait.

```json
{ "status_akun": "Nonaktif" }
```

```json
{ "status": "success", "message": "Status akun diperbarui", "data": { "id_pengguna": 12, "status_akun": "Nonaktif" } }
```

### 1.12 Unggah Berkas (TERIMPLEMENTASI)

- `POST /api/v1/auth/upload` — Semua Role, `multipart/form-data`, field `file`.
- **Koreksi 2.0:** path yang benar adalah `/api/v1/auth/upload` (dokumen 1.6 menulis `/api/v1/upload`).

```json
{ "status": "success", "message": "Berkas terunggah", "data": { "url": "https://cdn.smarthub.local/uploads/1699999999-struk.jpg" } }
```

> **TARGET Fase SaaS:** unggahan dipindahkan ke object storage B2 (S3-compatible) dengan *signed URL* berumur pendek; bentuk respons `url` tetap.

---

## 2. Modul Wilayah — Rumah (`/api/v1/wilayah`)

**Status: TERIMPLEMENTASI.**

| # | Method | Path | Akses | Deskripsi |
|---|---|---|---|---|
| 2.1 | POST | `/wilayah/rumah` | Ketua_RT, Sekretaris | Tambah rumah (UC-04) |
| 2.2 | GET | `/wilayah/rumah` | Ketua_RT, Sekretaris, Bendahara | Daftar rumah + filter |
| 2.3 | GET | `/wilayah/rumah/:id_rumah` | Ketua_RT, Sekretaris, Bendahara | Detail rumah + KK + anggota |
| 2.4 | PATCH | `/wilayah/rumah/:id_rumah` | Ketua_RT, Sekretaris | Ubah data rumah |

### 2.1 Tambah Inventaris Rumah Baru (TERIMPLEMENTASI)

```json
{
  "nomor_rumah": "B-05",
  "blok": "Blok B",
  "jalan_gang": "Jl. Mawar III",
  "status_kepemilikan": "Sewa_Kontrak",
  "status_hunian": "Dihuni"
}
```

- Response Sukses (201 Created): `{ "status": "success", "message": "Rumah berhasil ditambahkan", "data": { "id_rumah": 8, "nomor_rumah": "B-05" } }`.

### 2.2 Ambil Semua Daftar Rumah (TERIMPLEMENTASI)

- `GET /api/v1/wilayah/rumah?blok=Blok+B&status_hunian=Dihuni&page=1&limit=20`.
- **Perubahan Fase SaaS:** hasil otomatis ter-scope `id_tenant`; jumlah rumah dipakai menghitung kuota paket (bab 9).

```json
{
  "status": "success",
  "message": "Daftar rumah",
  "data": [ { "id_rumah": 8, "nomor_rumah": "B-05", "blok": "Blok B", "status_hunian": "Dihuni" } ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 2.3 Ambil Detail Rumah, KK, & Anggota Keluarga (TERIMPLEMENTASI)

- `GET /api/v1/wilayah/rumah/:id_rumah`.

```json
{
  "status": "success",
  "message": "Detail rumah",
  "data": {
    "id_rumah": 8,
    "nomor_rumah": "B-05",
    "kartu_keluarga": [
      {
        "no_kk": "3273011122334455",
        "warga": [ { "nik": "3273019876543210", "nama_lengkap": "Budi Santoso", "status_aktif": "Aktif" } ]
      }
    ]
  }
}
```

### 2.4 Ubah Data Rumah (TERIMPLEMENTASI)

- `PATCH /api/v1/wilayah/rumah/:id_rumah` — body parsial.

```json
{ "status_hunian": "Tidak_Dihuni", "status_kepemilikan": "Kosong" }
```

```json
{ "status": "success", "message": "Data rumah diperbarui", "data": { "id_rumah": 8, "status_hunian": "Tidak_Dihuni" } }
```

---

## 3. Modul Kependudukan (`/api/v1/kependudukan`)

**Status: TERIMPLEMENTASI.**

| # | Method | Path | Akses | Deskripsi |
|---|---|---|---|---|
| 3.1 | POST | `/kependudukan/kk` | Ketua_RT, Sekretaris | Tambah KK (UC-05) |
| 3.2 | GET | `/kependudukan/kk/saya` | Warga | Data keluarga sendiri |
| 3.3 | GET | `/kependudukan/kk` | Ketua_RT, Sekretaris, Bendahara | Daftar KK + filter |
| 3.4 | GET | `/kependudukan/kk/:no_kk` | Ketua_RT, Sekretaris, Bendahara | Detail KK + anggota |
| 3.5 | PATCH | `/kependudukan/kk/:no_kk` | Ketua_RT, Sekretaris | Ubah data KK |
| 3.6 | POST | `/kependudukan/warga` | Ketua_RT, Sekretaris | Tambah biodata warga (UC-06) |
| 3.7 | GET | `/kependudukan/warga` | Ketua_RT, Sekretaris, Bendahara | Daftar warga + filter |
| 3.8 | GET | `/kependudukan/warga/:nik` | Ketua_RT, Sekretaris, Bendahara | Detail warga |
| 3.9 | PATCH | `/kependudukan/warga/:nik/status` | Ketua_RT, Sekretaris | Ubah `status_aktif` (soft-delete) |
| 3.10 | PATCH | `/kependudukan/warga/:nik` | Ketua_RT, Sekretaris | Ubah biodata warga |
| 3.11 | POST | `/kependudukan/mutasi` | Sekretaris | Catat mutasi (UC-07) |
| 3.12 | GET | `/kependudukan/mutasi` | Ketua_RT, Sekretaris, Bendahara | Daftar mutasi |
| 3.13 | PATCH | `/kependudukan/mutasi/:id_mutasi/verifikasi` | Ketua_RT | Verifikasi mutasi |

### 3.1–3.5 Kartu Keluarga (TERIMPLEMENTASI)

- `POST /api/v1/kependudukan/kk` — Ketua_RT, Sekretaris.

```json
{ "no_kk": "3273011122334455", "id_rumah": 8, "tgl_dikeluarkan": "2023-11-12" }
```

```json
{ "status": "success", "message": "KK berhasil ditambahkan", "data": { "no_kk": "3273011122334455", "id_rumah": 8 } }
```

- `GET /api/v1/kependudukan/kk/saya` — Warga. Bentuk data sama dengan detail KK (rumah + `anggota_keluarga`).
- `GET /api/v1/kependudukan/kk?no_kk=3273011122334455&page=1&limit=20` — daftar KK, offset pagination.
- `GET /api/v1/kependudukan/kk/:no_kk` — detail KK beserta `anggota_keluarga`:

```json
{
  "status": "success",
  "message": "Detail KK",
  "data": {
    "no_kk": "3273011122334455",
    "id_rumah": 8,
    "anggota_keluarga": [
      { "nik": "3273019876543210", "nama_lengkap": "Budi Santoso", "status_hubungan_keluarga": "Kepala_Keluarga" }
    ]
  }
}
```

- `PATCH /api/v1/kependudukan/kk/:no_kk` — body parsial, mis. `{ "id_rumah": 9 }` → `{ "status": "success", "message": "Data KK diperbarui", "data": { "no_kk": "3273011122334455", "id_rumah": 9 } }`.

### 3.6 Tambah Biodata Warga Baru (TERIMPLEMENTASI)

- `POST /api/v1/kependudukan/warga` — Ketua_RT, Sekretaris (UC-06). Anti hard-delete.

```json
{
  "nik": "3273019876543210",
  "no_kk": "3273011122334455",
  "nama_lengkap": "Budi Santoso",
  "tempat_lahir": "Bekasi",
  "tanggal_lahir": "1992-04-12",
  "jenis_kelamin": "Laki_Laki",
  "agama": "Islam",
  "status_perkawinan": "Kawin",
  "pekerjaan": "Wiraswasta",
  "no_hp": "081299998888",
  "status_hubungan_keluarga": "Kepala_Keluarga",
  "status_tinggal": "Kontrak_Sewa"
}
```

- Response Sukses (201 Created):

```json
{ "status": "success", "message": "Warga berhasil ditambahkan", "data": { "nik": "3273019876543210", "nama_lengkap": "Budi Santoso", "status_aktif": "Aktif" } }
```

### 3.7 Daftar Warga (TERIMPLEMENTASI)

- `GET /api/v1/kependudukan/warga?no_kk=3273011122334455&status_aktif=Aktif&nama=Budi&page=1&limit=20` — Ketua_RT, Sekretaris, Bendahara.

```json
{
  "status": "success",
  "message": "Daftar warga",
  "data": [ { "nik": "3273019876543210", "nama_lengkap": "Budi Santoso", "no_kk": "3273011122334455", "status_aktif": "Aktif" } ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 3.8 Ambil Detail Biodata Warga (TERIMPLEMENTASI)

- `GET /api/v1/kependudukan/warga/:nik` — Ketua_RT, Sekretaris, Bendahara.

### 3.9 Ubah Status Aktif Warga — Soft-Delete (TERIMPLEMENTASI)

- `PATCH /api/v1/kependudukan/warga/:nik/status` — Ketua_RT, Sekretaris.

```json
{ "status_aktif": "Pindah_Keluar" }
```

```json
{ "status": "success", "message": "Status warga diperbarui", "data": { "nik": "3273019876543210", "status_aktif": "Pindah_Keluar" } }
```

> Tidak disediakan `DELETE /warga` (Aturan Bisnis #4 PRD — Anti Hard-Delete).

### 3.10 Ubah Biodata Warga (TERIMPLEMENTASI)

- `PATCH /api/v1/kependudukan/warga/:nik` — Ketua_RT, Sekretaris, body parsial.

```json
{ "no_hp": "081200001111", "pekerjaan": "Karyawan Swasta" }
```

### 3.11 Catat Mutasi Warga (TERIMPLEMENTASI)

- `POST /api/v1/kependudukan/mutasi` — Sekretaris (UC-07).

```json
{
  "nik": "3273019876543210",
  "jenis_mutasi": "Meninggal",
  "tanggal_peristiwa": "2026-09-21",
  "keterangan": "Meninggal karena sakit usia tua",
  "berkas_pendukung": "https://cdn.smarthub.local/uploads/surat-kematian.pdf"
}
```

```json
{ "status": "success", "message": "Mutasi tercatat, menunggu verifikasi", "data": { "id_mutasi": 31, "status_verifikasi": "Menunggu_Verifikasi" } }
```

### 3.12 Daftar Mutasi Warga (TERIMPLEMENTASI)

- `GET /api/v1/kependudukan/mutasi?jenis_mutasi=Meninggal&status_verifikasi=Menunggu_Verifikasi&page=1&limit=20`.

### 3.13 Verifikasi Mutasi Warga (TERIMPLEMENTASI)

- `PATCH /api/v1/kependudukan/mutasi/:id_mutasi/verifikasi` — Ketua_RT. Mutasi terverifikasi otomatis menyesuaikan `status_aktif` warga.

```json
{ "status_verifikasi": "Terverifikasi" }
```

```json
{ "status": "success", "message": "Mutasi diverifikasi", "data": { "id_mutasi": 31, "status_verifikasi": "Terverifikasi", "diverifikasi_oleh": 1 } }
```

---

## 4. Modul Log Keamanan (`/api/v1/keamanan`)

**Status: TERIMPLEMENTASI.**

| # | Method | Path | Akses | Deskripsi |
|---|---|---|---|---|
| 4.1 | POST | `/keamanan/tamu` | Keamanan | Check-in tamu (UC-08) |
| 4.2 | GET | `/keamanan/tamu` | Keamanan, Ketua_RT, Sekretaris | Daftar tamu + filter |
| 4.3 | GET | `/keamanan/tamu/:id_tamu` | Keamanan, Ketua_RT, Sekretaris | Detail tamu |
| 4.4 | PATCH | `/keamanan/tamu/:id_tamu` | Keamanan | Ubah data tamu |
| 4.5 | PUT | `/keamanan/tamu/:id_tamu/checkout` | Keamanan | Check-out tamu (mengisi `tgl_pergi`) |

### 4.1 Catat Tamu Datang — Check-In (TERIMPLEMENTASI)

```json
{ "id_rumah_tujuan": 8, "nama_tamu": "Andri Gunawan", "jumlah_tamu": 1, "keperluan": "Silaturahmi keluarga besar" }
```

```json
{ "status": "success", "message": "Tamu check-in tercatat", "data": { "id_tamu": 55, "tgl_datang": "2026-09-22T10:15:00.000Z", "tgl_pergi": null } }
```

### 4.2 Daftar Tamu Kunjungan (TERIMPLEMENTASI)

- `GET /api/v1/keamanan/tamu?tanggal=2026-09-22&status=didalam&page=1&limit=20`.

```json
{
  "status": "success",
  "message": "Daftar tamu",
  "data": [ { "id_tamu": 55, "nama_tamu": "Andri Gunawan", "id_rumah_tujuan": 8, "tgl_datang": "2026-09-22T10:15:00.000Z", "tgl_pergi": null } ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 4.3–4.4 Detail & Ubah Data Tamu (TERIMPLEMENTASI)

- `GET /api/v1/keamanan/tamu/:id_tamu`; `PATCH /api/v1/keamanan/tamu/:id_tamu` (body parsial, mis. `{ "jumlah_tamu": 2, "keperluan": "Menginap" }`).

### 4.5 Catat Tamu Keluar Komplek — Check-Out (TERIMPLEMENTASI)

- `PUT /api/v1/keamanan/tamu/:id_tamu/checkout` — Keamanan.

```json
{ "status": "success", "message": "Tamu berhasil check-out", "data": { "id_tamu": 55, "tgl_pergi": "2026-09-22T12:40:00.000Z" } }
```

---

## 5. Modul Keuangan (`/api/v1/keuangan`)

**Status: TERIMPLEMENTASI.** Modul ini mempertahankan pencatatan manual (transfer + bukti); jalur QRIS ditambahkan pada bab 10.

| # | Method | Path | Akses | Deskripsi |
|---|---|---|---|---|
| 5.1 | POST | `/keuangan/kategori` | Bendahara, Ketua_RT | Tambah kategori |
| 5.2 | GET | `/keuangan/kategori` | Bendahara, Ketua_RT | Daftar kategori |
| 5.3 | PATCH | `/keuangan/kategori/:id_kategori` | Bendahara, Ketua_RT | Ubah kategori |
| 5.4 | POST | `/keuangan/iuran/generate` | Bendahara, Ketua_RT | Generate tagihan iuran bulanan (UC-09) |
| 5.5 | GET | `/keuangan/iuran` | Bendahara, Ketua_RT, Sekretaris | Daftar tagihan (sisi pengurus) |
| 5.6 | GET | `/keuangan/iuran/saya` | Warga | Tagihan rumah sendiri |
| 5.7 | PUT | `/keuangan/iuran/:id_iuran/bayar` | Warga | Bayar / unggah bukti transfer (UC-10) |
| 5.8 | PATCH | `/keuangan/iuran/:id_iuran/verifikasi` | Bendahara | Verifikasi pembayaran iuran |
| 5.9 | PATCH | `/keuangan/iuran/:id_iuran/batal` | Bendahara | Batalkan tagihan |
| 5.10 | POST | `/keuangan/kas` | Bendahara | Catat kas masuk/keluar (UC-11) |
| 5.11 | GET | `/keuangan/kas/ringkasan` | Ketua_RT, Sekretaris, Bendahara, Warga | Ringkasan saldo kas (UC-12) |
| 5.12 | GET | `/keuangan/kas` | Bendahara, Ketua_RT, Sekretaris, Warga | Buku kas umum |
| 5.13 | PATCH | `/keuangan/kas/:id_transaksi/verifikasi` | Ketua_RT | Verifikasi transaksi kas |

### 5.1–5.3 Kategori Keuangan (TERIMPLEMENTASI)

- `POST /api/v1/keuangan/kategori` — body `{ "nama_kategori": "Kas Keamanan Mandiri", "jenis": "Pemasukan" }`.
- `GET /api/v1/keuangan/kategori?jenis=Pemasukan`.
- `PATCH /api/v1/keuangan/kategori/:id_kategori` — body parsial.

```json
{ "status": "success", "message": "Kategori ditambahkan", "data": { "id_kategori": 3, "nama_kategori": "Kas Keamanan Mandiri", "jenis": "Pemasukan" } }
```

### 5.4 Otomatisasi Generate Tagihan Iuran Bulanan (TERIMPLEMENTASI)

- `POST /api/v1/keuangan/iuran/generate` — Bendahara, Ketua_RT. Idempoten terhadap kombinasi rumah–kategori–bulan–tahun (UC-09). Hanya rumah berstatus Dihuni yang ditagih.

```json
{ "id_kategori": 1, "bulan": 10, "tahun": 2026, "jumlah_tagihan": 75000.00 }
```

```json
{ "status": "success", "message": "Tagihan iuran diterbitkan", "data": { "jumlah_rumah_tertagih": 42, "bulan": 10, "tahun": 2026 } }
```

### 5.5 Daftar Tagihan Iuran — Sisi Pengurus (TERIMPLEMENTASI)

- `GET /api/v1/keuangan/iuran?bulan=10&tahun=2026&status_bayar=Belum_Bayar&id_rumah=8&page=1&limit=20`.

```json
{
  "status": "success",
  "message": "Daftar tagihan iuran",
  "data": [ { "id_iuran": 412, "id_rumah": 8, "bulan": 10, "tahun": 2026, "jumlah_tagihan": "75000.00", "status_bayar": "Belum_Bayar" } ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 5.6 Tagihan Rumah Saya — Sisi Warga (TERIMPLEMENTASI)

- `GET /api/v1/keuangan/iuran/saya` — Warga.

### 5.7 Bayar Iuran / Unggah Struk Transfer (TERIMPLEMENTASI)

- `PUT /api/v1/keuangan/iuran/:id_iuran/bayar` — Warga (UC-10). Jalur transfer manual dengan bukti.

```json
{ "bukti_transfer": "https://cdn.smarthub.local/uploads/struk-412.jpg" }
```

```json
{ "status": "success", "message": "Bukti pembayaran diterima, menunggu konfirmasi", "data": { "id_iuran": 412, "status_bayar": "Menunggu_Konfirmasi" } }
```

> **TARGET Fase SaaS (opsional):** jalur QRIS (bab 10) tersedia sebagai kanal **opsional per tenant**; alur transfer manual di atas tetap menjadi **baseline** layanan dan tidak bergantung pada integrasi Hub (PRD Bab 3.3 & 4.1).

### 5.8 Verifikasi Status Bayar Iuran (TERIMPLEMENTASI)

- `PATCH /api/v1/keuangan/iuran/:id_iuran/verifikasi` — Bendahara. Body `{ "status_bayar": "Lunas" }`. Mencatat `diverifikasi_oleh`.

```json
{ "status": "success", "message": "Status bayar iuran diperbarui", "data": { "id_iuran": 412, "status_bayar": "Lunas", "diverifikasi_oleh": 3 } }
```

### 5.9 Batalkan Tagihan Iuran (TERIMPLEMENTASI)

- `PATCH /api/v1/keuangan/iuran/:id_iuran/batal` — Bendahara.

```json
{ "status": "success", "message": "Tagihan dibatalkan", "data": { "id_iuran": 412, "status_bayar": "Belum_Bayar" } }
```

### 5.10 Catat Pengeluaran/Pemasukan Kas Umum (TERIMPLEMENTASI)

- `POST /api/v1/keuangan/kas` — Bendahara (UC-11).

```json
{ "id_kategori": 2, "tanggal": "2026-09-22", "jumlah": 500000.00, "keterangan": "Gaji bulanan tambahan petugas kebersihan" }
```

```json
{ "status": "success", "message": "Transaksi kas tercatat, menunggu verifikasi", "data": { "id_transaksi": 77, "status_verifikasi": "Menunggu_Verifikasi" } }
```

### 5.11 Ringkasan Saldo Kas (TERIMPLEMENTASI)

- `GET /api/v1/keuangan/kas/ringkasan` — Ketua_RT, Sekretaris, Bendahara, Warga (UC-12). Keamanan **tidak** memiliki akses.
- Saldo dihitung dari iuran lunas + kas masuk terverifikasi − kas keluar terverifikasi.

```json
{
  "status": "success",
  "message": "Ringkasan kas",
  "data": {
    "total_pemasukan_iuran": "5200000.00",
    "total_pemasukan_lain": "1000000.00",
    "total_pengeluaran": "1500000.00",
    "saldo_kas_saat_ini": "4700000.00"
  }
}
```

### 5.12 Buku Kas Umum (TERIMPLEMENTASI)

- `GET /api/v1/keuangan/kas?jenis=Pengeluaran&dari=2026-09-01&sampai=2026-09-30&page=1&limit=20`.
- Keamanan **tidak** memiliki akses sesuai matriks RBAC.

### 5.13 Verifikasi Transaksi Kas Umum (TERIMPLEMENTASI)

- `PATCH /api/v1/keuangan/kas/:id_transaksi/verifikasi` — Ketua_RT. Body `{ "status_verifikasi": "Terverifikasi" }`.

```json
{ "status": "success", "message": "Transaksi kas diverifikasi", "data": { "id_transaksi": 77, "status_verifikasi": "Terverifikasi", "diverifikasi_oleh": 1 } }
```

> **TARGET Fase SaaS (UC-32):** setiap pergerakan iuran QRIS juga dicatat pada ledger double-entry (`LedgerTransaksi` + `LedgerEntry`); endpoint ledger ada di bab 10.

---

## 6. Modul Diskusi (`/api/v1/diskusi`)

**Status: TERIMPLEMENTASI.** Seluruh endpoint memerlukan autentikasi JWT dan dapat diakses **semua role**. Moderasi hanya Ketua_RT dan Sekretaris.

| # | Method | Path | Akses | Deskripsi |
|---|---|---|---|---|
| 6.1 | POST | `/diskusi/postingan` | Semua Role | Buat postingan/balasan + poll (UC-14) |
| 6.2 | GET | `/diskusi/postingan` | Semua Role | Feed (cursor pagination) |
| 6.3 | GET | `/diskusi/postingan/:id_postingan` | Semua Role | Detail postingan |
| 6.4 | PATCH | `/diskusi/postingan/:id_postingan` | Penulis | Ubah postingan |
| 6.5 | DELETE | `/diskusi/postingan/:id_postingan` | Penulis, Ketua_RT, Sekretaris | Hapus lunak (`status = Dihapus`) |
| 6.6 | PATCH | `/diskusi/postingan/:id_postingan/status` | Ketua_RT, Sekretaris | Moderasi (UC-17) |
| 6.7 | POST | `/diskusi/postingan/:id_postingan/reaksi` | Semua Role | Toggle suka (UC-15) |
| 6.8 | POST | `/diskusi/poll/:id_poll/suara` | Semua Role | Vote poll (UC-16) |
| 6.9 | POST | `/diskusi/poll/:id_poll/tutup` | Pembuat poll, Ketua_RT, Sekretaris | Tutup poll |
| 6.10 | GET | `/diskusi/mention` | Semua Role | Kandidat sebutan (UC-22) |

### 6.1 Buat Postingan / Balasan (TERIMPLEMENTASI)

- Postingan baru dengan poll:

```json
{
  "isi": "Kerja bakti dilaksanakan hari Minggu pukul 07.00.",
  "lampiran": ["https://cdn.smarthub.local/uploads/1699999999-poster.jpg"],
  "poll": { "opsi": ["Saya hadir", "Tidak bisa hadir"], "berakhir_pada": "2026-12-31" }
}
```

- Balasan satu tingkat:

```json
{ "isi": "Siap, saya ikut.", "id_induk": 2 }
```

- Response Sukses (201 Created):

```json
{
  "status": "success",
  "message": "Postingan berhasil dibuat",
  "data": {
    "id_postingan": 7,
    "id_induk": null,
    "isi": "Kerja bakti dilaksanakan hari Minggu pukul 07.00.",
    "status": "Aktif",
    "jumlah_suka": 0,
    "jumlah_balasan": 0,
    "penulis": { "id_pengguna": 1, "role": "Ketua_RT", "nama_lengkap": "Hendra Wijaya" },
    "lampiran": ["https://cdn.smarthub.local/uploads/1699999999-poster.jpg"],
    "disukai_saya": false,
    "poll": {
      "id_poll": 3,
      "berakhir_pada": "2026-12-31",
      "sudah_berakhir": false,
      "total_suara": 0,
      "sudah_vote": false,
      "pilihan_saya": null,
      "opsi": [
        { "id_opsi": 7, "label": "Saya hadir", "jumlah_suara": 0, "persen": 0 },
        { "id_opsi": 8, "label": "Tidak bisa hadir", "jumlah_suara": 0, "persen": 0 }
      ]
    },
    "bisa_diedit": true,
    "bisa_dihapus": true,
    "bisa_dimoderasi": false
  }
}
```

### 6.2 Feed Diskusi — Cursor Pagination (TERIMPLEMENTASI)

- `GET /api/v1/diskusi/postingan?limit=10&cursor=25`.
- Hanya postingan utama (`id_induk = null`) berstatus `Aktif`. Gunakan `?id_induk=:id` untuk daftar balasan dan `?id_penulis=:id` untuk postingan satu pengguna.

```json
{
  "status": "success",
  "message": "Feed diskusi",
  "data": [],
  "meta": { "limit": 10, "total": 3, "next_cursor": null, "has_more": false }
}
```

### 6.3–6.6 Detail, Ubah, Hapus, dan Moderasi (TERIMPLEMENTASI)

- `GET /api/v1/diskusi/postingan/:id_postingan` — postingan `Disembunyikan`/`Dihapus` hanya untuk penulis dan pengurus, selain itu `404`.
- `PATCH /api/v1/diskusi/postingan/:id_postingan` — penulis, body `{ "isi": "..." }`.
- `DELETE /api/v1/diskusi/postingan/:id_postingan` — penulis, Ketua_RT, Sekretaris. Soft delete (`status = Dihapus`) dan mengurangi `jumlah_balasan` induknya.
- `PATCH /api/v1/diskusi/postingan/:id_postingan/status` — Ketua_RT, Sekretaris, body `{ "status": "Disembunyikan" }`.

### 6.7 Tombol Suka (TERIMPLEMENTASI)

- `POST /api/v1/diskusi/postingan/:id_postingan/reaksi` — idempoten sebagai toggle (UC-15).

```json
{ "status": "success", "message": "Postingan disukai", "data": { "id_postingan": 2, "disukai_saya": true, "jumlah_suka": 3 } }
```

### 6.8 Vote Poll (TERIMPLEMENTASI)

- `POST /api/v1/diskusi/poll/:id_poll/suara` — body `{ "id_opsi": 2 }`.
- Gagal (409 Conflict):

```json
{ "status": "error", "message": "Anda sudah memberikan suara pada poll ini", "errors": [] }
```

### 6.9 Tutup Poll (TERIMPLEMENTASI)

- `POST /api/v1/diskusi/poll/:id_poll/tutup` — pembuat poll, Ketua_RT, Sekretaris.

### 6.10 Cari Warga untuk Sebutan (TERIMPLEMENTASI)

- `GET /api/v1/diskusi/mention?q=hendra&limit=8`.
- Hanya akun **aktif yang memiliki username**, dan **selalu mengecualikan diri sendiri**; hanya `username`, `nama_lengkap`, dan `role` yang dikirim — email, NIK, dan nomor HP tidak pernah terekspos (UC-22).

```json
{
  "status": "success",
  "message": "Kandidat sebutan",
  "data": [ { "id_pengguna": 18, "username": "hendra_wijaya", "nama_lengkap": "Hendra Wijaya", "role": "Ketua_RT" } ]
}
```

- Sebutan ditulis `@username` di dalam `isi`; setiap postingan menyertakan array `mention`:

```json
{
  "id_postingan": 16,
  "isi": "Pak @hendra_wijaya mohon izin kerja bakti Minggu pagi ya.",
  "mention": [{ "id_pengguna": 18, "username": "hendra_wijaya", "nama_lengkap": "Hendra Wijaya" }]
}
```

---

## 7. Modul Marketplace (`/api/v1/marketplace`)

**Status: TERIMPLEMENTASI.** Marketplace tanpa transaksi di dalam sistem (kontak via WhatsApp). Semua role dapat berjualan, memberi favorit, dan melapor; kelola kategori & moderasi hanya Ketua_RT dan Sekretaris.

Bentuk objek produk yang dikembalikan:

```json
{
  "id_produk": 2,
  "judul": "Jasa Servis AC & Cuci AC",
  "deskripsi": "Melayani cuci AC, isi freon, dan perbaikan ringan.",
  "harga": "75000.00",
  "kondisi": "Baru",
  "satuan": "unit",
  "bisa_nego": true,
  "status": "Aktif",
  "jumlah_dilihat": 12,
  "createdAt": "2026-09-22T13:00:00.000Z",
  "updatedAt": "2026-09-22T13:00:00.000Z",
  "id_kategori_produk": 2,
  "nama_kategori": "Jasa",
  "penjual": {
    "id_pengguna": 15,
    "nama_lengkap": "Budi Santoso",
    "role": "Warga",
    "tampilkan_kontak": true,
    "kontak_wa": "https://wa.me/6281200000005?text=Halo..."
  },
  "foto": [],
  "difavoritkan": false,
  "bisa_diedit": false,
  "bisa_dihapus": false,
  "bisa_dimoderasi": false,
  "jumlah_laporan_baru": null
}
```

| # | Method | Path | Akses | Deskripsi |
|---|---|---|---|---|
| 7.1 | GET | `/marketplace/kategori` | Semua Role | Daftar kategori (non-pengurus hanya kategori aktif) |
| 7.2 | POST | `/marketplace/kategori` | Ketua_RT, Sekretaris | Tambah kategori |
| 7.3 | PATCH | `/marketplace/kategori/:id_kategori_produk` | Ketua_RT, Sekretaris | Ubah kategori |
| 7.4 | GET | `/marketplace/produk` | Semua Role | Katalog & pencarian (UC-18) |
| 7.5 | GET | `/marketplace/produk-saya` | Semua Role | Produk milik sendiri |
| 7.6 | GET | `/marketplace/favorit` | Semua Role | Daftar favorit sendiri |
| 7.7 | POST | `/marketplace/produk` | Semua Role | Pasang produk (UC-19) |
| 7.8 | GET | `/marketplace/produk/:id_produk` | Semua Role | Detail produk |
| 7.9 | PATCH | `/marketplace/produk/:id_produk` | Penjual | Ubah produk |
| 7.10 | DELETE | `/marketplace/produk/:id_produk` | Penjual, Ketua_RT, Sekretaris | Hapus lunak |
| 7.11 | PATCH | `/marketplace/produk/:id_produk/status` | Ketua_RT, Sekretaris | Moderasi produk |
| 7.12 | POST | `/marketplace/produk/:id_produk/favorit` | Semua Role | Toggle favorit (UC-20) |
| 7.13 | DELETE | `/marketplace/produk/:id_produk/favorit` | Semua Role | Toggle favorit |
| 7.14 | POST | `/marketplace/laporan` | Semua Role | Laporkan produk (UC-21) |
| 7.15 | GET | `/marketplace/laporan` | Ketua_RT, Sekretaris | Daftar laporan |
| 7.16 | PATCH | `/marketplace/laporan/:id_laporan` | Ketua_RT, Sekretaris | Tangani laporan |

### 7.1–7.3 Kategori Produk (TERIMPLEMENTASI)

- `GET /api/v1/marketplace/kategori`; `POST /api/v1/marketplace/kategori` — body `{ "nama": "Elektronik", "slug": "elektronik", "aktif": true }` (slug opsional, dibuat otomatis dari nama bila kosong); `PATCH /api/v1/marketplace/kategori/:id_kategori_produk`.

### 7.4 Katalog Produk (TERIMPLEMENTASI)

- `GET /api/v1/marketplace/produk?q=AC&id_kategori_produk=2&kondisi=Bekas&harga_min=50000&harga_max=500000&urut=termurah&page=1&limit=20`.
- Hanya produk `Aktif`; `urut` menerima `terbaru` (default), `termurah`, `termahal`; offset pagination (UC-18).

```json
{ "status": "success", "message": "Katalog produk", "data": [], "meta": { "page": 1, "limit": 20, "total": 3 } }
```

### 7.5, 7.8 Detail & Produk Saya (TERIMPLEMENTASI)

- `GET /api/v1/marketplace/produk-saya` — produk milik sendiri (semua status kecuali `Dihapus`).
- `GET /api/v1/marketplace/produk/:id_produk` — produk `Disembunyikan`/`Dihapus` hanya untuk penjual dan pengurus (selain itu `404`). Efek samping: `jumlah_dilihat` bertambah satu.

### 7.7, 7.9–7.11 Pasang & Kelola Produk (TERIMPLEMENTASI)

- `POST /api/v1/marketplace/produk` (UC-19):

```json
{
  "judul": "Sepeda Anak Bekas",
  "deskripsi": "Sepeda anak ukuran 16 inci, kondisi terawat.",
  "harga": 350000,
  "kondisi": "Bekas",
  "satuan": "unit",
  "bisa_nego": true,
  "tampilkan_kontak": true,
  "id_kategori_produk": 3,
  "foto": ["https://cdn.smarthub.local/uploads/1699999999-sepeda.jpg"]
}
```

- `PATCH /api/v1/marketplace/produk/:id_produk` — penjual, menerima subset field di atas plus `status` (`Aktif`/`Terjual`).
- `DELETE /api/v1/marketplace/produk/:id_produk` — penjual, Ketua_RT, Sekretaris. Soft delete (`status = Dihapus`).
- `PATCH /api/v1/marketplace/produk/:id_produk/status` — Ketua_RT, Sekretaris, body `{ "status": "Disembunyikan" }`.
- Maksimal **5 foto** per produk; penjual dapat menandai `Terjual` dan menyembunyikan kontaknya (UC-19).

### 7.6, 7.12–7.13 Favorit & Kontak Penjual (TERIMPLEMENTASI)

- `POST /api/v1/marketplace/produk/:id_produk/favorit` dan `DELETE /api/v1/marketplace/produk/:id_produk/favorit` — keduanya toggle.
- `GET /api/v1/marketplace/favorit`.

```json
{ "status": "success", "message": "Ditambahkan ke favorit", "data": { "id_produk": 2, "difavoritkan": true } }
```

- Kontak penjual dikirim sebagai `penjual.kontak_wa` (tautan `wa.me`) dan bernilai `null` bila penjual menyetel `tampilkan_kontak = false` atau tidak memiliki nomor HP (UC-20).

### 7.14–7.16 Laporan & Moderasi (TERIMPLEMENTASI)

- `POST /api/v1/marketplace/laporan` — body `{ "id_produk": 1, "alasan": "Spam", "keterangan": "Promosi berulang" }`.
- Gagal (400/409):

```json
{ "status": "error", "message": "Anda tidak dapat melaporkan produk milik sendiri", "errors": [] }
```

```json
{ "status": "error", "message": "Anda sudah melaporkan produk ini dan laporan masih diproses", "errors": [] }
```

- `GET /api/v1/marketplace/laporan?status=Baru&page=1&limit=20` — Ketua_RT, Sekretaris.
- `PATCH /api/v1/marketplace/laporan/:id_laporan` — Ketua_RT, Sekretaris, body `{ "status": "Ditangani" }` atau `{ "status": "Ditolak" }`. Mengisi `ditangani_oleh` dan `ditangani_pada`.

---

## 8. Modul Notifikasi (`/api/v1/notifikasi`)

**Status: TERIMPLEMENTASI.** Seluruh endpoint hanya menampilkan/mengubah notifikasi **milik pengguna yang login**; pengguna lain tidak dapat mengaksesnya meski mengetahui `id_notifikasi`.

| # | Method | Path | Akses | Deskripsi |
|---|---|---|---|---|
| 8.1 | GET | `/notifikasi` | Semua Role | Daftar notifikasi (UC-23) |
| 8.2 | GET | `/notifikasi/jumlah` | Semua Role | Jumlah belum dibaca |
| 8.3 | PATCH | `/notifikasi/:id_notifikasi/baca` | Pemilik notifikasi | Tandai satu notifikasi dibaca |
| 8.4 | PATCH | `/notifikasi/baca-semua` | Semua Role | Tandai semua dibaca |

### 8.1 Daftar Notifikasi (TERIMPLEMENTASI)

- `GET /api/v1/notifikasi?belum_dibaca=true&page=1&limit=20`.

```json
{
  "status": "success",
  "message": "Daftar notifikasi",
  "data": [
    {
      "id_notifikasi": 1,
      "tipe": "Mention",
      "id_referensi": 16,
      "pesan": "Budi Santoso menyebut Anda di Diskusi Warga.",
      "dibaca": false,
      "dibaca_pada": null,
      "createdAt": "2026-09-22T13:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 8.2 Jumlah Belum Dibaca (TERIMPLEMENTASI)

- `GET /api/v1/notifikasi/jumlah` — response `{ "status": "success", "message": "...", "data": { "belum_dibaca": 3 } }`.

### 8.3 Tandai Satu Notifikasi Dibaca (TERIMPLEMENTASI)

- `PATCH /api/v1/notifikasi/:id_notifikasi/baca` — 404 bila bukan miliknya.

### 8.4 Tandai Semua Dibaca (TERIMPLEMENTASI)

- `PATCH /api/v1/notifikasi/baca-semua` — menandai seluruh notifikasi belum dibaca milik sendiri; mengembalikan `{ "jumlah_ditandai": n }`.

### 8.5 Aturan Pembuatan Notifikasi (bukan endpoint)

| Peristiwa | Tipe | Penerima |
|---|---|---|
| `@username` disebut di postingan/balasan | `Mention` | Warga yang disebut, kecuali penulis sendiri |
| Postingan milik seseorang dibalas | `Balasan` | Penulis postingan induk, kecuali ia sudah menerima `Mention` pada postingan yang sama |

Notifikasi dibuat dalam alur yang sama dengan pembuatan postingan. Menyunting postingan hanya memperbarui daftar sebutan (`PostinganMention`) dan **tidak** mengirim notifikasi baru. Notifikasi duplikat untuk satu peristiwa dicegah.

> **TARGET Fase SaaS (UC-23 lanjutan):** notifikasi WhatsApp dan email ditambahkan sebagai kanal; `GET /notifikasi` tetap menjadi sumber kebenaran in-app.

---

## 9. Modul Tenant & Langganan (`/api/v1/tenant`, `/api/v1/langganan`)

> **Status: TARGET.** Seluruh endpoint pada bab ini **belum ada di kode** dan merupakan kontrak yang direncanakan untuk Fase SaaS (UC-24…UC-29 dan UC-38). Semua endpoint di bab ini — kecuali `9.1` dan `9.15` — ter-scope tenant dari JWT.

### Ringkasan Endpoint

| # | Method | Path | Akses | UC | Deskripsi |
|---|---|---|---|---|---|
| 9.1 | POST | `/tenant` | `Ketua_RT`, `Sekretaris` | UC-24 | Buat tenant + akun Ketua pertama + langganan trial (**SUDAH ADA**; `POST /tenant/registrasi` publik dibatalkan) |
| 9.2 | GET | `/tenant/profil` | Ketua_RT, Sekretaris | – | Profil tenant aktif |
| 9.3 | PATCH | `/tenant/profil` | Ketua_RT | – | Ubah profil tenant |
| 9.4 | GET/POST | `/kyc`, `/kyc/initiate`, `/kyc/dokumen`, `/kyc/submit` | Ketua_RT, Sekretaris, Bendahara | UC-25 | Verifikasi Identitas (mode verify-on-behalf) — **SUDAH ADA** |
| 9.5 | GET | `/tenant/verifikasi` | Ketua_RT, Sekretaris | UC-25 | Status verifikasi tenant |
| 9.6 | GET | `/tenant/anggota` | Ketua_RT, Sekretaris | – | Daftar anggota tenant |
| 9.7 | POST | `/tenant/anggota/undang` | Ketua_RT, Sekretaris | – | Undang/daftarkan anggota |
| 9.8 | PATCH | `/tenant/anggota/:id_pengguna` | Ketua_RT, Sekretaris | – | Ubah role anggota |
| 9.9 | DELETE | `/tenant/anggota/:id_pengguna` | Ketua_RT | – | Nonaktifkan anggota (non-destruktif) |
| 9.10 | POST | `/tenant/impor` | Ketua_RT, Sekretaris | – | Impor massal rumah/warga (wizard) |
| 9.11 | POST | `/tenant/ekspor` | Ketua_RT | UC-38 | Minta ekspor data tenant |
| 9.12 | GET | `/tenant/ekspor/:id_ekspor` | Ketua_RT, Sekretaris | UC-38 | Status & unduhan ekspor |
| 9.13 | POST | `/tenant/permintaan-data` | Warga | UC-38 | Permintaan hak subjek data (salinan/koreksi/hapus) |
| 9.14 | GET | `/tenant/permintaan-data/:id_permintaan` | Warga, Ketua_RT | UC-38 | Status permintaan data |
| 9.15 | GET | `/langganan/paket` | Public | UC-26 | Daftar paket langganan |
| 9.16 | GET | `/langganan` | Ketua_RT, Sekretaris, Bendahara | UC-26 | Status langganan & trial |
| 9.17 | POST | `/langganan/aktivasi` | Ketua_RT, Bendahara | UC-26 | Aktifkan langganan (pilih paket/periode) |
| 9.18 | POST | `/langganan/ubah-paket` | Ketua_RT, Bendahara | UC-28 | Upgrade/downgrade paket |
| 9.19 | GET | `/langganan/kuota` | Ketua_RT, Sekretaris, Bendahara | UC-28 | Pemakaian kuota rumah |
| 9.20 | GET | `/langganan/invoice` | Ketua_RT, Sekretaris, Bendahara | UC-27 | Daftar invoice langganan |
| 9.21 | GET | `/langganan/invoice/:id_invoice` | Ketua_RT, Sekretaris, Bendahara | UC-27 | Detail invoice |
| 9.22 | POST | `/langganan/invoice/:id_invoice/bayar` | Ketua_RT, Bendahara | UC-27 | Buat pembayaran langganan (QRIS/VA via Logikraf Hub) |
| 9.23 | POST | `/langganan/pembatalan` | Ketua_RT | UC-29 | Batalkan langganan/tenant |

### 9.1 Pembuatan Tenant oleh Ketua_RT/Sekretaris (TERIMPLEMENTASI)

> **Keputusan 2026-09-23:** self-serve publik **dibatalkan**. Tenant dibuat oleh **akun ber-role `Ketua_RT` atau `Sekretaris`** (akun operator diseed) melalui `POST /api/v1/tenant` — sekaligus membuat akun Ketua pertama dan langganan trial. Setelah tenant ada, data warga dan akunnya dibuat pengurus lewat endpoint Fase 1 (`POST /kependudukan/kk`, `/warga`, `/auth/register`). Kontrak `POST /tenant/registrasi` publik di bawah ini **dibatalkan** dan hanya disimpan sebagai catatan historis.

**Endpoint aktual (SUDAH ADA):**

| Method | Path | Role | Keterangan |
|---|---|---|---|
| POST | `/api/v1/tenant` | `Ketua_RT`, `Sekretaris` | Buat tenant + akun Ketua pertama + langganan trial Pro 30 hari |
| GET | `/api/v1/tenant` | `Ketua_RT`, `Sekretaris` | Daftar tenant (paginated) |
| GET | `/api/v1/tenant/:id_tenant` | `Ketua_RT`, `Sekretaris` | Detail tenant |

`pengurus.nik` opsional (`AkunPengguna.nik` kini nullable) sehingga pengurus tanpa data warga tetap dapat dibuat.

- ~~`POST /api/v1/tenant/registrasi` — Public (tanpa JWT).~~
- ~~Membuat `Tenant` berstatus `Menunggu_Verifikasi` beserta akun `Ketua_RT` pertama.~~

```json
{
  "nama": "RT 005 Perumahan Melati",
  "slug": "rt-005-melati",
  "provinsi": "Jawa Barat",
  "kabupaten": "Kota Bekasi",
  "kecamatan": "Bekasi Selatan",
  "jumlah_rumah": 120,
  "kontak_email": "pengurus@rt005-melati.id",
  "kontak_hp": "081200000001",
  "nama_pendaftar": "Hendra Wijaya",
  "nik_pendaftar": "3273012345670001",
  "email_pendaftar": "hendra@rt005-melati.id",
  "password": "RahasiaRT005!"
}
```

- Response Sukses (201 Created):

```json
{
  "status": "success",
  "message": "Pendaftaran tenant diterima, menunggu verifikasi",
  "data": {
    "id_tenant": 12,
    "slug": "rt-005-melati",
    "status": "Menunggu_Verifikasi",
    "akun_ketua_rt": { "id_pengguna": 101, "role": "Ketua_RT" },
    "trial_berakhir": "2026-10-22"
  }
}
```

- Gagal (409 Conflict): slug sudah dipakai.

### 9.2–9.3 Profil Tenant (TARGET)

- `GET /api/v1/tenant/profil` — identitas tenant aktif (dari JWT).
- `PATCH /api/v1/tenant/profil` — Ketua_RT, body parsial (`nama`, `kontak_email`, `kontak_hp`, alamat).

### 9.4 Verifikasi Identitas (SUDAH ADA — mode verify-on-behalf)

> KYC tenant dipindah ke portal partner Logikraf `https://partners.logikraf.id/`. Isi di bawah catatan historis.

- `POST /api/v1/tenant/verifikasi/dokumen` — Ketua_RT, `multipart/form-data`; field `dokumen_ktp` (wajib) dan `dokumen_rt` (surat/dokumen RT).
- Semua berkas masuk object storage B2; hanya referensi tersimpan di `Tenant`.

```json
{
  "status": "success",
  "message": "Dokumen verifikasi diunggah",
  "data": { "id_tenant": 12, "status": "Menunggu_Verifikasi", "dokumen_lengkap": true }
}
```

### 9.5 Status Verifikasi Tenant (TARGET)

- `GET /api/v1/tenant/verifikasi` — Ketua_RT, Sekretaris (UC-25).

```json
{
  "status": "success",
  "message": "Status verifikasi tenant",
  "data": {
    "id_tenant": 12,
    "status": "Menunggu_Verifikasi",
    "catatan_verifikasi": null,
    "diverifikasi_oleh": null,
    "diverifikasi_pada": null
  }
}
```

Status yang mungkin: `Menunggu_Verifikasi`, `Terverifikasi`, `Aktif`, `Ditangguhkan`, `Dibatalkan`. Penolakan selalu disertai `catatan_verifikasi` berupa alasan.

### 9.6–9.9 Kelola Anggota Tenant (TARGET)

- `GET /api/v1/tenant/anggota?role=Warga&page=1&limit=20` — Ketua_RT, Sekretaris.
- `POST /api/v1/tenant/anggota/undang` — mengundang warga terdata menjadi anggota/akun (satu NIK maksimal satu akun dalam tenant).
- `PATCH /api/v1/tenant/anggota/:id_pengguna` — ubah `role` (pengurus tidak dapat mengubah role akunnya sendiri).
- `DELETE /api/v1/tenant/anggota/:id_pengguna` — **penonaktifan**, bukan penghapusan; data warga tetap utuh.

### 9.10 Impor Massal (Wizard) (TARGET)

- `POST /api/v1/tenant/impor` — Ketua_RT, Sekretaris, `multipart/form-data` (`file` CSV/XLSX) atau JSON.
- Idempoten per baris: baris yang sudah ada diperbarui, bukan digandakan.

```json
{
  "status": "success",
  "message": "Impor selesai",
  "data": { "rumah_dibuat": 118, "warga_dibuat": 402, "baris_dilewati": 3 }
}
```

### 9.11–9.12 Ekspor Data Tenant (TARGET)

- `POST /api/v1/tenant/ekspor` — Ketua_RT; meminta ekspor lengkap (rumah, warga, iuran, kas, diskusi) dalam format terbuka (UC-38).
- `GET /api/v1/tenant/ekspor/:id_ekspor` — memantau status dan menerima tautan unduhan berumur pendek.

```json
{
  "status": "success",
  "message": "Ekspor sedang disiapkan",
  "data": { "id_ekspor": 4, "status": "Diproses", "format": "csv_zip", "tautan_unduh": null }
}
```

### 9.13–9.14 Hak Subjek Data / Permintaan Data (TARGET)

- `POST /api/v1/tenant/permintaan-data` — Warga; jenis `Salinan`, `Koreksi`, atau `Penghapusan`. Permintaan penghapusan diproses dengan mempertimbangkan kewajiban penyimpanan data keuangan.
- `GET /api/v1/tenant/permintaan-data/:id_permintaan` — pemohon atau Ketua_RT.

```json
{ "jenis": "Salinan", "catatan": "Mohon salinan data pribadi saya." }
```

### 9.15 Daftar Paket Langganan (TARGET)

- `GET /api/v1/langganan/paket` — **Public**. Mencerminkan `PRD.md` bab 4.2.

| Kode | Nama | Batas rumah | Harga bulanan | Harga tahunan |
|---|---|---|---|---|
| `free` | Gratis | 25 | Rp0 | Rp0 |
| `basic` | Basic | 100 | Rp75.000 | Rp750.000 |
| `pro` | Pro | 300 | Rp150.000 | Rp1.500.000 |
| `enterprise` | Enterprise | Tanpa batas | Rp400.000 | Rp4.000.000 |

Semua paket mendapat **trial 30 hari berfitur Pro**. Pembayaran tahunan = 10 × harga bulanan (diskon 2 bulan).

> **Paket Gratis (2026-09-26).** Trial yang berakhir (dan langganan menunggak yang melewati masa tenggang 7 hari) otomatis **turun ke paket `free`** — bukan dimatikan; data tenant tidak dihapus. `POST /langganan/invoice` dengan paket gratis **mengaktifkan langsung tanpa invoice** (tidak memanggil Hub). `GET /langganan/status` menyertakan `fitur` (feature keys) untuk gating.
>
> **Gating fitur (server).** `free`/`basic`: kependudukan, keamanan, keuangan, diskusi. `pro` menambah `marketplace`, `notifikasi_wa`, `laporan_ekspor`; `enterprise` menambah `multi_blok`, `sla`, `onboarding`. Endpoint ter-gate mengembalikan `403` bila paket tidak mencakup fitur (mis. `/ekspor/*`, `/marketplace/*`).

> **Kanal pembayaran langganan (2.1).** Pembayaran paket pada `9.22` diproses melalui **Logikraf Payment Hub**, bukan Xendit langsung. SmartHub membuat instruksi pembayaran di Hub (QRIS atau Virtual Account) dan baru menandai invoice lunas setelah menerima webhook Hub (`10.15`) dengan `event_id` unik.

```json
{
  "status": "success",
  "message": "Daftar paket",
  "data": [
    { "kode": "pro", "nama": "Pro", "harga_bulanan": "150000.00", "harga_tahunan": "1500000.00", "batas_rumah": 300 }
  ]
}
```

### 9.16 Status Langganan (TARGET)

- `GET /api/v1/langganan` — Ketua_RT, Sekretaris, Bendahara (UC-26).
- Status: `Trial`, `Aktif`, `Menunggak`, `Berhenti`. **Langganan tidak auto-renew**; perpanjangan dilakukan manual.

```json
{
  "status": "success",
  "message": "Status langganan",
  "data": {
    "id_tenant": 12,
    "kode_paket": "pro",
    "status": "Trial",
    "mulai": "2026-09-22",
    "berakhir": "2026-10-22",
    "trial_berakhir": "2026-10-22",
    "auto_renew": false
  }
}
```

### 9.17 Aktivasi Langganan (TARGET)

- `POST /api/v1/langganan/aktivasi` — Ketua_RT, Bendahara (UC-26).

```json
{ "kode_paket": "pro", "periode": "Bulanan", "metode": "Virtual_Account" }
```

- Response Sukses (201 Created): mengembalikan `id_invoice` yang harus dibayar. Tanpa aktivasi setelah trial, tenant menjadi **hanya-baca**.

### 9.18 Ubah Paket (Upgrade/Downgrade) (TARGET)

- `POST /api/v1/langganan/ubah-paket` — Ketua_RT, Bendahara (UC-28).
- **Upgrade** berlaku segera dengan perhitungan **prorata**; **downgrade** berlaku pada periode penagihan berikutnya. Data tidak pernah dihapus karena penurunan paket.

```json
{ "kode_paket": "enterprise" }
```

### 9.19 Kuota Rumah (TARGET)

- `GET /api/v1/langganan/kuota` — Ketua_RT, Sekretaris, Bendahara. Melebihi batas paket memicu tawaran upgrade.

```json
{
  "status": "success",
  "message": "Pemakaian kuota",
  "data": { "kode_paket": "pro", "batas_rumah": 300, "rumah_terpakai": 305, "melebihi_kuota": true }
}
```

### 9.20–9.21 Invoice Langganan (TARGET)

- `GET /api/v1/langganan/invoice?status=Belum_Bayar&page=1&limit=20`.
- `GET /api/v1/langganan/invoice/:id_invoice` (UC-27).

```json
{
  "status": "success",
  "message": "Daftar invoice",
  "data": [
    { "id_invoice": 88, "periode_mulai": "2026-10-22", "periode_akhir": "2026-11-21", "jumlah": "150000.00", "status": "Belum_Bayar", "jatuh_tempo": "2026-10-29" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

Pengingat dikirim **H-7** dan **H-1**; **masa tenggang 7 hari** sebelum tenant dibatasi (hanya-baca), dan penangguhan setelah **30 hari** menunggak.

### 9.22 Buat Pembayaran Langganan (TARGET)

- `POST /api/v1/langganan/invoice/:id_invoice/bayar` — Ketua_RT, Bendahara (UC-27).
- Metode: `QRIS` (nominal langganan) atau `Virtual_Account`. **Tidak ada auto-renew**.
- **Pembayaran dibuat melalui Logikraf Payment Hub (2.1), bukan Xendit langsung.** SmartHub memanggil `POST /api/client-store-invoices` (VA/checkout) atau `POST /api/client-store-qris` (QRIS) dengan header `X-Logikraf-Internal-Key` dan `external_id` berprefix **`sb-`** (mis. `sb-tenant12-inv-88-20261022`). SmartHub tidak memegang API key Xendit.
- Respons SmartHub menormalkan respons Hub (`invoice_url`, `qr_string`, `expires_at`, `simulate_allowed`). Status invoice **tidak final** sampai webhook Hub (`10.15`) diterima.

```json
{ "metode": "Virtual_Account" }
```

```json
{
  "status": "success",
  "message": "Instruksi pembayaran dibuat",
  "data": {
    "id_pembayaran": 210,
    "metode": "Virtual_Account",
    "external_id": "sb-tenant12-inv-88-20261022",
    "referensi_bayar": "5f7b2c3a1d4e5f6a7b8c9d0e",
    "invoice_url": "https://checkout.xendit.co/web/5f7b2c3a1d4e5f6a7b8c9d0e",
    "qr_string": null,
    "jumlah": "150000.00",
    "expires_at": "2026-10-30T17:00:00.000Z",
    "simulate_allowed": false,
    "status": "PENDING"
  }
}
```

> Bila metode `QRIS`, `qr_string` diisi dan `invoice_url` bernilai `null`. Nilai `simulate_allowed` hanya `true` pada mode uji Hub; produksi selalu `false`.

### 9.23 Pembatalan Langganan / Tenant (TARGET)

- `POST /api/v1/langganan/pembatalan` — Ketua_RT (UC-29). Alasan wajib.

```json
{ "alasan": "Pengurus baru memakai sistem lain" }
```

- Setelah pembatalan, data disimpan **90 hari** sebelum penawaran ekspor akhir dan penghapusan permanen. Tidak ada hard-delete di luar alur ini.

---

## 10. Modul Billing Iuran & Pembayaran (`/api/v1/billing`)

> **Status: TARGET.** Seluruh endpoint pada bab ini **belum ada di kode** (UC-30…UC-35). **SmartHub adalah Client Store Logikraf** (prefix `sb-`) dan **tidak pernah memegang API key Xendit**. Seluruh pembayaran diteruskan ke **Logikraf Payment Hub**; Xendit hanya penyedia di balik Hub.
>
> Model aliran dana tetap **non-kustodial**: dana warga mengalir ke saldo **sub-akun Xendit milik RT yang dibuat dan dikelola Hub** (Hub §9). Platform SmartHub tidak menampung dana pihak ketiga; ia hanya mencatat tagihan, fee, dan status settlement. Bukti transfer pencairan diterbitkan Hub.

**Aturan bisnis yang mengikat endpoint bab ini:**

1. Nominal QRIS **maksimal Rp10.000.000** per transaksi dan **wajib memiliki masa kedaluwarsa** (Xendit membatasi ≤48 jam). Tagihan di atas batas harus dipecah atau dialihkan ke metode pembayaran lain.
2. **Status pembayaran tidak final sebelum webhook Hub diterima** (`10.15`). `GET /billing/qris/...` hanya cerminan sementara; sumber kebenaran transaksi adalah Hub.
3. **Settlement Hub `pending → processing → paid`**; bila gagal, dana dibuka kembali (`unlock`) ke `pending`. Dana tidak tersedia seketika dan tidak boleh dijanjikan instan.
4. **`PAID` dan `SETTLED` adalah dua peristiwa berbeda** dan ditangani terpisah: `PAID` menandai pembayaran diterima; `SETTLED` menandai dana selesai di-settle pada sub-akun.
5. **Refund** memakai alur Hub; pembalikan fee dilakukan lewat `POST /api/client-store-fee-reverse` Hub dan bersifat **koreksi ledger internal Hub**, bukan penarikan dana dari Xendit.
6. **Idempotensi webhook** lewat `event_id` unik; nominal selalu diambil dari database internal, bukan dari payload.
7. **Fee** yang ditagih SmartHub ke RT maupun biaya Hub ke SmartHub mengikuti guardrail `10.21`.

### Kontrak Keluar ke Logikraf Payment Hub

SmartHub memanggil Hub (keluar), bukan Xendit. Semua request menyertakan header **`X-Logikraf-Internal-Key`** dan `Content-Type: application/json`; base URL dari `LOGIKRAF_HUB_URL`.

| Method | Endpoint Hub | Dipakai untuk |
|---|---|---|
| POST | `/api/client-store-invoices` | Membuat invoice checkout (langganan/VA) |
| POST | `/api/client-store-qris` | Membuat QRIS dinamis per tagihan iuran |
| GET | `/api/payment/qris/:reference_id` | Cek status QRIS (juga fallback polling) |
| GET | `/api/payment/qris/:reference_id/stream` | Stream status real-time (SSE; harus diproksi lewat backend) |
| POST | `/api/client-store-fee-reverse` | Membalik fee platform saat refund |
| POST | `/api/client-store-invoices/:id/expire` | Memaksa invoice/QRIS kedaluwarsa |

> `external_id` yang dikirim SmartHub **selalu berprefix `sb-`** (mis. `sb-tenant12-qris-20260922-001`). Hub me-route webhook ke SmartHub berdasarkan prefix ini.

### Ringkasan Endpoint

| # | Method | Path | Akses | UC | Deskripsi |
|---|---|---|---|---|---|
| 10.1 | GET | `/billing/saldo` | Ketua_RT, Bendahara | UC-30 | Saldo akun pembayaran RT (via Hub) — **SUDAH ADA** |
| 10.2 | GET/POST/PATCH/DELETE | `/billing/rekening` | Ketua_RT, Bendahara | UC-30 | CRUD rekening pencairan — **SUDAH ADA** |
| 10.3 | POST | `/billing/qris` | Bendahara, Ketua_RT | UC-31 | Buat QRIS dinamis via Hub untuk satu tagihan iuran |
| 10.4 | GET | `/billing/qris/:id_pembayaran_iuran` | Bendahara, Ketua_RT, Warga (milik sendiri) | UC-31 | Status pembayaran QRIS (dari Hub) |
| 10.5 | GET | `/billing/transaksi` | Ketua_RT, Bendahara, Sekretaris | UC-32 | Daftar transaksi pembayaran iuran |
| 10.6 | GET | `/billing/transaksi/:id_transaksi` | Ketua_RT, Bendahara, Sekretaris | UC-32 | Detail transaksi + entri ledger |
| 10.7 | GET | `/billing/ledger` | Ketua_RT, Bendahara | UC-32 | Ledger double-entry (tagihan, pembayaran, fee, net) |
| 10.8 | POST | `/billing/pencairan` | Ketua_RT, Bendahara | UC-33 | Ajukan settlement/pencairan dana ke Hub |
| 10.9 | GET | `/billing/pencairan` | Ketua_RT, Bendahara | UC-33 | Daftar pencairan (settlement Hub) |
| 10.10 | GET | `/billing/pencairan/:id_pencairan` | Ketua_RT, Bendahara | UC-33 | Detail/status pencairan + bukti transfer |
| 10.11 | POST | `/billing/refund` | Bendahara, Ketua_RT | UC-34 | Ajukan refund (alur Hub) |
| 10.12 | GET | `/billing/refund/:id_refund` | Bendahara, Ketua_RT | UC-34 | Status refund |
| 10.13 | GET | `/billing/rekonsiliasi` | Bendahara, Ketua_RT | UC-35 | Laporan rekonsiliasi harian (Hub otoritatif) |
| 10.14 | POST | `/billing/rekonsiliasi/jalankan` | Platform_Admin | UC-35 | Jalankan rekonsiliasi/fallback polling ke Hub |
| 10.15 | POST | `/billing/webhook/logikraf` | Public (signature Hub) | UC-32, UC-33, UC-35 | Webhook pembayaran/refund/settlement dari Logikraf Hub |
| 10.16 | GET | `/internal/finance/summary` | Internal (Hub) | UC-32 | Ringkasan keuangan untuk Hub |
| 10.17 | GET | `/internal/settlements` | Internal (Hub) | UC-33 | Daftar settlement untuk Hub |
| 10.18 | PATCH | `/internal/settlements/:id/processing` | Internal (Hub) | UC-33 | Tandai settlement diproses (locked) |
| 10.19 | PATCH | `/internal/settlements/:id/paid` | Internal (Hub) | UC-33 | Tandai settlement dibayar + unggah bukti (multipart) |
| 10.20 | PATCH | `/internal/settlements/:id/unlock` | Internal (Hub) | UC-33 | Buka kembali settlement gagal ke `pending` |

> `10.16`–`10.20` adalah **Internal Finance API** yang dipanggil **Hub ke SmartHub**, di luar JWT, hanya dengan `X-Logikraf-Internal-Key` (lihat Konvensi).

### 10.1–10.2 Akun Pembayaran RT: Saldo & Rekening (SUDAH ADA, 2026-09-24)

> **Keputusan terkini (2026-09-24, menggantikan keputusan portal 2026-09-23):** **KYC kembali ke SmartHub dengan mode verify-on-behalf.** Pengurus RT mengisi data, mengunggah dokumen, dan memberi consent di `POST /kyc/initiate` + `/kyc/dokumen` + `/kyc/submit`; Hub yang mengeksekusi ke penyedia dan men-generate `service_agreement_document`. SmartHub **hanya menyimpan `file_id` + metadata + consent** (tidak menyimpan berkas), memakai `penyedia_account_id` untuk QRIS, dan menyinkronkan status lewat webhook `account.verification`. Blok di bawah bergaya lama (undangan portal) bersifat **historis**. Endpoint `10.1`–`10.2` **ada**.

Status KYC yang diteruskan Hub:

| Status | Arti |
|---|---|
| `INVITED` | Menunggu undangan KYC dari email |
| `AWAITING_DOCS` | Menunggu unggah dokumen |
| `IN_REVIEW` | Sedang diverifikasi |
| `LIVE` | Terverifikasi, dapat menerima pembayaran |
| `REJECTED` | Ditolak, perlu perbaikan dokumen |

```json
{
  "status": "success",
  "message": "Status sub-akun pembayaran",
  "data": {
    "id_akun_pembayaran": 7,
    "xendit_account_id": "xnd_development_xxx",
    "tipe": "MANAGED",
    "status_kyc": "INVITED",
    "nama_bank": "BCA",
    "nomor_rekening": "1234567890",
    "nama_pemilik": "RT 005 Perumahan Melati",
    "diperbarui_pada": "2026-09-22T13:23:34.651Z"
  }
}
```

- `POST /api/v1/billing/sub-akun/tautan-kyc` — meminta Hub membuat tautan undangan:

```json
{ "nama_bank": "BCA", "nomor_rekening": "1234567890", "nama_pemilik": "RT 005 Perumahan Melati" }
```

```json
{
  "status": "success",
  "message": "Tautan KYC diminta ke Hub",
  "data": {
    "status_kyc": "INVITED",
    "tautan_kyc": "https://partners.logikraf.id/kyc/invite/<token-undangan>",
    "berlaku_hingga": "2026-09-29T13:23:34.651Z"
  }
}
```

> **Prasyarat (revisi 2026-09-24, hardening):** QRIS hanya dapat dibuat bila akun pembayaran RT berstatus **`LIVE`** (verifikasi selesai) **dan kanal QRIS sudah diaktifkan** (`payment_channels`). Bila belum ada akun → `422`; bila ada tapi belum `LIVE` → `409` mengarahkan ke **Verifikasi Identitas**; bila `LIVE` tapi kanal belum aktif → `409` dengan pesan netral "Kanal pembayaran QRIS belum diaktifkan". Status kanal tampil di `GET /kyc` (`kanal_qris_aktif`) dan badge halaman Verifikasi.

### 10.3 Buat QRIS per Tagihan Iuran via Hub (TARGET)

- `POST /api/v1/billing/qris` — Bendahara, Ketua_RT (UC-31).
- SmartHub memanggil Hub `POST /api/client-store-qris` dengan header `X-Logikraf-Internal-Key` dan `external_id` berprefix `sb-` (mis. `sb-tenant12-qris-20260922-001`). Hub membuat QRIS atas nama sub-akun RT yang dikelolanya.

```json
{ "id_iuran": 412 }
```

**Batas wajib yang divalidasi server:**

| Aturan | Nilai | Perilaku bila dilanggar |
|---|---|---|
| Nominal maksimum | Rp10.000.000 | `422` — sarankan pecah tagihan atau metode lain |
| Masa kedaluwarsa | ≤48 jam (batas Xendit) | Bila Hub mengembalikan `expires_at` lebih panjang, dipangkas/ditolak `422` |
| Akun pembayaran | tersedia (`AkunPembayaranTenant`) | `422` — selesaikan Verifikasi Identitas terlebih dahulu |
| Kanal QRIS | aktif (`payment_channels.qris`) | `409` — "Kanal pembayaran QRIS belum diaktifkan" (pesan netral) |

- Response Sukses (201 Created) — field respons menormalkan payload Hub (`qr_string`, `expires_at`, `simulate_allowed`):

```json
{
  "status": "success",
  "message": "QRIS berhasil dibuat",
  "data": {
    "id_pembayaran_iuran": 501,
    "id_iuran": 412,
    "external_id": "sb-tenant12-qris-20260922-001",
    "referensi_bayar": "SB-QRIS-20260922-001",
    "qr_string": "000201010212...<EMV QR string panjang>",
    "jumlah": "75000.00",
    "expires_at": "2026-09-24T13:00:00.000Z",
    "simulate_allowed": false,
    "status": "PENDING"
  }
}
```

> **Catatan:** `simulate_allowed` hanya `true` pada mode uji Hub dan **wajib `false` di produksi**. QR string placeholder (pendek) menandakan sub-akun belum `LIVE`/mode uji; jangan menampilkannya sebagai QR yang dapat dipindai.

### 10.4 Status Pembayaran QRIS (TARGET)

- `GET /api/v1/billing/qris/:id_pembayaran_iuran` — Bendahara/Ketua_RT; Warga hanya untuk tagihan rumahnya sendiri.
- SmartHub memproksi Hub `GET /api/payment/qris/:reference_id`. Status Hub: `UNPAID`/`PENDING`, `PAID`, `SETTLED`, `EXPIRED`, `FAILED`.
- **Status tidak final sebelum webhook Hub diterima** (`10.15`). Setelah `PAID`, tagihan iuran otomatis `Lunas`; `SETTLED` hanya menandai dana selesai di-settle pada sub-akun dan **tidak** mengubah tagihan lagi. Nilai `mdr`, `fee_platform`, dan `net_ke_rt` mengikuti ledger Hub.

```json
{
  "status": "success",
  "message": "Status pembayaran QRIS",
  "data": {
    "id_pembayaran_iuran": 501,
    "referensi_bayar": "SB-QRIS-20260922-001",
    "status": "PAID",
    "status_settlement": "PENDING",
    "paid_at": "2026-09-22T13:12:00.000Z",
    "settled_at": null,
    "mdr": "525.00",
    "fee_platform": "2500.00",
    "net_ke_rt": "71975.00"
  }
}
```

### 10.5–10.7 Transaksi & Ledger (TARGET)

- `GET /api/v1/billing/transaksi?status=PAID&dari=2026-09-01&sampai=2026-09-30&page=1&limit=20` — offset pagination.
- `GET /api/v1/billing/transaksi/:id_transaksi` — detail beserta entri ledger terkait.
- `GET /api/v1/billing/ledger` tidak menerima `id_tenant` dari klien; ledger pelaku selalu ter-scope tenant dari JWT.
- Setiap transaksi menghasilkan entri double-entry: piutang iuran, kas RT, fee platform, dan utang pencairan (UC-32). **Hub adalah otoritatif atas status transaksi**; ledger SmartHub adalah rekonsiliasi internal.

```json
{
  "status": "success",
  "message": "Ledger transaksi",
  "data": [
    {
      "id_ledger": 9001,
      "tipe": "Pembayaran_Iuran",
      "id_referensi": 501,
      "external_id": "sb-tenant12-qris-20260922-001",
      "entries": [
        { "akun": "Kas_RT", "debit": "71975.00", "kredit": "0.00" },
        { "akun": "Fee_Platform", "debit": "2500.00", "kredit": "0.00" },
        { "akun": "MDR_Penyedia", "debit": "525.00", "kredit": "0.00" },
        { "akun": "Piutang_Iuran", "debit": "0.00", "kredit": "75000.00" }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 10.8–10.10 Pencairan = Settlement Hub (TARGET)

SmartHub **tidak** memanggil API disbursement penyedia langsung. Bila sub-akun mendukung payout, SmartHub mengirim permintaan payout ke Hub (`POST /api/client-store/payouts`) dengan header **`Idempotency-Key` stabil** `sb-pencairan-<id_pencairan>` (tanpa stempel waktu) — kunci yang sama dipakai ulang saat retry sehingga tidak terjadi pencairan ganda. Hub memproses transfer dan mengunggah bukti; status disinkronkan lewat webhook `payout.*`.

- `POST /api/v1/billing/pencairan` — Ketua_RT, Bendahara (UC-33). Pencairan dijadwalkan **sekali per bulan secara agregat** (bukan per transaksi) untuk menekan biaya transfer. Body: `{ "jumlah": 50000, "id_rekening"?: 7, "dijadwalkan_pada"?: "2026-09-30" }`.
- `GET /api/v1/billing/pencairan?status=SELESAI&page=1&limit=20`; `GET /api/v1/billing/pencairan/:id_pencairan`.
- Status: `MENUNGGU → PROCESSING → SELESAI`, atau `GAGAL` / `DIBATALKAN`. Pemetaan dari Hub: `ACCEPTED/REQUESTED/READY/LOCKED/PENDING_COMPLIANCE_REVIEW → MENUNGGU`, `ROUTING → PROCESSING`, `SUCCEEDED → SELESAI`, `FAILED/REJECTED/EXPIRED/REVERSED → GAGAL`, `CANCELLED → DIBATALKAN`, dan **`DUPLICATE_ERROR → MENUNGGU`** (sukses idempoten, bukan kegagalan). Status final tidak dimundurkan oleh event tertunda.
- Settlement manual tetap didukung lewat **Internal Finance API** (`10.16`–`10.20`): `processing` (locked), `paid` + bukti (multipart), `unlock` bila gagal.

```json
{ "jumlah": 50000, "id_rekening": 7, "dijadwalkan_pada": "2026-09-30" }
```

```json
{
  "status": "success",
  "message": "Pencairan dana diajukan",
  "data": {
    "id_pencairan": 33,
    "id_rekening": 7,
    "jumlah": "50000.00",
    "biaya_transfer": "0.00",
    "status": "MENUNGGU",
    "metode": "Payout",
    "referensi_payout": "sb-pencairan-33",
    "failure_code": null,
    "failure_reason": null,
    "bukti_transfer": null,
    "dijadwalkan_pada": "2026-09-30",
    "selesai_pada": null,
    "dibuat_pada": "2026-09-24T02:00:00.000Z"
  }
}
```

### 10.11–10.12 Refund & Sengketa (TARGET)

- `POST /api/v1/billing/refund` — Bendahara, Ketua_RT (UC-34). Hanya untuk salah bayar ganda atau pembatalan tagihan sebelum dana dicairkan.
- **Alur refund mengikuti Hub.** Untuk mengembalikan fee yang sudah tercatat, SmartHub memanggil Hub `POST /api/client-store-fee-reverse` dengan `external_id` transaksi asal. Ini adalah **koreksi ledger internal Hub**, bukan pemulihan dana dari Xendit.
- **Kebijakan fee:** split fee yang sudah terjadi **tidak** otomatis kembali; refund mengembalikan pokok sesuai kebijakan, fee dan MDR diperlakukan eksplisit pada respons.
- Sengketa QRIS dari penerbit dapat muncul hingga **90 hari** dan harus dapat ditelusuri ke transaksi asal.

```json
{ "id_pembayaran_iuran": 501, "alasan": "Salah bayar ganda", "kembalikan_fee": false }
```

```json
{
  "status": "success",
  "message": "Refund diajukan",
  "data": {
    "id_refund": 12,
    "external_id": "sb-tenant12-qris-20260922-001",
    "jumlah_pokok": "75000.00",
    "fee_dikembalikan": "0.00",
    "status": "Diproses"
  }
}
```

### 10.13–10.14 Rekonsiliasi (TARGET)

- `GET /api/v1/billing/rekonsiliasi?tanggal=2026-09-22` — laporan perbandingan **transaksi Hub vs ledger internal** (UC-35). **Hub adalah otoritatif**; selisih ditandai untuk diperiksa.
- `POST /api/v1/billing/rekonsiliasi/jalankan` — Platform_Admin; memicu rekonsiliasi/fallback **polling ke Hub** (`GET /api/payment/qris/:reference_id`) bila webhook gagal atau hilang.

```json
{
  "status": "success",
  "message": "Laporan rekonsiliasi",
  "data": {
    "tanggal": "2026-09-22",
    "jumlah_transaksi_hub": 120,
    "jumlah_transaksi_ledger": 119,
    "selisih": 1,
    "item_selisih": [ { "referensi_bayar": "SB-QRIS-20260922-002", "status_hub": "PAID", "status_ledger": "TIDAK_DITEMUKAN" } ]
  }
}
```

### 10.15 Webhook Logikraf Hub (TARGET)

- `POST /api/v1/billing/webhook/logikraf` — **Public, tanpa JWT**. Webhook ini berasal dari **Logikraf Hub**, bukan Xendit. Keamanan lewat verifikasi header **`X-Logikraf-Signature`** = HMAC-SHA256 atas **raw body** menggunakan internal key, dan **idempotensi** lewat `event_id` unik (lihat `Lampiran C`).
- **`PAID` dan `SETTLED` adalah dua peristiwa berbeda** dan ditangani terpisah (`PAID` → tagihan `Lunas`; `SETTLED` → status settlement/sub-akun).
- Endpoint **selalu** mengembalikan `200` bila signature valid dan event sudah/idempotent tercatat, agar Hub berhenti mengirim ulang. `401` hanya bila signature tidak valid.
- Nominal **selalu** dibaca dari database internal berdasarkan `external_id`/`reference_id`, bukan dari payload. `external_id` yang valid berprefix `sb-`.
- Tidak ada lagi acuan `x-callback-token` Xendit di SmartHub; verifikasi token callback hanya berlaku di sisi Hub.

```json
{
  "status": "success",
  "message": "Event diterima",
  "data": { "event_id": "evt_hub_01H...", "status": "diproses" }
}
```

### 10.16–10.20 Internal Finance API — Kontrak Wajib untuk Hub (TARGET)

**Internal Finance API wajib disediakan SmartHub** dan dipanggil **Hub ke SmartHub** untuk keperluan settlement dan rekonsiliasi. Seluruh endpoint:

- berada **di luar grup autentikasi JWT**;
- wajib menyertakan header **`X-Logikraf-Internal-Key`** (constant-time compare, tolak `401` bila gagal);
- **tidak boleh terekspos publik** — hanya jaringan internal/allowlist Hub, tidak didaftarkan pada OpenAPI/dokumentasi publik;
- response-nya tidak memuat API key Xendit maupun nilai internal key.

#### 10.16 `GET /api/v1/internal/finance/summary`

Ringkasan keuangan yang dikonsumsi Hub.

```json
{
  "data": {
    "total_revenue": 15000000,
    "product_revenue": 14500000,
    "pending_total": 2000000,
    "settled_total": 10000000,
    "outstanding": 3000000,
    "available_for_payout": 2500000,
    "xendit_fee_total": 300000,
    "net_revenue": 14700000
  }
}
```

#### 10.17 `GET /api/v1/internal/settlements`

Daftar settlement/pencairan. Query: `status` (`pending`/`processing`/`paid`), `page`, `limit`.

```json
{
  "data": [
    { "id": 33, "periode": "2026-09", "jumlah": 4321000, "status": "pending", "bukti_transfer_url": null }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

#### 10.18 `PATCH /api/v1/internal/settlements/:id/processing`

Menandai settlement **locked** dan sedang ditransfer. Tidak dapat dibatalkan setelah status ini.

```json
{ "data": { "id": 33, "status": "processing", "locked_at": "2026-10-01T02:05:00.000Z" } }
```

#### 10.19 `PATCH /api/v1/internal/settlements/:id/paid`

Menandai settlement **dibayar** dan mengunggah bukti transfer. `multipart/form-data`, field berkas `bukti_transfer`.

```json
{
  "data": {
    "id": 33,
    "status": "paid",
    "bukti_transfer_url": "https://cdn.smarthub.local/uploads/bukti-33.jpg",
    "dibayar_pada": "2026-10-01T03:10:00.000Z"
  }
}
```

#### 10.20 `PATCH /api/v1/internal/settlements/:id/unlock`

Membuka kembali settlement yang gagal dari `processing` ke `pending`.

```json
{ "data": { "id": 33, "status": "pending", "catatan": "Transfer gagal — rekening tujuan tidak valid" } }
```

> **Catatan kontrak.** Endpoint internal ini adalah **syarat integrasi dari Hub**; tanpa tersedianya endpoint ini, Hub tidak dapat menyelesaikan pencairan/settlement. Nomor `10.16`–`10.20` **tidak dipublikasikan** sebagai bagian API produk.

### 10.21 Fee Platform & Guardrail Biaya (bukan endpoint — TARGET, **kebijakan final**)

| Pihak | Skema | Catatan |
|---|---|---|
| SmartHub → RT | **Flat Rp2.500 per transaksi** | **Pendapatan** — dirutekan ke Logikraf via split |
| Hub → Logikraf | biaya internal | Ditanggung di level Logikraf, bukan per transaksi SmartHub |
| Tenant (RT) | **MDR ±0,7% + biaya transfer pencairan** | **Ditanggung RT**, dipotong dari saldo sub-akun |

**Keputusan 2026-09-24:** fee **flat Rp2.500** di semua nominal (bukan `maksimum(Rp2.500, 3%)`).

| Nominal tagihan | `fee_platform` ditagih ke RT | MDR ±0,7% (ditanggung RT) |
|---|---|---|
| Rp50.000 | `"2500.00"` | ±`"350.00"` |
| Rp100.000 | `"2500.00"` | ±`"700.00"` |
| Rp1.000.000 | `"2500.00"` | ±`"7000.00"` |

> **Cara membaca respons settlement.** Bila respons memuat `mdr` atau `biaya_transfer`, nilai itu adalah **potongan milik RT**, bukan biaya SmartHub. Bentuk perhitungan yang ditampilkan ke pengurus: `iuran − fee_platform − mdr − biaya_transfer = net ke kas RT`. Fee yang sudah dipisah **tidak** dikembalikan saat refund.

> Nomor `10.21` adalah **catatan kebijakan, bukan endpoint**.

---

## 11. Modul Konsol Platform (`/api/v1/admin`)

> **Status: TARGET.** Seluruh endpoint pada bab ini **belum ada di kode** (UC-36, UC-37). Akses memakai peran platform (`AkunPlatform`) dan bukan peran RT.

### Ringkasan Endpoint

| # | Method | Path | Akses | UC | Deskripsi |
|---|---|---|---|---|---|
| 11.1 | GET | `/admin/tenant` | Owner, Admin, Support | UC-36 | Daftar tenant |
| 11.2 | GET | `/admin/tenant/:id_tenant` | Owner, Admin, Support | UC-36 | Detail tenant |
| 11.3 | PATCH | `/admin/tenant/:id_tenant/status` | Owner, Admin | UC-36 | Tangguhkan/aktifkan tenant (alasan wajib) |
| 11.4 | GET | `/admin/metrik` | Owner (penuh), Admin (read-only) | UC-36 | Metrik bisnis & pendapatan |
| 11.5 | GET | `/admin/audit-log` | Owner, Admin, Support | UC-37 | Daftar audit log platform |
| 11.6 | GET | `/admin/audit-log/:id_audit` | Owner, Admin, Support | UC-37 | Detail audit log |
| 11.7 | POST | `/admin/impersonasi` | Owner, Admin, Support | UC-37 | Mulai impersonasi terbatas |
| 11.8 | DELETE | `/admin/impersonasi/:id_sesi` | Owner, Admin, Support | UC-37 | Akhiri impersonasi |
| 11.9 | GET | `/admin/paket` | Platform_Owner | – | Daftar paket langganan |
| 11.10 | PATCH | `/admin/paket/:kode` | Platform_Owner | – | Ubah harga/fitur paket |

### 11.1–11.2 Daftar & Detail Tenant (TARGET)

- `GET /api/v1/admin/tenant?status=Menunggak&q=melati&page=1&limit=20` — owner/admin/support.
- `GET /api/v1/admin/tenant/:id_tenant` — menampilkan status langganan, kesehatan pembayaran, dan ringkasan pemakaian. `id_tenant` di sini adalah **path konsol**, bukan input tenant-scoped.

```json
{
  "status": "success",
  "message": "Daftar tenant",
  "data": [
    { "id_tenant": 12, "nama": "RT 005 Perumahan Melati", "slug": "rt-005-melati", "status": "Aktif", "status_langganan": "Menunggak", "jumlah_rumah": 120 }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 11.3 Tangguhkan / Aktifkan Tenant (TARGET)

- `PATCH /api/v1/admin/tenant/:id_tenant/status` — Platform_Owner, Platform_Admin. **Alasan wajib** dan tercatat pada audit log (UC-36).

```json
{ "status": "Ditangguhkan", "alasan": "Tunggakan langganan > 30 hari" }
```

- Response Sukses (200 OK):

```json
{
  "status": "success",
  "message": "Status tenant diperbarui",
  "data": { "id_tenant": 12, "status": "Ditangguhkan", "diubah_oleh": "platform_admin", "alasan": "Tunggakan langganan > 30 hari" }
}
```

### 11.4 Metrik Bisnis (TARGET)

- `GET /api/v1/admin/metrik?dari=2026-09-01&sampai=2026-09-30` — Platform_Owner penuh; Platform_Admin read-only. Sumber: ledger & invoice.

```json
{
  "status": "success",
  "message": "Metrik bisnis",
  "data": { "gmv_iuran": "1500000000.00", "pendapatan_fee": "15000000.00", "mrr_langganan": "7500000.00", "tenant_aktif": 42, "churn_bulanan": 0.02 }
}
```

### 11.5–11.6 Audit Log Platform (TARGET)

- `GET /api/v1/admin/audit-log?entitas=Tenant&id_entitas=12&page=1&limit=20` — owner/admin/support.
- Audit log bersifat **append-only** dan tidak dapat diubah maupun dihapus.

```json
{
  "status": "success",
  "message": "Audit log",
  "data": [
    { "id_audit": 5501, "aktor_tipe": "AkunPlatform", "id_pelaku": 3, "aksi": "update_status", "entitas": "Tenant", "id_entitas": "12", "alasan": "Tunggakan langganan > 30 hari", "createdAt": "2026-09-22T13:40:00.000Z" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### 11.7–11.8 Impersonasi Terbatas (TARGET)

- `POST /api/v1/admin/impersonasi` — owner/admin/support. **Diagnosis saja**, durasi **maksimal 60 menit**, **alasan wajib**, dan setiap tindakan tercatat di audit log platform (UC-37).
- `DELETE /api/v1/admin/impersonasi/:id_sesi` — mengakhiri sesi lebih awal. Sesi otomatis berakhir pada `berakhir_pada`.

```json
{ "id_tenant": 12, "alasan": "Investigasi keluhan pembayaran ganda", "durasi_menit": 30 }
```

```json
{
  "status": "success",
  "message": "Sesi impersonasi dibuat",
  "data": {
    "id_sesi": 41,
    "id_tenant": 12,
    "token_impersonasi": "eyJhbGciOiJIUzI1NiIs...",
    "mulai_pada": "2026-09-22T13:45:00.000Z",
    "berakhir_pada": "2026-09-22T14:15:00.000Z",
    "maks_menit": 60
  }
}
```

> Tim platform **tidak boleh** mengubah data warga tanpa izin tenant; impersonasi hanya untuk membaca/mendiagnosis dan seluruhnya terekam audit.

### 11.9–11.10 Kelola Paket & Harga (TARGET)

- `GET /api/v1/admin/paket`; `PATCH /api/v1/admin/paket/:kode` — Platform_Owner. Perubahan harga tidak mengubah invoice yang sudah terbit.

---

## Lampiran A — Peta RBAC ke Endpoint

Matriks ini diturunkan dari `PRD.md` bab 6. Keterangan: `✅` = diizinkan, `–` = tidak diizinkan (`403`), `S` = hanya untuk sumber daya sendiri.

### A.1 Endpoint Existing (5 peran tenant)

Peran platform (`Platform_Owner`, `Platform_Admin`, `Platform_Support`) **tidak memiliki akses** ke endpoint pada tabel ini (`–`), kecuali melalui fitur konsol yang tercatat audit (Lampiran A.2).

| # | Endpoint | Method | Ketua_RT | Sekretaris | Bendahara | Keamanan | Warga |
|---|---|---|---|---|---|---|---|
| 1.1 | `/auth/login` | POST | Public | Public | Public | Public | Public |
| 1.2 | `/auth/register` | POST | ✅ | ✅ | – | – | – |
| 1.3 | `/auth/me` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1.4 | `/auth/password` | PATCH | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1.5 | `/auth/logout` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1.6 | `/auth/akun` | GET | ✅ | ✅ | – | – | – |
| 1.7 | `/auth/akun/kandidat` | GET | ✅ | ✅ | – | – | – |
| 1.8 | `/auth/akun/:id_pengguna` | PATCH | ✅ | ✅ | – | – | – |
| 1.9 | `/auth/akun/:id_pengguna/reset-password` | POST | ✅ | ✅ | – | – | – |
| 1.10 | `/auth/reset-password` | POST | Public | Public | Public | Public | Public |
| 1.11 | `/auth/akun/:id_pengguna/status` | PATCH | ✅ | – | – | – | – |
| 1.12 | `/auth/upload` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.1 | `/wilayah/rumah` | POST | ✅ | ✅ | – | – | – |
| 2.2 | `/wilayah/rumah` | GET | ✅ | ✅ | ✅ | – | – |
| 2.3 | `/wilayah/rumah/:id_rumah` | GET | ✅ | ✅ | ✅ | – | – |
| 2.4 | `/wilayah/rumah/:id_rumah` | PATCH | ✅ | ✅ | – | – | – |
| 3.1 | `/kependudukan/kk` | POST | ✅ | ✅ | – | – | – |
| 3.2 | `/kependudukan/kk/saya` | GET | – | – | – | – | ✅ |
| 3.3 | `/kependudukan/kk` | GET | ✅ | ✅ | ✅ | – | – |
| 3.4 | `/kependudukan/kk/:no_kk` | GET | ✅ | ✅ | ✅ | – | – |
| 3.5 | `/kependudukan/kk/:no_kk` | PATCH | ✅ | ✅ | – | – | – |
| 3.6 | `/kependudukan/warga` | POST | ✅ | ✅ | – | – | – |
| 3.7 | `/kependudukan/warga` | GET | ✅ | ✅ | ✅ | – | – |
| 3.8 | `/kependudukan/warga/:nik` | GET | ✅ | ✅ | ✅ | – | – |
| 3.9 | `/kependudukan/warga/:nik/status` | PATCH | ✅ | ✅ | – | – | – |
| 3.10 | `/kependudukan/warga/:nik` | PATCH | ✅ | ✅ | – | – | – |
| 3.11 | `/kependudukan/mutasi` | POST | – | ✅ | – | – | – |
| 3.12 | `/kependudukan/mutasi` | GET | ✅ | ✅ | ✅ | – | – |
| 3.13 | `/kependudukan/mutasi/:id_mutasi/verifikasi` | PATCH | ✅ | – | – | – | – |
| 4.1 | `/keamanan/tamu` | POST | – | – | – | ✅ | – |
| 4.2 | `/keamanan/tamu` | GET | ✅ | ✅ | – | ✅ | – |
| 4.3 | `/keamanan/tamu/:id_tamu` | GET | ✅ | ✅ | – | ✅ | – |
| 4.4 | `/keamanan/tamu/:id_tamu` | PATCH | – | – | – | ✅ | – |
| 4.5 | `/keamanan/tamu/:id_tamu/checkout` | PUT | – | – | – | ✅ | – |
| 5.1 | `/keuangan/kategori` | POST | ✅ | – | ✅ | – | – |
| 5.2 | `/keuangan/kategori` | GET | ✅ | – | ✅ | – | – |
| 5.3 | `/keuangan/kategori/:id_kategori` | PATCH | ✅ | – | ✅ | – | – |
| 5.4 | `/keuangan/iuran/generate` | POST | ✅ | – | ✅ | – | – |
| 5.5 | `/keuangan/iuran` | GET | ✅ | ✅ | ✅ | – | – |
| 5.6 | `/keuangan/iuran/saya` | GET | – | – | – | – | ✅ |
| 5.7 | `/keuangan/iuran/:id_iuran/bayar` | PUT | – | – | – | – | ✅ |
| 5.8 | `/keuangan/iuran/:id_iuran/verifikasi` | PATCH | – | – | ✅ | – | – |
| 5.9 | `/keuangan/iuran/:id_iuran/batal` | PATCH | – | – | ✅ | – | – |
| 5.10 | `/keuangan/kas` | POST | – | – | ✅ | – | – |
| 5.11 | `/keuangan/kas/ringkasan` | GET | ✅ | ✅ | ✅ | – | ✅ |
| 5.12 | `/keuangan/kas` | GET | ✅ | ✅ | ✅ | – | ✅ |
| 5.13 | `/keuangan/kas/:id_transaksi/verifikasi` | PATCH | ✅ | – | – | – | – |
| 6.1 | `/diskusi/postingan` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6.2 | `/diskusi/postingan` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6.3 | `/diskusi/postingan/:id_postingan` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6.4 | `/diskusi/postingan/:id_postingan` | PATCH | S | S | S | S | S |
| 6.5 | `/diskusi/postingan/:id_postingan` | DELETE | ✅ | ✅ | S | S | S |
| 6.6 | `/diskusi/postingan/:id_postingan/status` | PATCH | ✅ | ✅ | – | – | – |
| 6.7 | `/diskusi/postingan/:id_postingan/reaksi` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6.8 | `/diskusi/poll/:id_poll/suara` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6.9 | `/diskusi/poll/:id_poll/tutup` | POST | ✅ | ✅ | S | S | S |
| 6.10 | `/diskusi/mention` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.1 | `/marketplace/kategori` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.2 | `/marketplace/kategori` | POST | ✅ | ✅ | – | – | – |
| 7.3 | `/marketplace/kategori/:id_kategori_produk` | PATCH | ✅ | ✅ | – | – | – |
| 7.4 | `/marketplace/produk` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.5 | `/marketplace/produk-saya` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.6 | `/marketplace/favorit` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.7 | `/marketplace/produk` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.8 | `/marketplace/produk/:id_produk` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.9 | `/marketplace/produk/:id_produk` | PATCH | S | S | S | S | S |
| 7.10 | `/marketplace/produk/:id_produk` | DELETE | ✅ | ✅ | S | S | S |
| 7.11 | `/marketplace/produk/:id_produk/status` | PATCH | ✅ | ✅ | – | – | – |
| 7.12 | `/marketplace/produk/:id_produk/favorit` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.13 | `/marketplace/produk/:id_produk/favorit` | DELETE | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.14 | `/marketplace/laporan` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.15 | `/marketplace/laporan` | GET | ✅ | ✅ | – | – | – |
| 7.16 | `/marketplace/laporan/:id_laporan` | PATCH | ✅ | ✅ | – | – | – |
| 8.1 | `/notifikasi` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8.2 | `/notifikasi/jumlah` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8.3 | `/notifikasi/:id_notifikasi/baca` | PATCH | S | S | S | S | S |
| 8.4 | `/notifikasi/baca-semua` | PATCH | ✅ | ✅ | ✅ | ✅ | ✅ |

### A.2 Endpoint SaaS (peran tenant + 3 peran platform)

Endpoint baru bab 9–11 bertanda **TARGET**. Kolom `PC` = *Public*, `S` = untuk sumber daya sendiri.

| # | Endpoint | Method | Ketua_RT | Sekretaris | Bendahara | Keamanan | Warga | P_Owner | P_Admin | P_Support |
|---|---|---|---|---|---|---|---|---|---|---|
| 9.1 | `/tenant/registrasi` | POST | PC | PC | PC | PC | PC | PC | PC | PC |
| 9.2 | `/tenant/profil` | GET | ✅ | ✅ | – | – | – | – | – | – |
| 9.3 | `/tenant/profil` | PATCH | ✅ | – | – | – | – | – | – | – |
| 9.4 | `/tenant/verifikasi/dokumen` | POST | ✅ | – | – | – | – | – | – | – |
| 9.5 | `/tenant/verifikasi` | GET | ✅ | ✅ | – | – | – | – | – | – |
| 9.6 | `/tenant/anggota` | GET | ✅ | ✅ | – | – | – | – | – | – |
| 9.7 | `/tenant/anggota/undang` | POST | ✅ | ✅ | – | – | – | – | – | – |
| 9.8 | `/tenant/anggota/:id_pengguna` | PATCH | ✅ | ✅ | – | – | – | – | – | – |
| 9.9 | `/tenant/anggota/:id_pengguna` | DELETE | ✅ | – | – | – | – | – | – | – |
| 9.10 | `/tenant/impor` | POST | ✅ | ✅ | – | – | – | – | – | – |
| 9.11 | `/tenant/ekspor` | POST | ✅ | – | – | – | – | – | – | – |
| 9.12 | `/tenant/ekspor/:id_ekspor` | GET | ✅ | ✅ | – | – | – | – | – | – |
| 9.13 | `/tenant/permintaan-data` | POST | – | – | – | – | ✅ | – | – | – |
| 9.14 | `/tenant/permintaan-data/:id_permintaan` | GET | ✅ | – | – | – | S | – | – | – |
| 9.15 | `/langganan/paket` | GET | PC | PC | PC | PC | PC | PC | PC | PC |
| 9.16 | `/langganan` | GET | ✅ | ✅ | ✅ | – | – | – | – | – |
| 9.17 | `/langganan/aktivasi` | POST | ✅ | – | ✅ | – | – | – | – | – |
| 9.18 | `/langganan/ubah-paket` | POST | ✅ | – | ✅ | – | – | – | – | – |
| 9.19 | `/langganan/kuota` | GET | ✅ | ✅ | ✅ | – | – | – | – | – |
| 9.20 | `/langganan/invoice` | GET | ✅ | ✅ | ✅ | – | – | – | – | – |
| 9.21 | `/langganan/invoice/:id_invoice` | GET | ✅ | ✅ | ✅ | – | – | – | – | – |
| 9.22 | `/langganan/invoice/:id_invoice/bayar` | POST | ✅ | – | ✅ | – | – | – | – | – |
| 9.23 | `/langganan/pembatalan` | POST | ✅ | – | – | – | – | – | – | – |
| 10.1 | `/billing/sub-akun` | GET | ✅ | – | ✅ | – | – | – | – | – |
| 10.2 | `/billing/sub-akun/tautan-kyc` | POST | ✅ | – | ✅ | – | – | – | – | – |
| 10.3 | `/billing/qris` | POST | ✅ | – | ✅ | – | – | – | – | – |
| 10.4 | `/billing/qris/:id_pembayaran_iuran` | GET | ✅ | – | ✅ | – | S | – | – | – |
| 10.5 | `/billing/transaksi` | GET | ✅ | ✅ | ✅ | – | – | – | – | – |
| 10.6 | `/billing/transaksi/:id_transaksi` | GET | ✅ | ✅ | ✅ | – | – | – | – | – |
| 10.7 | `/billing/ledger` | GET | ✅ | – | ✅ | – | – | – | – | – |
| 10.8 | `/billing/pencairan` | POST | ✅ | – | ✅ | – | – | – | – | – |
| 10.9 | `/billing/pencairan` | GET | ✅ | – | ✅ | – | – | – | – | – |
| 10.10 | `/billing/pencairan/:id_pencairan` | GET | ✅ | – | ✅ | – | – | – | – | – |
| 10.11 | `/billing/refund` | POST | ✅ | – | ✅ | – | – | – | – | – |
| 10.12 | `/billing/refund/:id_refund` | GET | ✅ | – | ✅ | – | – | – | – | – |
| 10.13 | `/billing/rekonsiliasi` | GET | ✅ | – | ✅ | – | – | – | – | – |
| 10.14 | `/billing/rekonsiliasi/jalankan` | POST | – | – | – | – | – | – | ✅ | – |
| 10.15 | `/billing/webhook/logikraf` | POST | PC* | PC* | PC* | PC* | PC* | PC* | PC* | PC* |
| 10.16–10.20 | `/internal/finance/summary`, `/internal/settlements*` | GET/PATCH | Internal | Internal | Internal | Internal | Internal | Internal | Internal | Internal |
| 11.1 | `/admin/tenant` | GET | – | – | – | – | – | ✅ | ✅ | ✅ |
| 11.2 | `/admin/tenant/:id_tenant` | GET | – | – | – | – | – | ✅ | ✅ | ✅ |
| 11.3 | `/admin/tenant/:id_tenant/status` | PATCH | – | – | – | – | – | ✅ | ✅ | – |
| 11.4 | `/admin/metrik` | GET | – | – | – | – | – | ✅ | ✅ | – |
| 11.5 | `/admin/audit-log` | GET | – | – | – | – | – | ✅ | ✅ | ✅ |
| 11.6 | `/admin/audit-log/:id_audit` | GET | – | – | – | – | – | ✅ | ✅ | ✅ |
| 11.7 | `/admin/impersonasi` | POST | – | – | – | – | – | ✅ | ✅ | ✅ |
| 11.8 | `/admin/impersonasi/:id_sesi` | DELETE | – | – | – | – | – | ✅ | ✅ | ✅ |
| 11.9 | `/admin/paket` | GET | – | – | – | – | – | ✅ | – | – |
| 11.10 | `/admin/paket/:kode` | PATCH | – | – | – | – | – | ✅ | – | – |

> `*` **Public dengan verifikasi `X-Logikraf-Signature`** (bukan JWT, bukan peran). Baris `Internal` tidak memakai peran RT maupun peran platform: hanya Hub, lewat header `X-Logikraf-Internal-Key` (lihat A.3).

### A.3 Endpoint Internal (Hub → SmartHub)

Endpoint berikut **di luar JWT** dan hanya untuk Hub. Akses = `Internal` (`X-Logikraf-Internal-Key`); tidak dipublikasikan dan tidak muncul di OpenAPI publik.

| # | Endpoint | Method | Akses |
|---|---|---|---|
| 10.16 | `/internal/finance/summary` | GET | Internal |
| 10.17 | `/internal/settlements` | GET | Internal |
| 10.18 | `/internal/settlements/:id/processing` | PATCH | Internal |
| 10.19 | `/internal/settlements/:id/paid` | PATCH (multipart) | Internal |
| 10.20 | `/internal/settlements/:id/unlock` | PATCH | Internal |

---

## Lampiran B — Traceability Use Case → Endpoint (UC-01…UC-38)

Nomor UC mengikuti `PRD.md` bab 7 tanpa pergeseran. Nomor endpoint mengacu pada tabel ringkasan tiap bab (mis. `10.4`).

| UC | Deskripsi | Endpoint | Status |
|---|---|---|---|
| UC-01 | Login Multi-Role (email / nomor HP / username) | 1.1, 1.3 | TERIMPLEMENTASI |
| UC-02 | Pembuatan Akun Pengguna | 1.2, 1.7 | TERIMPLEMENTASI |
| UC-03 | Manajemen Akun oleh Pengurus | 1.6, 1.8, 1.11 | TERIMPLEMENTASI |
| UC-04 | Manajemen Data Rumah | 2.1, 2.2, 2.3, 2.4 | TERIMPLEMENTASI |
| UC-05 | Manajemen Kartu Keluarga | 3.1, 3.2, 3.3, 3.4, 3.5 | TERIMPLEMENTASI |
| UC-06 | Manajemen Biodata Warga (Anti-Hapus) | 3.6, 3.7, 3.8, 3.9, 3.10 | TERIMPLEMENTASI |
| UC-07 | Log Mutasi Warga | 3.11, 3.12, 3.13 | TERIMPLEMENTASI |
| UC-08 | Log Tamu Masuk & Keluar | 4.1, 4.2, 4.3, 4.4, 4.5 | TERIMPLEMENTASI |
| UC-09 | Otomatisasi Tagihan Iuran Bulanan | 5.1, 5.2, 5.3, 5.4 | TERIMPLEMENTASI |
| UC-10 | Pembayaran Mandiri & Verifikasi | 5.5, 5.6, 5.7, 5.8, 5.9, 10.3, 10.4 | TERIMPLEMENTASI + TARGET |
| UC-11 | Buku Kas Umum | 5.10, 5.12, 5.13 | TERIMPLEMENTASI |
| UC-12 | Dasbor Laporan Keuangan Real-Time | 5.11 | TERIMPLEMENTASI |
| UC-13 | Reset Password Mandiri | 1.9, 1.10 | TERIMPLEMENTASI |
| UC-14 | Diskusi — Postingan & Balasan | 6.1, 6.2, 6.3, 6.4, 6.5 | TERIMPLEMENTASI |
| UC-15 | Diskusi — Tombol Suka | 6.7 | TERIMPLEMENTASI |
| UC-16 | Diskusi — Poll & Vote | 6.8, 6.9 | TERIMPLEMENTASI |
| UC-17 | Diskusi — Moderasi | 6.6 | TERIMPLEMENTASI |
| UC-18 | Marketplace — Katalog & Pencarian | 7.1, 7.4, 7.8 | TERIMPLEMENTASI |
| UC-19 | Marketplace — Jual Produk | 7.5, 7.7, 7.9, 7.10, 7.11 | TERIMPLEMENTASI |
| UC-20 | Marketplace — Favorit & Kontak Penjual | 7.6, 7.12, 7.13 | TERIMPLEMENTASI |
| UC-21 | Marketplace — Moderasi & Laporan | 7.2, 7.3, 7.14, 7.15, 7.16 | TERIMPLEMENTASI |
| UC-22 | Diskusi — Sebut Pengguna (Mention) | 6.10 | TERIMPLEMENTASI |
| UC-23 | Notifikasi Pribadi | 8.1, 8.2, 8.3, 8.4 | TERIMPLEMENTASI |
| UC-24 | Pendaftaran Tenant Self-Serve | 9.1 | TARGET |
| UC-25 | Verifikasi Identitas (KYC) Tenant | 9.4 (`/kyc/*`) | SUDAH ADA (uji penyedia via Hub) |
| UC-26 | Trial & Aktivasi Langganan | 9.15, 9.16, 9.17 | TARGET |
| UC-27 | Tagihan & Pembayaran Langganan | 9.20, 9.21, 9.22 | TARGET |
| UC-28 | Kuota & Perubahan Paket | 9.18, 9.19 | TARGET |
| UC-29 | Penonaktifan & Pembatalan Tenant | 9.23 | TARGET |
| UC-30 | Onboarding Sub-Akun Pembayaran RT (KYC di SmartHub, eksekusi di Hub) | 9.4, 10.1, 10.2 | SUDAH ADA (uji penyedia nyata) |
| UC-31 | Tagihan Iuran QRIS via Hub & Pembayaran Warga | 10.3, 10.4 | TARGET |
| UC-32 | Fee Platform, Ledger & Ringkasan Keuangan | 10.5, 10.6, 10.7, 10.15, 10.16 | TARGET |
| UC-33 | Pencairan Dana (Settlement Hub) | 10.8, 10.9, 10.10, 10.17, 10.18, 10.19, 10.20 | TARGET |
| UC-34 | Refund & Sengketa Pembayaran | 10.11, 10.12 | TARGET |
| UC-35 | Rekonsiliasi Harian | 10.13, 10.14, 10.15 | TARGET |
| UC-36 | Konsol Admin Platform | 11.1, 11.2, 11.3, 11.4 | TARGET |
| UC-37 | Dukungan & Audit Log | 11.5, 11.6, 11.7, 11.8 | TARGET |
| UC-38 | Ekspor Data & Hak Subjek Data | 9.11, 9.12, 9.13, 9.14 | TARGET |

> **Catatan.** UC-10 dipenuhi dua jalur: transfer manual (5.7–5.9, sudah ada) dan QRIS via Hub (10.3–10.4, TARGET). Seluruh UC-01…UC-23 sudah terpetakan ke endpoint TERIMPLEMENTASI; UC-24…UC-38 terpetakan ke endpoint TARGET.

---

## Lampiran C — Kontrak Webhook Logikraf Hub

> **Status: TARGET.** Endpoint `POST /api/v1/billing/webhook/logikraf` belum ada di kode. Webhook masuk ke SmartHub **berasal dari Logikraf Hub**, bukan Xendit langsung. Nama event dapat berubah mengikuti Hub; verifikasi ke `docs/logikraf/payment-hub-integration-guide.md` sebelum implementasi.

### C.1 Keamanan & Verifikasi

| Aspek | Ketentuan |
|---|---|
| Autentikasi | Tanpa JWT. Verifikasi header `X-Logikraf-Signature` = **HMAC-SHA256 atas raw body** memakai internal key (`LOGIKRAF_INTERNAL_KEY`). |
| Constant-time | Perbandingan signature memakai *constant-time compare* dengan guard panjang buffer. |
| Kanal | Hanya HTTPS; signature tidak valid → `401`. |
| Body | Raw body dipakai apa adanya untuk verifikasi signature; **nominal dibaca dari database**, bukan dari payload. |
| Prefix | `external_id` yang valid berprefix `sb-`; permintaan dengan prefix lain diabaikan. |

### C.2 Idempotensi

1. Setiap event memiliki **`event_id` unik** dari Hub.
2. Sistem menyimpan event ke tabel `WebhookEvent` dengan constraint **`event_id` unik**.
3. Bila `event_id` sudah ada: kembalikan `200` **tanpa** memproses ulang (idempotent).
4. **`PAID` dan `SETTLED` adalah dua peristiwa berbeda** dan ditangani terpisah: `PAID` menandai tagihan `Lunas`; `SETTLED` memperbarui status settlement/sub-akun.
5. Pemrosesan asinkron; endpoint mengembalikan `200` cepat agar Hub berhenti mengirim ulang.
6. Kolom `processed_at` dan `error` mencatat hasil; event gagal dapat diproses ulang manual.

### C.3 Daftar Event

| Kategori | Event | Dampak internal |
|---|---|---|
| Pembayaran | `payment.paid` (`PAID`) | Menandai `PembayaranIuran` `PAID`, mengisi `mdr`, `fee_platform`, `net_ke_rt`, menulis ledger; tagihan → `Lunas` |
| Pembayaran | `payment.settled` (`SETTLED`) | Memperbarui `status_settlement` menjadi `paid`; **tidak** mengubah tagihan lagi |
| Pembayaran | `payment.failed` | Menandai `FAILED`; tidak mengubah tagihan |
| Pembayaran | `payment.expired` | Menandai `EXPIRED` |
| Refund | `refund.succeeded` | Menutup `Refund` dan mencatat penyesuaian ledger |
| Refund | `refund.failed` | Menandai refund gagal + alert |
| Settlement | `settlement.processing` | Menandai `Pencairan` `processing` (locked) |
| Settlement | `settlement.paid` | Menandai `Pencairan` `paid` + menyimpan `bukti_transfer_url` |
| Settlement | `settlement.failed` | Mengembalikan `Pencairan` ke `pending` (setara `unlock` `10.20`) + alert |
| Akun | `account.verification` | Memperbarui `AkunPembayaranTenant.status_kyc` (PASSED→LIVE) + `KycSubmission`; memicu notifikasi |
| Akun | `account.updated` | Memperbarui `penyedia_account_id`/status akun |

### C.4 Contoh Payload Hub

Pembayaran diterima (`PAID`):

```json
{
  "event_id": "evt_hub_01HZX8...",
  "event": "payment.paid",
  "status": "PAID",
  "created": "2026-09-22T13:12:00.000Z",
  "data": {
    "external_id": "sb-tenant12-qris-20260922-001",
    "reference_id": "SB-QRIS-20260922-001",
    "amount": 75000,
    "fees_paid_amount": 525,
    "paid_at": "2026-09-22T13:12:00.000Z",
    "store": { "name": "SmartHub v1", "prefix": "sb-" }
  }
}
```

Dana selesai di-settle (`SETTLED`, peristiwa terpisah):

```json
{
  "event_id": "evt_hub_01HZX9...",
  "event": "payment.settled",
  "status": "SETTLED",
  "data": {
    "external_id": "sb-tenant12-qris-20260922-001",
    "reference_id": "SB-QRIS-20260922-001",
    "net_amount": 71975,
    "settled_at": "2026-09-23T02:00:00.000Z"
  }
}
```

Settlement dibayar (bukti transfer dari Hub):

```json
{
  "event_id": "evt_hub_01HZXA...",
  "event": "settlement.paid",
  "data": {
    "settlement_id": 33,
    "periode": "2026-09",
    "jumlah": 4321000,
    "bukti_transfer_url": "https://cdn.smarthub.local/uploads/bukti-33.jpg",
    "paid_at": "2026-10-01T03:10:00.000Z"
  }
}
```

Status KYC sub-akun:

```json
{
  "event_id": "evt_hub_01HZXB...",
  "event": "account.kyc_status",
  "data": { "xendit_account_id": "xnd_development_xxx", "status_kyc": "LIVE" }
}
```

### C.5 Verifikasi Signature (contoh)

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
```

### C.6 Kebijakan Retry & Rekonsiliasi

1. Hub mengirim ulang event secara eksponensial hingga menerima `2xx`; karena itu endpoint **wajib idempotent**.
2. Endpoint mengembalikan `200` untuk event valid (baru maupun duplikat). `401` hanya untuk signature tidak valid; `400` untuk payload yang tidak dapat diparse.
3. **Fallback polling ke Hub:** bila webhook hilang, SmartHub menanyakan status langsung ke Hub (`GET /api/payment/qris/:reference_id`) dan mencocokkannya pada job rekonsiliasi `10.13`/`10.14`.
4. Tidak ada pembayaran yang boleh hilang tanpa jejak: setiap selisih menghasilkan item rekonsiliasi dan alert.

---

## Lampiran D — Changelog

### D.1 Perubahan 2.0 → 2.1 (Penyelarasan Logikraf)

**Konteks.** SmartHub ditetapkan sebagai **Client Store Logikraf** (prefix `sb-`); seluruh pembayaran lewat **Logikraf Payment Hub** dan SmartHub tidak memegang API key Xendit.

**Endpoint dihapus**

| Endpoint lama | Alasan |
|---|---|
| `POST /billing/sub-akun` (10.1 versi 2.0) | Sub-akun kini dibuat & dikelola Hub; SmartHub read-only |

**Endpoint diubah**

| 2.0 | 2.1 | Perubahan |
|---|---|---|
| `POST /billing/webhook/xendit` (10.16) | `POST /billing/webhook/logikraf` (10.15) | Arah webhook dikoreksi: dari Hub, bukan Xendit. Verifikasi `x-callback-token` → `X-Logikraf-Signature` (HMAC-SHA256 raw body) |
| `GET /billing/sub-akun` (10.2) | `GET /billing/sub-akun` (10.1) | Tetap read-only; status KYC diteruskan Hub (`INVITED`…`LIVE`…`REJECTED`) |
| `POST /billing/sub-akun/tautan-kyc` (10.3) | `POST /billing/sub-akun/tautan-kyc` (10.2) | SmartHub **meminta Hub** membuat tautan undangan KYC |
| `POST /billing/qris` (10.4) | `POST /billing/qris` (10.3) | QRIS dibuat via Hub `POST /api/client-store-qris`; respons `qr_string`/`expires_at`/`simulate_allowed` |
| Status QRIS `PENDING/SUCCEEDED` (10.5) | Status `PENDING/PAID/SETTLED/EXPIRED/FAILED` (10.4) | `PAID` dan `SETTLED` dua peristiwa berbeda; status tidak final sebelum webhook Hub |
| Pencairan `MENUNGGU/DIPROSES/BERHASIL/GAGAL` (10.9–10.11) | Settlement Hub `pending/processing/paid` + `unlock` (10.8–10.10) | Bukan disbursement Xendit; bukti transfer diunggah Hub |
| Refund (10.12–10.13) | Refund + fee reversal Hub (10.11–10.12) | `POST /api/client-store-fee-reverse` sebagai koreksi ledger Hub |
| Rekonsiliasi vs Xendit (10.14–10.15) | Rekonsiliasi vs Hub + fallback polling (10.13–10.14) | Hub otoritatif |
| Langganan QRIS/VA (9.22) | Langganan QRIS/VA **via Hub** (9.22) | `external_id` prefix `sb-`, respons Hub |

**Endpoint ditambah**

| # | Endpoint | Keterangan |
|---|---|---|
| 10.15 | `POST /billing/webhook/logikraf` | Webhook dari Hub (menggantikan `webhook/xendit`) |
| 10.16–10.20 | `/internal/finance/summary`, `/internal/settlements*` | **Internal Finance API** wajib; di luar JWT, `X-Logikraf-Internal-Key` |

**Perubahan perilaku**

1. SmartHub adalah **Client Store Logikraf** dengan prefix `external_id` `sb-`; **tidak ada** pembuatan sub-akun Xendit di SmartHub.
2. Batas QRIS **maks Rp10.000.000** dan wajib kedaluwarsa (≤48 jam) didokumentasikan eksplisit.
3. Status pembayaran **tidak final** sebelum webhook Hub; nominal dibaca dari database.
4. Fee: **DIPUTUSKAN 2026-09-24 — flat Rp2.500 per transaksi** (`maksimum(Rp2.500, 3%)`/Opsi A **tidak dipakai**); **MDR ±0,7% dan biaya transfer pencairan ditanggung Tenant (RT)** (lihat `10.21`).
5. Model dana **tetap non-kustodial**; sub-akun milik RT **dikelola Hub**.
6. Penomoran Bab 10 bergeser karena penghapusan `POST /billing/sub-akun`: nomor `10.3`–`10.15` masing-masing naik satu dari versi 2.0, dan Internal Finance API menempati `10.16`–`10.20`.

### D.2 Perubahan Versi 1.6 → 2.0

| Aspek | 1.6 | 2.0 |
|---|---|---|
| Cakupan | Fase 1, single-tenant | Fase 1 + lapisan SaaS multi-tenant |
| Bab | 1–8 | 1–8 (dipertahankan) + 9–11 (baru) |
| Lampiran | A, B | A, B, C, D, E |

### D.3 Endpoint Baru (TARGET) — 1.6 → 2.0

| Bab | Jumlah | Cakupan |
|---|---|---|
| 9 | 23 | Tenant & Langganan (`/tenant`, `/langganan`) — UC-24…UC-29, UC-38 |
| 10 | 16 | Billing Iuran & Pembayaran (`/billing`) termasuk webhook — UC-30…UC-35 |
| 11 | 10 | Konsol Platform (`/admin`) — UC-36, UC-37 |
| **Total baru** | **49** | Seluruhnya berstatus TARGET |

### D.4 Perubahan Perilaku (endpoint existing) — 1.6 → 2.0

1. **Isolasi tenant**: seluruh endpoint bab 1–8 kini ter-scope `id_tenant` dari JWT; tidak ada parameter/header tenant dari klien. Sumber daya lintas tenant → `404`.
2. **Payload JWT (TARGET)**: diperluas menjadi `{ id_pengguna, nik, role, id_tenant }`. Selama transisi, `id_tenant` diresolusi server-side dari akun.
3. **Koreksi path unggah**: `POST /api/v1/auth/upload` (1.6 menulis `/api/v1/upload`).
4. **Kanal pembayaran iuran**: transfer manual (5.7) tetap menjadi **baseline**; QRIS (10.4) tersedia sebagai kanal **opsional per tenant** bila integrasi Hub diaktifkan (PRD Bab 3.3 & 4.1).
5. **Reset password**: alur tautan salin-tempel (1.9/1.10) tetap ada; pengiriman email otomatis menjadi TARGET Fase 1 SaaS.
6. **Autentikasi platform**: dipisahkan ke `AkunPlatform`; peran platform tidak bercampur dengan peran RT.

### D.5 Deprecation (1.6 → 2.0)

- **Tidak ada endpoint yang dihapus** pada 2.0.
- Belum ada endpoint berstatus `Deprecated` per tanggal dokumen. Endpoint yang kelak digantikan akan mengikuti kebijakan pada bab Konvensi (penanda 90 hari, header `Deprecation`/`Sunset`).

### D.6 Catatan Verifikasi & Koreksi Angka (1.6 → 2.0)

- Dokumen 1.6 menyebut **84 endpoint**. Verifikasi ulang `apps/api/src/modules/**/*.routes.ts` pada **2026-09-22** menemukan **77 handler**: GET 29, POST 22, PUT/PATCH/DELETE 26. Selisih 7 berasal dari baris `router.use(authenticate)` yang ikut terhitung pada penghitungan lama, bukan endpoint.
- **Update 2026-09-23:** total kini **101 endpoint** setelah penambahan modul langganan (7), impor rumah/KK/warga (3), billing Hub + Internal Finance API (11), dan tenant (3). Angka **101** inilah yang dipakai sebagai fakta terkini di seluruh dokumen (PRD, Architecture, API Contract).
- ~~**Update 2026-09-23 (KYC):** onboarding sub-akun & KYC dipindah ke portal partner Logikraf (`https://partners.logikraf.id/`)...~~ **DIBATALKAN 2026-09-24:** KYC kembali ke SmartHub mode verify-on-behalf (lihat Update 2026-09-24 KYC & Payout, dan Update hardening di bawah). Status KYC/kanal kembali dikelola SmartHub.
- **Update 2026-09-23 (Superadmin):** modul **admin (19)** — `AkunPlatform` + `AuditLog` + konsol platform (`/api/v1/admin/*`) termasuk CRUD akun, kelola paket, alert, MFA TOTP, dan impersonasi 60 menit **read-only**. Auth platform terpisah (`scope: "platform"`), tidak bercampur dengan token tenant.
- **Update 2026-09-23 (Sesi & MFA tenant):** penambahan `/auth/refresh`, `/auth/logout-all`, dan `/auth/mfa/setup|activate|disable`; access token dipendekkan ke **15 menit** dengan `SesiRefreshToken` (rotasi + revocation).
- **Update 2026-09-23 (Notifikasi & retensi):** penambahan `GET/PATCH /notifikasi/preferensi`. Outbox notifikasi (`NotificationOutbox`), worker interval (`WORKERS_ENABLED`), adapter GoWA/BillionMail (mode dry), pengingat iuran H-7/H-1, masa tenggang langganan, dan `token-cleanup` tersedia di kode.
- **Update 2026-09-23 (Komersial & data):** penambahan `GET /audit-log` (1), `GET /ekspor/{kas,iuran,warga}` (3), `GET /kepatuhan/ekspor` + `/subjek/:nik` + `/anonymize` (3). Audit tenant otomatis untuk aksi tulis pengurus; kuota rumah paket ditegakkan + prorata saat ganti paket.
- **Update 2026-09-23 (QRIS & operasional):** penambahan `GET /admin/metrik` + `GET /admin/rekonsiliasi`; batas QRIS Rp10 juta divalidasi, UI bayar QRIS + pencairan, dan alert harian ke email admin platform.
- **Update 2026-09-24 (KYC & Payout):** total kini **145 endpoint** setelah penambahan modul **`kyc` (4)** — `GET /kyc`, `POST /kyc/initiate`, `POST /kyc/dokumen`, `POST /kyc/submit` — dan **billing (+5)** — `GET /billing/saldo`, `GET/POST/PATCH/DELETE /billing/rekening`. KYC mode **verify-on-behalf** (eksekusi di Hub, service agreement dibuat Hub); fee **flat Rp2.500**; webhook `account.verification` & `payout.*`. Mode uji: `LOGIKRAF_HUB_MOCK=true`.
- **Update 2026-09-24 (Hardening G-A…G-F):** klien Hub diberi **timeout (`AbortController`, `LOGIKRAF_HUB_TIMEOUT_MS`), retry terkendali (2× pada 5xx/timeout), `X-Correlation-Id`, header `X-Logikraf-Internal-Key`, prefix `sb-`**, dan kontrak dikunci `tests/hub-contract.test.ts`. Payout **idempoten** (`PencairanTenant.idempotency_key` = `sb-pencairan-<id>`, `DUPLICATE_ERROR → MENUNGGU`, status final tidak dimundurkan). QRIS **menolak `409` bila kanal belum aktif** (status kanal diekspos di `GET /kyc`). Observability: penghitung webhook/payout gagal 24 jam pada `GET /admin/alert` + email harian; rate limit khusus `kyc/*`; log Hub tanpa PII. Runbook pilot: `docs/pilot/runbook-kyc-payout.md`.
- Endpoint `GET /kependudukan/kk` (daftar KK) yang ada di kode kini **didokumentasikan** sebagai butir `3.3` (pada 1.6 belum berdiri sendiri).
- Path unggah dikoreksi menjadi `POST /api/v1/auth/upload` (1.6 menulis `/api/v1/upload`).

---

## Lampiran E — Status Implementasi

Kondisi per **2026-09-22**. Penanda mengikuti `PRD.md` Lampiran A.

### E.1 Endpoint Existing

| Modul | Prefix | Handler terverifikasi (kode) | Status |
|---|---|---|---|
| Autentikasi & Akun | `/api/v1/auth` | 12 | ✅ TERIMPLEMENTASI |
| Wilayah (Rumah) | `/api/v1/wilayah` | 4 | ✅ TERIMPLEMENTASI |
| Kependudukan | `/api/v1/kependudukan` | 13 | ✅ TERIMPLEMENTASI |
| Keamanan (Tamu) | `/api/v1/keamanan` | 5 | ✅ TERIMPLEMENTASI |
| Keuangan | `/api/v1/keuangan` | 13 | ✅ TERIMPLEMENTASI |
| Diskusi | `/api/v1/diskusi` | 10 | ✅ TERIMPLEMENTASI |
| Marketplace | `/api/v1/marketplace` | 16 | ✅ TERIMPLEMENTASI |
| Notifikasi | `/api/v1/notifikasi` | 4 | ✅ TERIMPLEMENTASI |
| **Total existing** | — | **77** | ✅ TERIMPLEMENTASI |

> **Catatan verifikasi.** Angka **77** adalah hasil penghitungan langsung atas `*.routes.ts` dan menjadi acuan tunggal di seluruh dokumen. Daftar endpoint pada bab 1–8 adalah daftar faktual yang harus dipertahankan.

### E.2 Endpoint Target (Fase SaaS)

| Bab | Modul | Prefix | Jumlah endpoint | Status |
|---|---|---|---|---|
| 9 | Tenant & Langganan | `/api/v1/tenant`, `/api/v1/langganan` | 23 | ⏳ TARGET (belum ada) |
| 10 | Billing Iuran & Pembayaran | `/api/v1/billing` | 15 | ⏳ TARGET (belum ada) |
| 10 | Internal Finance API (wajib, dipanggil Hub) | `/api/v1/internal` | 5 | ⏳ TARGET (belum ada) |
| 11 | Konsol Platform | `/api/v1/admin` | 10 | ⏳ TARGET (belum ada) |
| **Total target** | — | — | **53** | ⏳ TARGET (belum ada) |

> Angka 15 pada Bab 10 = endpoint billing `10.1`–`10.15` (satu endpoint pembuatan sub-akun dihapus pada 2.1). Internal Finance API (`10.16`–`10.20`) dihitung terpisah karena kontraknya milik Hub, bukan API publik produk.

### E.3 Ringkasan Model & Fitur Pendukung

| Area | Status saat ini | Target Fase SaaS |
|---|---|---|
| Multi-tenant | **Expand + contract selesai:** `Tenant` + `id_tenant` **NOT NULL** + FK RESTRICT di 14 tabel domain root, scoping otomatis + test isolasi; unique per-tenant untuk `Rumah`/`KategoriKeuangan`; **pembuatan tenant oleh Ketua_RT/Sekretaris** (`POST /tenant`, `AkunPengguna.nik` opsional). KYC di portal partner | Unique per-tenant `username`/`slug` kategori produk |
| Langganan & invoice | **Sebagian (manual, tanpa Hub):** model `PaketLangganan`, `LanggananTenant`, `InvoiceLangganan`, `PembayaranLangganan` + endpoint `GET/POST /api/v1/langganan/*` (paket, status, invoice, bayar bukti transfer, verifikasi → aktivasi) | Pengingat otomatis + masa tenggang; pembayaran via Hub |
| Pembayaran | **Sebagian (kode siap, kredensial belum):** model `AkunPembayaranTenant`, `PembayaranIuran`, `PencairanTenant` + endpoint `POST /billing/iuran/:id/qris`, `GET /billing/iuran/:id/pembayaran`, `GET/POST /billing/pencairan`, `POST /billing/webhook`. Bila `LOGIKRAF_HUB_*` kosong, endpoint mengembalikan 503 | Hub penuh: sub-akun (Account v3), VA, payout otomatis, job rekonsiliasi |
| Ledger & rekonsiliasi | **Sebagian:** `LedgerTransaksi` + `LedgerEntry` ditulis saat webhook PAID (jurnal seimbang), `WebhookEvent` idempoten | Job rekonsiliasi harian + pencocokan settlement |
| Impor data awal | **Ada:** `POST /wilayah/rumah/impor`, `/kependudukan/kk/impor`, `/kependudukan/warga/impor` (JSON atau teks CSV, laporan per baris) | Impor langsung XLSX + pratinjau di UI |
| Konsol admin | **Ada (API + UI `/platform`):** `AkunPlatform` + `AuditLog`; auth platform terpisah; **19 endpoint**: login, me, ringkasan, **alert**, tenant (list/detail/status), langganan, webhook-event, audit-log, akun platform (list/create/update), **paket (list/update)**, **MFA (setup/activate/disable)**, impersonate (**read-only 60 menit**). UI: dasbor tab + `/platform/paket` + `/platform/tenant/[id]` | `/platform/metrik`, `/platform/rekonsiliasi`, notifikasi alert |
| Refresh token & MFA | **Ada:** `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `POST /auth/mfa/setup|activate|disable`; access token 15 menit + `SesiRefreshToken` rotasi/revocation; MFA TOTP `AkunPengguna` | Worker `token-cleanup` |
| Kepatuhan data | **Ada:** `GET /kepatuhan/ekspor`, `GET /kepatuhan/subjek/:nik`, `POST /kepatuhan/subjek/:nik/anonymize`; ekspor CSV `GET /ekspor/{kas,iuran,warga}`; `GET /audit-log` (tenant) | Ekspor asinkron berkas besar, job retensi | UC-38 (`9.11`–`9.14`) |

### E.4 Cara Membaca Status

| Penanda | Arti |
|---|---|
| ✅ **TERIMPLEMENTASI** | Ada di kode dan dapat dipanggil hari ini |
| ⏳ **TARGET** | Kontrak direncanakan; **belum ada di kode** sampai Fase SaaS dikerjakan |

> Angka faktual (**145 endpoint**, 40 model, 19 migrasi, 90 test) menyatakan kondisi **saat ini**, bukan target. Target Fase SaaS ditandai terpisah.

---

*Akhir dokumen — API Contract SmartHub versi 2.1 (Selaras Platform Logikraf).*

