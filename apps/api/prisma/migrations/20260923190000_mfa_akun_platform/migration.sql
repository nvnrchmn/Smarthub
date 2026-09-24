-- Fase SaaS — MFA akun platform (TOTP)

ALTER TABLE "AkunPlatform" ADD COLUMN "mfa_secret" TEXT;
ALTER TABLE "AkunPlatform" ADD COLUMN "mfa_aktif" BOOLEAN NOT NULL DEFAULT false;
