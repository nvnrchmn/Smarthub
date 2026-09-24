-- Fase KYC & Payout — akun pembayaran (KYC mirror), rekening bank, submission KYC, perluasan pencairan

-- DropIndex
DROP INDEX "AkunPembayaranTenant_xendit_account_id_key";

-- AlterTable
ALTER TABLE "AkunPembayaranTenant" DROP COLUMN "nama_bank",
DROP COLUMN "nama_pemilik",
DROP COLUMN "nomor_rekening",
DROP COLUMN "xendit_account_id",
ADD COLUMN     "entity_type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "failure_reasons" JSONB,
ADD COLUMN     "kyc_submitted_at" TIMESTAMP(3),
ADD COLUMN     "kyc_verified_at" TIMESTAMP(3),
ADD COLUMN     "money_out_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payment_channels" JSONB,
ADD COLUMN     "penyedia_account_id" TEXT NOT NULL,
ADD COLUMN     "status_kyc" TEXT NOT NULL DEFAULT 'BELUM';

-- AlterTable
ALTER TABLE "PencairanTenant" ADD COLUMN     "failure_code" TEXT,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "id_rekening" INTEGER,
ADD COLUMN     "metode" TEXT NOT NULL DEFAULT 'Payout';

-- CreateTable
CREATE TABLE "RekeningBankTenant" (
    "id_rekening" SERIAL NOT NULL,
    "id_tenant" INTEGER NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status_verifikasi" TEXT NOT NULL DEFAULT 'Belum_Diverifikasi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RekeningBankTenant_pkey" PRIMARY KEY ("id_rekening")
);

-- CreateTable
CREATE TABLE "KycSubmission" (
    "id_kyc" SERIAL NOT NULL,
    "id_tenant" INTEGER NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "legal_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ktp_number_hash" TEXT,
    "ktp_number_masked" TEXT,
    "tanggal_lahir" DATE,
    "jenis_kelamin" TEXT,
    "kewarganegaraan" TEXT,
    "alamat" JSONB,
    "data_usaha" JSONB,
    "file_ids" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "failure_reasons" JSONB,
    "consent_at" TIMESTAMP(3) NOT NULL,
    "consent_ip" TEXT,
    "consent_user_agent" TEXT,
    "consent_version" TEXT NOT NULL,
    "nama_penandatangan" TEXT NOT NULL,
    "service_agreement_file_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycSubmission_pkey" PRIMARY KEY ("id_kyc")
);

-- CreateIndex
CREATE INDEX "RekeningBankTenant_id_tenant_idx" ON "RekeningBankTenant"("id_tenant");

-- CreateIndex
CREATE UNIQUE INDEX "RekeningBankTenant_id_tenant_bank_code_account_number_key" ON "RekeningBankTenant"("id_tenant", "bank_code", "account_number");

-- CreateIndex
CREATE INDEX "KycSubmission_id_tenant_status_idx" ON "KycSubmission"("id_tenant", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AkunPembayaranTenant_penyedia_account_id_key" ON "AkunPembayaranTenant"("penyedia_account_id");

-- AddForeignKey
ALTER TABLE "RekeningBankTenant" ADD CONSTRAINT "RekeningBankTenant_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;

