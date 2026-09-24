-- CreateEnum
CREATE TYPE "StatusMilik" AS ENUM ('Milik_Sendiri', 'Sewa_Kontrak', 'Kosong');

-- CreateEnum
CREATE TYPE "StatusHunian" AS ENUM ('Dihuni', 'Tidak_Dihuni');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('Laki_Laki', 'Perempuan');

-- CreateEnum
CREATE TYPE "HubunganKeluarga" AS ENUM ('Kepala_Keluarga', 'Istri', 'Anak', 'Orang_Tua', 'Mertua', 'Famili_Lain');

-- CreateEnum
CREATE TYPE "StatusTinggal" AS ENUM ('Tetap', 'Kontrak_Sewa', 'Sementara');

-- CreateEnum
CREATE TYPE "StatusAktif" AS ENUM ('Aktif', 'Meninggal', 'Pindah_Keluar');

-- CreateEnum
CREATE TYPE "RolePengguna" AS ENUM ('Ketua_RT', 'Sekretaris', 'Bendahara', 'Keamanan', 'Warga');

-- CreateEnum
CREATE TYPE "StatusAkun" AS ENUM ('Aktif', 'Nonaktif');

-- CreateEnum
CREATE TYPE "JenisKas" AS ENUM ('Pemasukan', 'Pengeluaran');

-- CreateEnum
CREATE TYPE "StatusBayar" AS ENUM ('Belum_Bayar', 'Menunggu_Konfirmasi', 'Lunas');

-- CreateEnum
CREATE TYPE "JenisMutasi" AS ENUM ('Lahir', 'Datang', 'Meninggal', 'Pindah_Keluar');

-- CreateEnum
CREATE TYPE "StatusVerifikasi" AS ENUM ('Menunggu_Verifikasi', 'Terverifikasi', 'Ditolak');

-- CreateTable
CREATE TABLE "Rumah" (
    "id_rumah" SERIAL NOT NULL,
    "nomor_rumah" TEXT NOT NULL,
    "blok" TEXT NOT NULL,
    "jalan_gang" TEXT NOT NULL,
    "status_kepemilikan" "StatusMilik" NOT NULL,
    "status_hunian" "StatusHunian" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rumah_pkey" PRIMARY KEY ("id_rumah")
);

-- CreateTable
CREATE TABLE "KartuKeluarga" (
    "no_kk" VARCHAR(16) NOT NULL,
    "id_rumah" INTEGER NOT NULL,
    "tgl_dikeluarkan" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KartuKeluarga_pkey" PRIMARY KEY ("no_kk")
);

-- CreateTable
CREATE TABLE "Warga" (
    "nik" VARCHAR(16) NOT NULL,
    "no_kk" VARCHAR(16) NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "tempat_lahir" TEXT NOT NULL,
    "tanggal_lahir" DATE NOT NULL,
    "jenis_kelamin" "JenisKelamin" NOT NULL,
    "agama" TEXT NOT NULL,
    "status_perkawinan" TEXT NOT NULL,
    "pekerjaan" TEXT NOT NULL,
    "no_hp" TEXT,
    "status_hubungan_keluarga" "HubunganKeluarga" NOT NULL,
    "status_tinggal" "StatusTinggal" NOT NULL,
    "status_aktif" "StatusAktif" NOT NULL DEFAULT 'Aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warga_pkey" PRIMARY KEY ("nik")
);

-- CreateTable
CREATE TABLE "AkunPengguna" (
    "id_pengguna" SERIAL NOT NULL,
    "nik" VARCHAR(16) NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "RolePengguna" NOT NULL DEFAULT 'Warga',
    "status_akun" "StatusAkun" NOT NULL DEFAULT 'Aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AkunPengguna_pkey" PRIMARY KEY ("id_pengguna")
);

-- CreateTable
CREATE TABLE "MutasiWarga" (
    "id_mutasi" SERIAL NOT NULL,
    "nik" VARCHAR(16) NOT NULL,
    "jenis_mutasi" "JenisMutasi" NOT NULL,
    "tanggal_peristiwa" DATE NOT NULL,
    "tanggal_lapor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keterangan" TEXT NOT NULL,
    "berkas_pendukung" TEXT,
    "status_verifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'Menunggu_Verifikasi',
    "diverifikasi_oleh" INTEGER,
    "diverifikasi_pada" TIMESTAMP(3),

    CONSTRAINT "MutasiWarga_pkey" PRIMARY KEY ("id_mutasi")
);

-- CreateTable
CREATE TABLE "TamuKunjungan" (
    "id_tamu" SERIAL NOT NULL,
    "id_rumah_tujuan" INTEGER NOT NULL,
    "nama_tamu" TEXT NOT NULL,
    "jumlah_tamu" INTEGER NOT NULL,
    "tgl_datang" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tgl_pergi" TIMESTAMP(3),
    "keperluan" TEXT NOT NULL,

    CONSTRAINT "TamuKunjungan_pkey" PRIMARY KEY ("id_tamu")
);

-- CreateTable
CREATE TABLE "KategoriKeuangan" (
    "id_kategori" SERIAL NOT NULL,
    "nama_kategori" TEXT NOT NULL,
    "jenis" "JenisKas" NOT NULL,

    CONSTRAINT "KategoriKeuangan_pkey" PRIMARY KEY ("id_kategori")
);

