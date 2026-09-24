-- AlterTable
ALTER TABLE "PencairanTenant" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PencairanTenant_idempotency_key_key" ON "PencairanTenant"("idempotency_key");
