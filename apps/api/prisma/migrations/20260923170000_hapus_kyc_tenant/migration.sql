-- KYC per tenant dipindah ke portal partner Logikraf (https://partners.logikraf.id/).
-- SmartHub tidak lagi menyimpan status/tautan KYC; hanya referensi xendit_account_id.

DROP INDEX "AkunPembayaranTenant_status_kyc_idx";

ALTER TABLE "AkunPembayaranTenant" DROP COLUMN "status_kyc";
ALTER TABLE "AkunPembayaranTenant" DROP COLUMN "tautan_kyc";
