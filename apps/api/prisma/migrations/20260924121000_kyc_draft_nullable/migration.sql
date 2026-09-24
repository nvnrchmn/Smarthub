-- KycSubmission: kolom consent boleh kosong saat status DRAFT

ALTER TABLE "KycSubmission" ALTER COLUMN "consent_at" DROP NOT NULL;
ALTER TABLE "KycSubmission" ALTER COLUMN "consent_version" DROP NOT NULL;
ALTER TABLE "KycSubmission" ALTER COLUMN "nama_penandatangan" DROP NOT NULL;