-- CreateTable
CREATE TABLE "IuranRumah" (
    "id_iuran" SERIAL NOT NULL,
    "id_rumah" INTEGER NOT NULL,
    "id_kategori" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jumlah_tagihan" DECIMAL(12,2) NOT NULL,
    "status_bayar" "StatusBayar" NOT NULL DEFAULT 'Belum_Bayar',
    "tgl_bayar" TIMESTAMP(3),
    "bukti_transfer" TEXT,
    "diverifikasi_oleh" INTEGER,
    "diverifikasi_pada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IuranRumah_pkey" PRIMARY KEY ("id_iuran")
);

-- CreateTable
CREATE TABLE "KasUmum" (
    "id_transaksi" SERIAL NOT NULL,
    "id_kategori" INTEGER NOT NULL,
    "id_pengurus" INTEGER NOT NULL,
    "tanggal" DATE NOT NULL,
    "jumlah" DECIMAL(12,2) NOT NULL,
    "keterangan" TEXT NOT NULL,
    "status_verifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'Menunggu_Verifikasi',
    "diverifikasi_oleh" INTEGER,
    "diverifikasi_pada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KasUmum_pkey" PRIMARY KEY ("id_transaksi")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rumah_nomor_rumah_blok_jalan_gang_key" ON "Rumah"("nomor_rumah", "blok", "jalan_gang");

-- CreateIndex
CREATE INDEX "KartuKeluarga_id_rumah_idx" ON "KartuKeluarga"("id_rumah");

-- CreateIndex
CREATE INDEX "Warga_no_kk_idx" ON "Warga"("no_kk");

-- CreateIndex
CREATE INDEX "Warga_status_aktif_idx" ON "Warga"("status_aktif");

-- CreateIndex
CREATE UNIQUE INDEX "AkunPengguna_nik_key" ON "AkunPengguna"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "AkunPengguna_email_key" ON "AkunPengguna"("email");

-- CreateIndex
CREATE INDEX "MutasiWarga_nik_idx" ON "MutasiWarga"("nik");

-- CreateIndex
CREATE INDEX "MutasiWarga_status_verifikasi_idx" ON "MutasiWarga"("status_verifikasi");

-- CreateIndex
CREATE INDEX "TamuKunjungan_tgl_pergi_idx" ON "TamuKunjungan"("tgl_pergi");

-- CreateIndex
CREATE INDEX "TamuKunjungan_id_rumah_tujuan_idx" ON "TamuKunjungan"("id_rumah_tujuan");

-- CreateIndex
CREATE UNIQUE INDEX "KategoriKeuangan_nama_kategori_jenis_key" ON "KategoriKeuangan"("nama_kategori", "jenis");

-- CreateIndex
CREATE INDEX "IuranRumah_status_bayar_bulan_tahun_idx" ON "IuranRumah"("status_bayar", "bulan", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "IuranRumah_id_rumah_id_kategori_bulan_tahun_key" ON "IuranRumah"("id_rumah", "id_kategori", "bulan", "tahun");

-- CreateIndex
CREATE INDEX "KasUmum_tanggal_idx" ON "KasUmum"("tanggal");

-- CreateIndex
CREATE INDEX "KasUmum_status_verifikasi_idx" ON "KasUmum"("status_verifikasi");

-- AddForeignKey
ALTER TABLE "KartuKeluarga" ADD CONSTRAINT "KartuKeluarga_id_rumah_fkey" FOREIGN KEY ("id_rumah") REFERENCES "Rumah"("id_rumah") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_no_kk_fkey" FOREIGN KEY ("no_kk") REFERENCES "KartuKeluarga"("no_kk") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AkunPengguna" ADD CONSTRAINT "AkunPengguna_nik_fkey" FOREIGN KEY ("nik") REFERENCES "Warga"("nik") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutasiWarga" ADD CONSTRAINT "MutasiWarga_nik_fkey" FOREIGN KEY ("nik") REFERENCES "Warga"("nik") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutasiWarga" ADD CONSTRAINT "MutasiWarga_diverifikasi_oleh_fkey" FOREIGN KEY ("diverifikasi_oleh") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TamuKunjungan" ADD CONSTRAINT "TamuKunjungan_id_rumah_tujuan_fkey" FOREIGN KEY ("id_rumah_tujuan") REFERENCES "Rumah"("id_rumah") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IuranRumah" ADD CONSTRAINT "IuranRumah_id_rumah_fkey" FOREIGN KEY ("id_rumah") REFERENCES "Rumah"("id_rumah") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IuranRumah" ADD CONSTRAINT "IuranRumah_id_kategori_fkey" FOREIGN KEY ("id_kategori") REFERENCES "KategoriKeuangan"("id_kategori") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IuranRumah" ADD CONSTRAINT "IuranRumah_diverifikasi_oleh_fkey" FOREIGN KEY ("diverifikasi_oleh") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasUmum" ADD CONSTRAINT "KasUmum_id_kategori_fkey" FOREIGN KEY ("id_kategori") REFERENCES "KategoriKeuangan"("id_kategori") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasUmum" ADD CONSTRAINT "KasUmum_id_pengurus_fkey" FOREIGN KEY ("id_pengurus") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasUmum" ADD CONSTRAINT "KasUmum_diverifikasi_oleh_fkey" FOREIGN KEY ("diverifikasi_oleh") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE SET NULL ON UPDATE CASCADE;
