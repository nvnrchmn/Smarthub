-- CreateEnum
CREATE TYPE "TipeNotifikasi" AS ENUM ('Mention', 'Balasan');

-- AlterTable
ALTER TABLE "AkunPengguna" ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "PostinganMention" (
    "id_mention" SERIAL NOT NULL,
    "id_postingan" INTEGER NOT NULL,
    "id_pengguna" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostinganMention_pkey" PRIMARY KEY ("id_mention")
);

-- CreateTable
CREATE TABLE "Notifikasi" (
    "id_notifikasi" SERIAL NOT NULL,
    "id_penerima" INTEGER NOT NULL,
    "tipe" "TipeNotifikasi" NOT NULL,
    "id_referensi" INTEGER,
    "pesan" TEXT NOT NULL,
    "dibaca_pada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifikasi_pkey" PRIMARY KEY ("id_notifikasi")
);

-- CreateIndex
CREATE INDEX "PostinganMention_id_pengguna_idx" ON "PostinganMention"("id_pengguna");

-- CreateIndex
CREATE UNIQUE INDEX "PostinganMention_id_postingan_id_pengguna_key" ON "PostinganMention"("id_postingan", "id_pengguna");

-- CreateIndex
CREATE INDEX "Notifikasi_id_penerima_dibaca_pada_idx" ON "Notifikasi"("id_penerima", "dibaca_pada");

-- CreateIndex
CREATE INDEX "Notifikasi_id_penerima_createdAt_idx" ON "Notifikasi"("id_penerima", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AkunPengguna_username_key" ON "AkunPengguna"("username");

-- AddForeignKey
ALTER TABLE "PostinganMention" ADD CONSTRAINT "PostinganMention_id_postingan_fkey" FOREIGN KEY ("id_postingan") REFERENCES "Postingan"("id_postingan") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostinganMention" ADD CONSTRAINT "PostinganMention_id_pengguna_fkey" FOREIGN KEY ("id_pengguna") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_id_penerima_fkey" FOREIGN KEY ("id_penerima") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE RESTRICT ON UPDATE CASCADE;
