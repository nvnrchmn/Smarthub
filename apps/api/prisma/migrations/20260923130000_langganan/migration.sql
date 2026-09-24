-- Fase SaaS — Langganan (billing manual, tanpa Hub)

-- CreateEnum
CREATE TYPE "StatusLangganan" AS ENUM ('Trial', 'Aktif', 'Menunggak', 'Berhenti');
CREATE TYPE "MetodeBayarLangganan" AS ENUM ('Transfer_Manual', 'QRIS', 'Virtual_Account');

-- CreateTable
CREATE TABLE "PaketLangganan" (
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "harga_bulanan" DECIMAL(12,2) NOT NULL,
    "harga_tahunan" DECIMAL(12,2) NOT NULL,
    "batas_rumah" INTEGER,
    "fitur" JSONB NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaketLangganan_pkey" PRIMARY KEY ("kode")
);

CREATE TABLE "LanggananTenant" (
    "id_langganan" SERIAL NOT NULL,
    "id_tenant" INTEGER NOT NULL,
    "kode_paket" TEXT NOT NULL,
    "status" "StatusLangganan" NOT NULL DEFAULT 'Trial',
    "mulai" DATE NOT NULL,
    "berakhir" DATE NOT NULL,
    "trial_berakhir" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanggananTenant_pkey" PRIMARY KEY ("id_langganan")
);

CREATE TABLE "InvoiceLangganan" (
    "id_invoice" SERIAL NOT NULL,
    "id_tenant" INTEGER NOT NULL,
    "id_langganan" INTEGER NOT NULL,
    "periode_mulai" DATE NOT NULL,
    "periode_akhir" DATE NOT NULL,
    "jumlah" DECIMAL(12,2) NOT NULL,
    "status" "StatusBayar" NOT NULL DEFAULT 'Belum_Bayar',
    "jatuh_tempo" DATE NOT NULL,
    "bukti_transfer" TEXT,
    "paid_at" TIMESTAMP(3),
    "diverifikasi_oleh" INTEGER,
    "diverifikasi_pada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLangganan_pkey" PRIMARY KEY ("id_invoice")
);

CREATE TABLE "PembayaranLangganan" (
    "id_pembayaran" SERIAL NOT NULL,
    "id_invoice" INTEGER NOT NULL,
    "metode" "MetodeBayarLangganan" NOT NULL DEFAULT 'Transfer_Manual',
    "referensi_bayar" TEXT,
    "jumlah" DECIMAL(12,2) NOT NULL,
    "status" "StatusBayar" NOT NULL DEFAULT 'Belum_Bayar',
    "paid_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PembayaranLangganan_pkey" PRIMARY KEY ("id_pembayaran")
);

-- CreateIndex
CREATE UNIQUE INDEX "LanggananTenant_id_tenant_key" ON "LanggananTenant"("id_tenant");
CREATE INDEX "LanggananTenant_status_berakhir_idx" ON "LanggananTenant"("status", "berakhir");
CREATE INDEX "InvoiceLangganan_id_tenant_status_idx" ON "InvoiceLangganan"("id_tenant", "status");
CREATE INDEX "PembayaranLangganan_id_invoice_idx" ON "PembayaranLangganan"("id_invoice");

-- AddForeignKey
ALTER TABLE "LanggananTenant" ADD CONSTRAINT "LanggananTenant_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LanggananTenant" ADD CONSTRAINT "LanggananTenant_kode_paket_fkey" FOREIGN KEY ("kode_paket") REFERENCES "PaketLangganan"("kode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceLangganan" ADD CONSTRAINT "InvoiceLangganan_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceLangganan" ADD CONSTRAINT "InvoiceLangganan_id_langganan_fkey" FOREIGN KEY ("id_langganan") REFERENCES "LanggananTenant"("id_langganan") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PembayaranLangganan" ADD CONSTRAINT "PembayaranLangganan_id_invoice_fkey" FOREIGN KEY ("id_invoice") REFERENCES "InvoiceLangganan"("id_invoice") ON DELETE CASCADE ON UPDATE CASCADE;
