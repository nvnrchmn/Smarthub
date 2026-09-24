-- Fase SaaS — Refresh token (sesi) + MFA akun pengguna

-- AlterTable
ALTER TABLE "AkunPengguna" ADD COLUMN     "mfa_aktif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_secret" TEXT;

-- CreateTable
CREATE TABLE "SesiRefreshToken" (
    "id_sesi" SERIAL NOT NULL,
    "id_pengguna" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "kedaluwarsa" TIMESTAMP(3) NOT NULL,
    "dicabut_pada" TIMESTAMP(3),
    "terakhir_dipakai" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SesiRefreshToken_pkey" PRIMARY KEY ("id_sesi")
);

-- CreateIndex
CREATE UNIQUE INDEX "SesiRefreshToken_token_hash_key" ON "SesiRefreshToken"("token_hash");

-- CreateIndex
CREATE INDEX "SesiRefreshToken_id_pengguna_dicabut_pada_idx" ON "SesiRefreshToken"("id_pengguna", "dicabut_pada");

-- CreateIndex
CREATE INDEX "SesiRefreshToken_kedaluwarsa_idx" ON "SesiRefreshToken"("kedaluwarsa");

-- AddForeignKey
ALTER TABLE "SesiRefreshToken" ADD CONSTRAINT "SesiRefreshToken_id_pengguna_fkey" FOREIGN KEY ("id_pengguna") REFERENCES "AkunPengguna"("id_pengguna") ON DELETE CASCADE ON UPDATE CASCADE;

