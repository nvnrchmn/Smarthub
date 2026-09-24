-- Fase SaaS — AkunPengguna.nik menjadi opsional
-- Agar akun Ketua/Sekretaris pembuat tenant dapat dibuat tanpa data warga terlebih dahulu.

ALTER TABLE "AkunPengguna" DROP CONSTRAINT "AkunPengguna_nik_fkey";
ALTER TABLE "AkunPengguna" ALTER COLUMN "nik" DROP NOT NULL;
ALTER TABLE "AkunPengguna" ADD CONSTRAINT "AkunPengguna_nik_fkey" FOREIGN KEY ("nik") REFERENCES "Warga"("nik") ON DELETE SET NULL ON UPDATE CASCADE;
