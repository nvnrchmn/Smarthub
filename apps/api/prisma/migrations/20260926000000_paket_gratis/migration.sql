-- Tambah paket "Gratis" (idempoten). Wajib ada agar penurunan otomatis trial/lewat
-- tenggang ke paket gratis tidak melanggar foreign key `LanggananTenant.kode_paket`.
INSERT INTO "PaketLangganan" ("kode", "nama", "harga_bulanan", "harga_tahunan", "batas_rumah", "fitur", "aktif")
VALUES (
  'free',
  'Gratis',
  0,
  0,
  25,
  '["Kependudukan dasar","Keamanan & buku tamu","Kas & iuran (transfer manual)","Diskusi warga"]'::jsonb,
  true
)
ON CONFLICT ("kode") DO NOTHING;
