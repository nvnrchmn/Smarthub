-- CreateEnum
CREATE TYPE "StatusProduk" AS ENUM ('Aktif', 'Terjual', 'Disembunyikan', 'Dihapus');

-- CreateEnum
CREATE TYPE "KondisiProduk" AS ENUM ('Baru', 'Bekas');

-- CreateEnum
CREATE TYPE "AlasanLaporan" AS ENUM ('Penipuan', 'Barang_Terlarang', 'Spam', 'Lainnya');

-- CreateEnum
CREATE TYPE "StatusLaporan" AS ENUM ('Baru', 'Ditangani', 'Ditolak');

-- CreateTable
CREATE TABLE "KategoriProduk" (
    "id_kategori_produk" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KategoriProduk_pkey" PRIMARY KEY ("id_kategori_produk")
);

-- CreateTable
CREATE TABLE "Produk" (
    "id_produk" SERIAL NOT NULL,
    "id_penjual" INTEGER NOT NULL,
    "id_kategori_produk" INTEGER,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "harga" DECIMAL(12,2) NOT NULL,
    "kondisi" "KondisiProduk" NOT NULL,
    "satuan" TEXT NOT NULL DEFAULT 'pcs',
    "bisa_nego" BOOLEAN NOT NULL DEFAULT false,
    "tampilkan_kontak" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusProduk" NOT NULL DEFAULT 'Aktif',
    "jumlah_dilihat" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produk_pkey" PRIMARY KEY ("id_produk")
);

-- CreateTable
CREATE TABLE "ProdukFoto" (
    "id_foto" SERIAL NOT NULL,
    "id_produk" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProdukFoto_pkey" PRIMARY KEY ("id_foto")
);

-- CreateTable
CREATE TABLE "FavoritProduk" (
    "id_favorit" SERIAL NOT NULL,
    "id_produk" INTEGER NOT NULL,
    "id_pengguna" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoritProduk_pkey" PRIMARY KEY ("id_favorit")
);

-- CreateTable
CREATE TABLE "LaporanProduk" (
    "id_laporan" SERIAL NOT NULL,
    "id_produk" INTEGER NOT NULL,
    "id_pelapor" INTEGER NOT NULL,
    "alasan" "AlasanLaporan" NOT NULL,
    "keterangan" TEXT,
    "status" "StatusLaporan" NOT NULL DEFAULT 'Baru',
    "ditangani_oleh" INTEGER,
    "ditangani_pada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaporanProduk_pkey" PRIMARY KEY ("id_laporan")
);

-- CreateIndex
CREATE UNIQUE INDEX "KategoriProduk_slug_key" ON "KategoriProduk"("slug");

-- CreateIndex
CREATE INDEX "Produk_status_createdAt_idx" ON "Produk"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Produk_id_penjual_idx" ON "Produk"("id_penjual");

-- CreateIndex
CREATE INDEX "Produk_id_kategori_produk_idx" ON "Produk"("id_kategori_produk");

-- CreateIndex
CREATE INDEX "ProdukFoto_id_produk_idx" ON "ProdukFoto"("id_produk");

-- CreateIndex
CREATE INDEX "FavoritProduk_id_pengguna_idx" ON "FavoritProduk"("id_pengguna");

-- CreateIndex
CREATE UNIQUE INDEX "FavoritProduk_id_produk_id_pengguna_key" ON "FavoritProduk"("id_produk", "id_pengguna");

-- CreateIndex
CREATE INDEX "LaporanProduk_status_createdAt_idx" ON "LaporanProduk"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LaporanProduk_id_produk_idx" ON "LaporanProduk"("id_produk");

-- AddForeignKey
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_id_penjual_fkey" FOREIGN KEY ("id_penjual") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_id_kategori_produk_fkey" FOREIGN KEY ("id_kategori_produk") REFERENCES "KategoriProduk"("id_kategori_produk") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdukFoto" ADD CONSTRAINT "ProdukFoto_id_produk_fkey" FOREIGN KEY ("id_produk") REFERENCES "Produk"("id_produk") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritProduk" ADD CONSTRAINT "FavoritProduk_id_produk_fkey" FOREIGN KEY ("id_produk") REFERENCES "Produk"("id_produk") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritProduk" ADD CONSTRAINT "FavoritProduk_id_pengguna_fkey" FOREIGN KEY ("id_pengguna") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanProduk" ADD CONSTRAINT "LaporanProduk_id_produk_fkey" FOREIGN KEY ("id_produk") REFERENCES "Produk"("id_produk") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanProduk" ADD CONSTRAINT "LaporanProduk_id_pelapor_fkey" FOREIGN KEY ("id_pelapor") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaporanProduk" ADD CONSTRAINT "LaporanProduk_ditangani_oleh_fkey" FOREIGN KEY ("ditangani_oleh") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE SET NULL ON UPDATE CASCADE;
