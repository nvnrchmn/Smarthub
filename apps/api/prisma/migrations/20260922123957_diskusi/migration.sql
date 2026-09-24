-- CreateEnum
CREATE TYPE "StatusPostingan" AS ENUM ('Aktif', 'Disembunyikan', 'Dihapus');

-- CreateTable
CREATE TABLE "Postingan" (
    "id_postingan" SERIAL NOT NULL,
    "id_penulis" INTEGER NOT NULL,
    "id_induk" INTEGER,
    "isi" TEXT NOT NULL,
    "status" "StatusPostingan" NOT NULL DEFAULT 'Aktif',
    "jumlah_suka" INTEGER NOT NULL DEFAULT 0,
    "jumlah_balasan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postingan_pkey" PRIMARY KEY ("id_postingan")
);

-- CreateTable
CREATE TABLE "PostinganLampiran" (
    "id_lampiran" SERIAL NOT NULL,
    "id_postingan" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "tipe" TEXT NOT NULL DEFAULT 'image',

    CONSTRAINT "PostinganLampiran_pkey" PRIMARY KEY ("id_lampiran")
);

-- CreateTable
CREATE TABLE "ReaksiPostingan" (
    "id_reaksi" SERIAL NOT NULL,
    "id_postingan" INTEGER NOT NULL,
    "id_pengguna" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReaksiPostingan_pkey" PRIMARY KEY ("id_reaksi")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id_poll" SERIAL NOT NULL,
    "id_postingan" INTEGER NOT NULL,
    "berakhir_pada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id_poll")
);

-- CreateTable
CREATE TABLE "PollOpsi" (
    "id_opsi" SERIAL NOT NULL,
    "id_poll" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "jumlah_suara" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PollOpsi_pkey" PRIMARY KEY ("id_opsi")
);

-- CreateTable
CREATE TABLE "PollSuara" (
    "id_suara" SERIAL NOT NULL,
    "id_poll" INTEGER NOT NULL,
    "id_opsi" INTEGER NOT NULL,
    "id_pengguna" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollSuara_pkey" PRIMARY KEY ("id_suara")
);

-- CreateIndex
CREATE INDEX "Postingan_id_induk_createdAt_idx" ON "Postingan"("id_induk", "createdAt");

-- CreateIndex
CREATE INDEX "Postingan_status_createdAt_idx" ON "Postingan"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Postingan_id_penulis_idx" ON "Postingan"("id_penulis");

-- CreateIndex
CREATE INDEX "PostinganLampiran_id_postingan_idx" ON "PostinganLampiran"("id_postingan");

-- CreateIndex
CREATE INDEX "ReaksiPostingan_id_pengguna_idx" ON "ReaksiPostingan"("id_pengguna");

-- CreateIndex
CREATE UNIQUE INDEX "ReaksiPostingan_id_postingan_id_pengguna_key" ON "ReaksiPostingan"("id_postingan", "id_pengguna");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_id_postingan_key" ON "Poll"("id_postingan");

-- CreateIndex
CREATE UNIQUE INDEX "PollOpsi_id_poll_urutan_key" ON "PollOpsi"("id_poll", "urutan");

-- CreateIndex
CREATE INDEX "PollSuara_id_opsi_idx" ON "PollSuara"("id_opsi");

-- CreateIndex
CREATE UNIQUE INDEX "PollSuara_id_poll_id_pengguna_key" ON "PollSuara"("id_poll", "id_pengguna");

-- AddForeignKey
ALTER TABLE "Postingan" ADD CONSTRAINT "Postingan_id_penulis_fkey" FOREIGN KEY ("id_penulis") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postingan" ADD CONSTRAINT "Postingan_id_induk_fkey" FOREIGN KEY ("id_induk") REFERENCES "Postingan"("id_postingan") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostinganLampiran" ADD CONSTRAINT "PostinganLampiran_id_postingan_fkey" FOREIGN KEY ("id_postingan") REFERENCES "Postingan"("id_postingan") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaksiPostingan" ADD CONSTRAINT "ReaksiPostingan_id_postingan_fkey" FOREIGN KEY ("id_postingan") REFERENCES "Postingan"("id_postingan") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaksiPostingan" ADD CONSTRAINT "ReaksiPostingan_id_pengguna_fkey" FOREIGN KEY ("id_pengguna") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_id_postingan_fkey" FOREIGN KEY ("id_postingan") REFERENCES "Postingan"("id_postingan") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOpsi" ADD CONSTRAINT "PollOpsi_id_poll_fkey" FOREIGN KEY ("id_poll") REFERENCES "Poll"("id_poll") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollSuara" ADD CONSTRAINT "PollSuara_id_poll_fkey" FOREIGN KEY ("id_poll") REFERENCES "Poll"("id_poll") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollSuara" ADD CONSTRAINT "PollSuara_id_opsi_fkey" FOREIGN KEY ("id_opsi") REFERENCES "PollOpsi"("id_opsi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollSuara" ADD CONSTRAINT "PollSuara_id_pengguna_fkey" FOREIGN KEY ("id_pengguna") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE RESTRICT ON UPDATE CASCADE;
