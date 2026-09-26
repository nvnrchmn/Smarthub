-- CreateTable
CREATE TABLE "PengaturanTenant" (
    "id_tenant" INTEGER NOT NULL,
    "tahun_buku_mulai" INTEGER NOT NULL DEFAULT 1,
    "zona_waktu" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "nominal_iuran_default" DECIMAL(12,2),
    "jatuh_tempo_iuran_tanggal" INTEGER,
    "denda_persen" DECIMAL(5,2),
    "prefix_nomor" TEXT,
    "notifikasi" JSONB,
    "dokumen" JSONB,
    "branding" JSONB,
    "updated_by" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PengaturanTenant_pkey" PRIMARY KEY ("id_tenant")
);

-- AddForeignKey
ALTER TABLE "PengaturanTenant" ADD CONSTRAINT "PengaturanTenant_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE CASCADE ON UPDATE CASCADE;
