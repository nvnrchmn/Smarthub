# SmartHub — Sistem Manajemen Warga Digital

Monorepo full-stack TypeScript untuk manajemen RT/Perumahan: kependudukan (Rumah, Kartu Keluarga, Warga, Mutasi), log keamanan tamu, dan transparansi keuangan kas RT dengan RBAC 5 role.

| Bagian | Teknologi |
|---|---|
| `apps/api` | Node.js 22, Express 5, Prisma, PostgreSQL, Zod, JWT, bcrypt, pino |
| `apps/web` | Next.js 15 (App Router), React 19, TailwindCSS, ShadcnUI, TanStack Query, react-hook-form |
| `packages/shared` | Enum domain, skema Zod, tipe DTO, helper format (dipakai bersama) |

Dokumentasi produk ada di `docs/`: `PRD.md` (v2.3), `Architecture.md` (v2.3), `API-Contract.md` (v2.1), dan `UI-UX-Design.md` (v1.1). Kit validasi pilot ada di `docs/pilot/`: `rencana-validasi-harga.md` dan `hasil-pilot.md`.

Dokumentasi platform ada di `docs/logikraf/`: `payment-hub-integration-guide.md` dan `notifications-architecture.md`. Keduanya adalah **salinan lokal** dari dokumen tim Logikraf; sumber kebenaran tetap di tim platform.

> **Hubungan platform.** SmartHub adalah produk SaaS milik **PT Logika Kreatif Indonesia (logikraf.id)**. Pembayaran berjalan lewat **Logikraf Payment Hub** (SmartHub terdaftar sebagai *client store* berprefix `sb-` dan **tidak** memegang API key Xendit), sedangkan notifikasi WhatsApp/email memakai layanan bersama **GoWA** dan **BillionMail**.

## Prasyarat

- Node.js 22 LTS (`node -v`)
- pnpm 9+ (`corepack enable` lalu `pnpm -v`)
- PostgreSQL 16+ (teruji pada PostgreSQL 18)

## Setup

```bash
# 1. Install dependency seluruh workspace
pnpm install

# 2. Siapkan environment
cp .env.example .env
#    Sesuaikan DATABASE_URL. Buat database terlebih dahulu:
#    createdb smarthub_dev
#    createdb smarthub_test

# 3. Generate Prisma Client & jalankan migrasi
pnpm prisma:generate
pnpm --filter @smarthub/api prisma:migrate -- --name init

# 4. Isi data demo
pnpm db:seed

# 5. Jalankan API (http://localhost:4000) dan Web (http://localhost:3000)
pnpm dev
```

Jalankan hanya salah satu:

```bash
pnpm --filter @smarthub/api dev
pnpm --filter @smarthub/web dev
```

## Akun demo (hasil `pnpm db:seed`)

Password semua akun: `Password123`. Login dapat memakai **email**, **nomor HP** (format `08xxx`, `628xxx`, atau `+628xxx`), atau **username**.

| Email | Nomor HP | Username | Role |
|---|---|---|---|
| `ketuart@smarthub.local` | `081200000001` | `hendra_wijaya` | Ketua_RT |
| `sekretaris@smarthub.local` | `081200000002` | `siti_aminah` | Sekretaris |
| `bendahara@smarthub.local` | `081200000003` | `dewi_kartika` | Bendahara |
| `keamanan@smarthub.local` | `081200000004` | `joko_susilo` | Keamanan |
| `warga@smarthub.local` | `081200000005` | `budi_santoso` | Warga |

Username dipakai untuk sebut di Diskusi (contoh: `@hendra_wijaya`). Menyebut warga akan mengirim notifikasi ke yang disebut.

## Perintah penting

| Perintah | Kegunaan |
|---|---|
| `pnpm dev` | Jalankan API + Web secara paralel |
| `pnpm build` | Build seluruh workspace |
| `pnpm lint` | ESLint seluruh workspace |
| `pnpm typecheck` | TypeScript `--noEmit` seluruh workspace |
| `pnpm test` | Vitest (shared + api + web) |
| `pnpm prisma:generate` | Regenerasi Prisma Client |
| `pnpm prisma:migrate` | Buat/terapkan migrasi baru saat development |
| `pnpm --filter @smarthub/api prisma:deploy` | Terapkan migrasi (production/CI) |
| `pnpm db:seed` | Isi ulang data demo (**menghapus seluruh data existing**) |

## Arsitektur singkat

- **API**: modular monolith, setiap modul (`auth`, `wilayah`, `kependudukan`, `keamanan`, `keuangan`, `diskusi`, `marketplace`, `notifikasi`) berlapis `routes → controller → service → repository`. Hanya layer repository yang menyentuh Prisma. Akses data lintas modul lewat fungsi publik service (mis. `wilayahService.assertRumahExists`), bukan query lintas tabel.
- **Web**: semua request data melewati BFF di `apps/web/src/app/api/bff/[...path]/route.ts`. JWT disimpan pada cookie httpOnly lalu diteruskan ke API sebagai header `Authorization: Bearer`. Klien tidak pernah melihat token.
- **RBAC**: matriks di `docs/PRD.md` adalah sumber kebenaran; proteksi ditegakkan di API oleh `rbac.middleware.ts` dan dicerminkan di UI dengan menyembunyikan aksi yang tidak diizinkan.

## Menjalankan dengan Docker

```bash
docker compose up --build
```

Service: `postgres` (5432), `api` (4000), `web` (3000).

## Troubleshooting

- **`Konfigurasi environment tidak valid`** — `.env` belum ada atau `JWT_SECRET` kurang dari 32 karakter.
- **`Can't reach database server`** — pastikan PostgreSQL berjalan dan `DATABASE_URL` benar.
- **`@prisma/client did not initialize yet`** — jalankan `pnpm prisma:generate`.
- **Login gagal padahal akun ada** — pastikan sudah `pnpm db:seed`; kalau akun dinonaktifkan API mengembalikan 403 dengan pesan akun nonaktif.
- **`Tidak dapat menghubungi server API SmartHub`** — API belum jalan, atau `API_BASE_URL` pada `apps/web` salah.
- **Prisma bermasalah dengan PostgreSQL 18** — pakai Prisma 6.x terbaru; bila driver bermasalah, jalankan `postgres:16` via Docker tanpa mengubah kode.

## Catatan lanjutan (di luar Fase 1)

Refresh token, forgot password, registrasi publik, multi-tenant, notifikasi WhatsApp/email, ekspor laporan PDF/Excel, dan upgrade `multer` ke 2.x.
