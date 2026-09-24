-- CreateTable
CREATE TABLE "AkunPembayaranTenant" (
    "id_akun_pembayaran" SERIAL NOT NULL,
    "id_tenant" INTEGER NOT NULL,
    "xendit_account_id" TEXT NOT NULL,
    "tipe" TEXT NOT NULL DEFAULT 'MANAGED',
    "status_kyc" TEXT NOT NULL DEFAULT 'INVITED',
    "tautan_kyc" TEXT,
    "nama_bank" TEXT,
    "nomor_rekening" TEXT,
    "nama_pemilik" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AkunPembayaranTenant_pkey" PRIMARY KEY ("id_akun_pembayaran")
);

-- CreateTable
CREATE TABLE "PembayaranIuran" (
    "id_pembayaran_iuran" SERIAL NOT NULL,
    "id_tenant" INTEGER NOT NULL,
    "id_iuran" INTEGER NOT NULL,
    "referensi_bayar" TEXT NOT NULL,
    "qr_string" TEXT NOT NULL,
    "jumlah" DECIMAL(12,2) NOT NULL,
    "kedaluwarsa_pada" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "mdr" DECIMAL(12,2),
    "biaya_hub" DECIMAL(12,2),
    "fee_platform" DECIMAL(12,2),
    "net_ke_rt" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PembayaranIuran_pkey" PRIMARY KEY ("id_pembayaran_iuran")
);

-- CreateTable
CREATE TABLE "LedgerTransaksi" (
    "id_ledger" SERIAL NOT NULL,
    "id_tenant" INTEGER,
    "tipe" TEXT NOT NULL,
    "id_referensi" INTEGER NOT NULL,
    "keterangan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaksi_pkey" PRIMARY KEY ("id_ledger")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id_entry" SERIAL NOT NULL,
    "id_ledger" INTEGER NOT NULL,
    "akun" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "kredit" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id_entry")
);

-- CreateTable
CREATE TABLE "PencairanTenant" (
    "id_pencairan" SERIAL NOT NULL,
    "id_tenant" INTEGER NOT NULL,
    "jumlah" DECIMAL(12,2) NOT NULL,
    "biaya_transfer" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU',
    "referensi_payout" TEXT,
    "bukti_transfer" TEXT,
    "dijadwalkan_pada" DATE NOT NULL,
    "selesai_pada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PencairanTenant_pkey" PRIMARY KEY ("id_pencairan")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id_event" SERIAL NOT NULL,
    "penyedia" TEXT NOT NULL DEFAULT 'logikraf',
    "event_id" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id_event")
);

-- CreateIndex
CREATE UNIQUE INDEX "AkunPembayaranTenant_id_tenant_key" ON "AkunPembayaranTenant"("id_tenant");

-- CreateIndex
CREATE UNIQUE INDEX "AkunPembayaranTenant_xendit_account_id_key" ON "AkunPembayaranTenant"("xendit_account_id");

-- CreateIndex
CREATE INDEX "AkunPembayaranTenant_status_kyc_idx" ON "AkunPembayaranTenant"("status_kyc");

-- CreateIndex
CREATE UNIQUE INDEX "PembayaranIuran_id_iuran_key" ON "PembayaranIuran"("id_iuran");

-- CreateIndex
CREATE UNIQUE INDEX "PembayaranIuran_referensi_bayar_key" ON "PembayaranIuran"("referensi_bayar");

-- CreateIndex
CREATE INDEX "PembayaranIuran_id_tenant_status_idx" ON "PembayaranIuran"("id_tenant", "status");

-- CreateIndex
CREATE INDEX "LedgerTransaksi_id_tenant_createdAt_idx" ON "LedgerTransaksi"("id_tenant", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_id_ledger_idx" ON "LedgerEntry"("id_ledger");

-- CreateIndex
CREATE INDEX "PencairanTenant_id_tenant_status_idx" ON "PencairanTenant"("id_tenant", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_event_id_key" ON "WebhookEvent"("event_id");

-- CreateIndex
CREATE INDEX "WebhookEvent_penyedia_processed_at_idx" ON "WebhookEvent"("penyedia", "processed_at");

-- AddForeignKey
ALTER TABLE "AkunPembayaranTenant" ADD CONSTRAINT "AkunPembayaranTenant_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PembayaranIuran" ADD CONSTRAINT "PembayaranIuran_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PembayaranIuran" ADD CONSTRAINT "PembayaranIuran_id_iuran_fkey" FOREIGN KEY ("id_iuran") REFERENCES "IuranRumah"("id_iuran") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_id_ledger_fkey" FOREIGN KEY ("id_ledger") REFERENCES "LedgerTransaksi"("id_ledger") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PencairanTenant" ADD CONSTRAINT "PencairanTenant_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;

