import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TABLES = [
  "Rumah",
  "KartuKeluarga",
  "Warga",
  "MutasiWarga",
  "TamuKunjungan",
  "KategoriKeuangan",
  "IuranRumah",
  "KasUmum",
  "AkunPengguna",
  "Postingan",
  "KategoriProduk",
  "Produk",
  "LaporanProduk",
  "Notifikasi",
] as const;

const main = async (): Promise<void> => {
  let total = 0;

  for (const tabel of TABLES) {
    const rows = await prisma.$queryRawUnsafe<{ jumlah: bigint }[]>(
      `SELECT COUNT(*)::bigint AS jumlah FROM "${tabel}" WHERE "id_tenant" IS NULL`,
    );
    const jumlah = Number(rows[0]?.jumlah ?? 0);
    total += jumlah;
    console.log(`${tabel}: ${jumlah} baris tanpa id_tenant`);
  }

  if (total > 0) {
    console.error(`\nGAGAL: ${total} baris belum di-backfill. Jangan jalankan NOT NULL sebelum nol.`);
    process.exitCode = 1;
    return;
  }

  console.log("\nBackfill lengkap: tidak ada baris tanpa id_tenant.");
};

main()
  .catch((error) => {
    console.error("Pemeriksaan gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
