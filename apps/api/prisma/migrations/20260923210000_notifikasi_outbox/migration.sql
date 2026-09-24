-- Fase SaaS — Outbox notifikasi + preferensi kanal

-- CreateEnum
CREATE TYPE "KanalNotifikasi" AS ENUM ('InApp', 'WhatsApp', 'Email');

-- CreateEnum
CREATE TYPE "StatusOutbox" AS ENUM ('Menunggu', 'Terkirim', 'Gagal');

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id_outbox" SERIAL NOT NULL,
    "id_tenant" INTEGER NOT NULL,
    "id_penerima" INTEGER,
    "kanal" "KanalNotifikasi" NOT NULL,
    "tujuan" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "judul" TEXT,
    "pesan" TEXT NOT NULL,
    "status" "StatusOutbox" NOT NULL DEFAULT 'Menunggu',
    "percobaan" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "terjadwal_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terkirim_pada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id_outbox")
);

-- CreateTable
CREATE TABLE "PreferensiNotifikasi" (
    "id_preferensi" SERIAL NOT NULL,
    "id_pengguna" INTEGER NOT NULL,
    "whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "pengingat_iuran" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferensiNotifikasi_pkey" PRIMARY KEY ("id_preferensi")
);

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_terjadwal_pada_idx" ON "NotificationOutbox"("status", "terjadwal_pada");

-- CreateIndex
CREATE INDEX "NotificationOutbox_id_tenant_createdAt_idx" ON "NotificationOutbox"("id_tenant", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PreferensiNotifikasi_id_pengguna_key" ON "PreferensiNotifikasi"("id_pengguna");

-- AddForeignKey
ALTER TABLE "PreferensiNotifikasi" ADD CONSTRAINT "PreferensiNotifikasi_id_pengguna_fkey" FOREIGN KEY ("id_pengguna") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE CASCADE ON UPDATE CASCADE;

