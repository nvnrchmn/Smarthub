-- Fase SaaS — Invoice langganan menyimpan paket yang dibeli (bisa berbeda dari paket aktif saat ini)

ALTER TABLE "InvoiceLangganan" ADD COLUMN "kode_paket" TEXT;
