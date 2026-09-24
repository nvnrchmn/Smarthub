-- FK invoice -> paket langganan yang dibeli

ALTER TABLE "InvoiceLangganan" ADD CONSTRAINT "InvoiceLangganan_kode_paket_fkey" FOREIGN KEY ("kode_paket") REFERENCES "PaketLangganan"("kode") ON DELETE SET NULL ON UPDATE CASCADE;
