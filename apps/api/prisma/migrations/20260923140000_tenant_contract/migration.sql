-- Fase SaaS — Multi-tenancy (contract)
-- id_tenant menjadi NOT NULL + FK RESTRICT, dan keunikan Rumah/KategoriKeuangan per-tenant.
-- Backfill idempoten dijalankan lebih dulu sebagai pengaman; jangan lewati langkah ini.

-- DropForeignKey (opsional -> required)
ALTER TABLE "AkunPengguna" DROP CONSTRAINT "AkunPengguna_id_tenant_fkey";
ALTER TABLE "IuranRumah" DROP CONSTRAINT "IuranRumah_id_tenant_fkey";
ALTER TABLE "KartuKeluarga" DROP CONSTRAINT "KartuKeluarga_id_tenant_fkey";
ALTER TABLE "KasUmum" DROP CONSTRAINT "KasUmum_id_tenant_fkey";
ALTER TABLE "KategoriKeuangan" DROP CONSTRAINT "KategoriKeuangan_id_tenant_fkey";
ALTER TABLE "KategoriProduk" DROP CONSTRAINT "KategoriProduk_id_tenant_fkey";
ALTER TABLE "LaporanProduk" DROP CONSTRAINT "LaporanProduk_id_tenant_fkey";
ALTER TABLE "MutasiWarga" DROP CONSTRAINT "MutasiWarga_id_tenant_fkey";
ALTER TABLE "Notifikasi" DROP CONSTRAINT "Notifikasi_id_tenant_fkey";
ALTER TABLE "Postingan" DROP CONSTRAINT "Postingan_id_tenant_fkey";
ALTER TABLE "Produk" DROP CONSTRAINT "Produk_id_tenant_fkey";
ALTER TABLE "Rumah" DROP CONSTRAINT "Rumah_id_tenant_fkey";
ALTER TABLE "TamuKunjungan" DROP CONSTRAINT "TamuKunjungan_id_tenant_fkey";
ALTER TABLE "Warga" DROP CONSTRAINT "Warga_id_tenant_fkey";

-- DropIndex (unique global -> unique per-tenant)
DROP INDEX "KategoriKeuangan_nama_kategori_jenis_key";
DROP INDEX "Rumah_nomor_rumah_blok_jalan_gang_key";

-- Backfill pengaman (idempoten): baris yang masih NULL -> tenant default
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

-- AlterTable -> NOT NULL
ALTER TABLE "AkunPengguna" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "IuranRumah" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "KartuKeluarga" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "KasUmum" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "KategoriKeuangan" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "KategoriProduk" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "LaporanProduk" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "MutasiWarga" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "Notifikasi" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "Postingan" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "Produk" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "Rumah" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "TamuKunjungan" ALTER COLUMN "id_tenant" SET NOT NULL;
ALTER TABLE "Warga" ALTER COLUMN "id_tenant" SET NOT NULL;

-- CreateIndex (unique per-tenant)
CREATE UNIQUE INDEX "KategoriKeuangan_id_tenant_nama_kategori_jenis_key" ON "KategoriKeuangan"("id_tenant", "nama_kategori", "jenis");
CREATE UNIQUE INDEX "Rumah_id_tenant_nomor_rumah_blok_jalan_gang_key" ON "Rumah"("id_tenant", "nomor_rumah", "blok", "jalan_gang");

-- AddForeignKey (required -> RESTRICT)
ALTER TABLE "Rumah" ADD CONSTRAINT "Rumah_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KartuKeluarga" ADD CONSTRAINT "KartuKeluarga_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AkunPengguna" ADD CONSTRAINT "AkunPengguna_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MutasiWarga" ADD CONSTRAINT "MutasiWarga_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TamuKunjungan" ADD CONSTRAINT "TamuKunjungan_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KategoriKeuangan" ADD CONSTRAINT "KategoriKeuangan_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IuranRumah" ADD CONSTRAINT "IuranRumah_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KasUmum" ADD CONSTRAINT "KasUmum_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Postingan" ADD CONSTRAINT "Postingan_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KategoriProduk" ADD CONSTRAINT "KategoriProduk_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaporanProduk" ADD CONSTRAINT "LaporanProduk_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
