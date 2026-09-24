-- Fase SaaS — Multi-tenancy (expand)
-- Tahap 1: tambah model Tenant + kolom id_tenant nullable, lalu backfill ke tenant default.
-- Kolom sengaja tetap NULLABLE pada tahap ini; NOT NULL + unique per-tenant menyusul
-- setelah verifikasi (contract). Lihat docs/Architecture.md Bab 3.5.

-- CreateEnum
CREATE TYPE "StatusTenant" AS ENUM ('Menunggu_Verifikasi', 'Terverifikasi', 'Aktif', 'Ditangguhkan', 'Dibatalkan');

-- CreateTable
CREATE TABLE "Tenant" (
    "id_tenant" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kabupaten" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "jumlah_rumah" INTEGER,
    "kontak_email" TEXT NOT NULL,
    "kontak_hp" TEXT,
    "status" "StatusTenant" NOT NULL DEFAULT 'Menunggu_Verifikasi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id_tenant")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- Seed tenant default agar data lama dapat di-backfill (idempoten via WHERE NOT EXISTS)
INSERT INTO "Tenant" ("nama", "slug", "provinsi", "kabupaten", "kecamatan", "kontak_email", "status", "updatedAt")
SELECT 'RT Default', 'rt-default', '-', '-', '-', 'admin@smarthub.local', 'Aktif', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" WHERE "slug" = 'rt-default');

-- AlterTable (expand): tambah kolom nullable
ALTER TABLE "AkunPengguna" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "IuranRumah" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "KartuKeluarga" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "KasUmum" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "KategoriKeuangan" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "KategoriProduk" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "LaporanProduk" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "MutasiWarga" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "Notifikasi" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "Postingan" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "Produk" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "Rumah" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "TamuKunjungan" ADD COLUMN     "id_tenant" INTEGER;
ALTER TABLE "Warga" ADD COLUMN     "id_tenant" INTEGER;

-- Backfill: seluruh baris lama -> tenant default
UPDATE "AkunPengguna" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "IuranRumah" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "KartuKeluarga" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "KasUmum" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "KategoriKeuangan" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "KategoriProduk" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "LaporanProduk" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "MutasiWarga" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "Notifikasi" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "Postingan" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "Produk" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "Rumah" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "TamuKunjungan" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;
UPDATE "Warga" SET "id_tenant" = (SELECT "id_tenant" FROM "Tenant" WHERE "slug" = 'rt-default') WHERE "id_tenant" IS NULL;

-- CreateIndex
CREATE INDEX "AkunPengguna_id_tenant_idx" ON "AkunPengguna"("id_tenant");
CREATE INDEX "IuranRumah_id_tenant_idx" ON "IuranRumah"("id_tenant");
CREATE INDEX "KartuKeluarga_id_tenant_idx" ON "KartuKeluarga"("id_tenant");
CREATE INDEX "KasUmum_id_tenant_idx" ON "KasUmum"("id_tenant");
CREATE INDEX "KategoriKeuangan_id_tenant_idx" ON "KategoriKeuangan"("id_tenant");
CREATE INDEX "KategoriProduk_id_tenant_idx" ON "KategoriProduk"("id_tenant");
CREATE INDEX "LaporanProduk_id_tenant_idx" ON "LaporanProduk"("id_tenant");
CREATE INDEX "MutasiWarga_id_tenant_idx" ON "MutasiWarga"("id_tenant");
CREATE INDEX "Notifikasi_id_tenant_idx" ON "Notifikasi"("id_tenant");
CREATE INDEX "Postingan_id_tenant_idx" ON "Postingan"("id_tenant");
CREATE INDEX "Produk_id_tenant_idx" ON "Produk"("id_tenant");
CREATE INDEX "Rumah_id_tenant_idx" ON "Rumah"("id_tenant");
CREATE INDEX "TamuKunjungan_id_tenant_idx" ON "TamuKunjungan"("id_tenant");
CREATE INDEX "Warga_id_tenant_idx" ON "Warga"("id_tenant");

-- AddForeignKey
ALTER TABLE "Rumah" ADD CONSTRAINT "Rumah_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KartuKeluarga" ADD CONSTRAINT "KartuKeluarga_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AkunPengguna" ADD CONSTRAINT "AkunPengguna_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MutasiWarga" ADD CONSTRAINT "MutasiWarga_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TamuKunjungan" ADD CONSTRAINT "TamuKunjungan_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KategoriKeuangan" ADD CONSTRAINT "KategoriKeuangan_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IuranRumah" ADD CONSTRAINT "IuranRumah_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KasUmum" ADD CONSTRAINT "KasUmum_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Postingan" ADD CONSTRAINT "Postingan_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KategoriProduk" ADD CONSTRAINT "KategoriProduk_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LaporanProduk" ADD CONSTRAINT "LaporanProduk_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
