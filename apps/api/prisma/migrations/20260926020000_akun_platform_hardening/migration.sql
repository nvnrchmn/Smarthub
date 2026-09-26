-- AlterTable
ALTER TABLE "AkunPlatform" ADD COLUMN     "gagal_login" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "terkunci_sampai" TIMESTAMP(3),
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;
