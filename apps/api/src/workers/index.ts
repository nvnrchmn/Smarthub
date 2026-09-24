import type { KanalNotifikasi } from "@prisma/client";
import { prisma } from "../config/database";
import { env } from "../config/environment";
import { kirimEmail } from "../config/kanal-notifikasi";
import { logger } from "../config/logger";
import { adminService } from "../modules/admin/admin.service";
import { notifikasiService } from "../modules/notifikasi/notifikasi.service";

const TENGGANG_HARI = 7;
const TOKEN_RETENSI_HARI = 30;
const PERAN_PENGURUS = ["Ketua_RT", "Bendahara"] as const;

const timers: NodeJS.Timeout[] = [];
let lastDailyRun = "";

const tanggalHariIni = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const tanggalOnly = (date: Date): string => date.toISOString().slice(0, 10);

interface AkunKontak {
  id_pengguna: number;
  email: string;
  warga: { no_hp: string | null } | null;
}

const antrekanKeAkun = async (
  akun: AkunKontak,
  id_tenant: number,
  tipe: string,
  judul: string,
  pesan: string,
  hormatiPengingatIuran = false,
): Promise<number> => {
  const preferensi = await notifikasiService.preferensiGet(akun.id_pengguna);
  if (hormatiPengingatIuran && !preferensi.pengingat_iuran) return 0;

  const antrean: {
    id_tenant: number;
    id_penerima: number;
    kanal: KanalNotifikasi;
    tujuan: string;
    tipe: string;
    judul: string;
    pesan: string;
  }[] = [];

  if (preferensi.email && akun.email) {
    antrean.push({ id_tenant, id_penerima: akun.id_pengguna, kanal: "Email", tujuan: akun.email, tipe, judul, pesan });
  }
  if (preferensi.whatsapp && akun.warga?.no_hp) {
    antrean.push({
      id_tenant,
      id_penerima: akun.id_pengguna,
      kanal: "WhatsApp",
      tujuan: akun.warga.no_hp,
      tipe,
      judul,
      pesan,
    });
  }

  await notifikasiService.antrekanBanyak(antrean);
  return antrean.length;
};

const apakahSudahDiantrekanHariIni = async (id_penerima: number, tipe: string): Promise<boolean> => {
  const awalHari = tanggalHariIni();
  const jumlah = await prisma.notificationOutbox.count({
    where: { id_penerima, tipe, createdAt: { gte: awalHari } },
  });
  return jumlah > 0;
};

const jalankanDispatch = async (): Promise<void> => {
  const hasil = await notifikasiService.dispatchDue(50);
  if (hasil.diproses > 0) {
    logger.info(hasil, "Dispatch notifikasi outbox");
  }
};

export const jalankanLanggananTenggat = async (): Promise<void> => {
  const hariIni = tanggalHariIni();
  const batasBerhenti = new Date(hariIni.getTime() - TENGGANG_HARI * 86_400_000);

  const akanMenunggak = await prisma.langgananTenant.findMany({
    where: { status: { in: ["Trial", "Aktif"] }, berakhir: { lt: hariIni } },
    include: { tenant: { select: { id_tenant: true, nama: true } } },
  });

  for (const langganan of akanMenunggak) {
    await prisma.langgananTenant.update({
      where: { id_langganan: langganan.id_langganan },
      data: { status: "Menunggak" },
    });

    const pengurus = await prisma.akunPengguna.findMany({
      where: { id_tenant: langganan.id_tenant, role: { in: [...PERAN_PENGURUS] }, status_akun: "Aktif" },
      select: { id_pengguna: true, email: true, warga: { select: { no_hp: true } } },
    });

    for (const akun of pengurus) {
      if (await apakahSudahDiantrekanHariIni(akun.id_pengguna, "Langganan_Menunggak")) continue;
      await antrekanKeAkun(
        akun,
        langganan.id_tenant,
        "Langganan_Menunggak",
        "Langganan SmartHub menunggak",
        `Langganan ${langganan.tenant.nama} berakhir ${tanggalOnly(langganan.berakhir)}. Mohon segera lakukan pembayaran.`,
      );
    }
  }

  const akanBerhenti = await prisma.langgananTenant.findMany({
    where: { status: "Menunggak", berakhir: { lt: batasBerhenti } },
  });

  for (const langganan of akanBerhenti) {
    await prisma.langgananTenant.update({
      where: { id_langganan: langganan.id_langganan },
      data: { status: "Berhenti" },
    });
  }

  if (akanMenunggak.length > 0 || akanBerhenti.length > 0) {
    logger.info(
      { menunggak: akanMenunggak.length, berhenti: akanBerhenti.length },
      "Status langganan diperbarui",
    );
  }
};

const jalankanPengingatIuran = async (): Promise<void> => {
  const now = new Date();
  const bulan = now.getUTCMonth() + 1;
  const tahun = now.getUTCFullYear();
  const akhirBulan = new Date(Date.UTC(tahun, bulan, 0));
  const hariTersisa = akhirBulan.getUTCDate() - now.getUTCDate();

  if (hariTersisa !== 7 && hariTersisa !== 1) return;

  const iuran = await prisma.iuranRumah.findMany({
    where: { bulan, tahun, status_bayar: "Belum_Bayar" },
    select: { id_iuran: true, id_tenant: true, id_rumah: true, jumlah_tagihan: true, bulan: true, tahun: true },
  });

  let terkirim = 0;
  for (const tagihan of iuran) {
    const akunWarga = await prisma.akunPengguna.findMany({
      where: {
        id_tenant: tagihan.id_tenant,
        status_akun: "Aktif",
        warga: { kartu_keluarga: { id_rumah: tagihan.id_rumah } },
      },
      select: { id_pengguna: true, email: true, warga: { select: { no_hp: true } } },
    });

    for (const akun of akunWarga) {
      if (await apakahSudahDiantrekanHariIni(akun.id_pengguna, "Pengingat_Iuran")) continue;
      terkirim += await antrekanKeAkun(
        akun,
        tagihan.id_tenant,
        "Pengingat_Iuran",
        "Pengingat iuran",
        `Iuran bulan ${tagihan.bulan}/${tagihan.tahun} belum dibayar. Jatuh tempo dalam ${hariTersisa} hari.`,
        true,
      );
    }
  }

  if (terkirim > 0) logger.info({ terkirim, hariTersisa }, "Pengingat iuran diantrekan");
};

export const jalankanRekonsiliasi = async (): Promise<void> => {
  const hasil = await adminService.rekonsiliasi();
  if (hasil.jumlah_selisih > 0) {
    logger.warn(hasil, "Rekonsiliasi menemukan selisih ledger vs pembayaran");
  } else {
    logger.info({ ledger_qris: hasil.ledger_qris }, "Rekonsiliasi seimbang");
  }
};

export const jalankanAlertPlatform = async (): Promise<void> => {
  const [alert, admins] = await Promise.all([
    adminService.alert(),
    adminService.akunPlatformAktif(),
  ]);

  const total =
    alert.webhook_menunggu.length +
    alert.webhook_gagal_jumlah +
    alert.payout_gagal_jumlah +
    alert.langganan_jatuh_tempo.length +
    alert.invoice_belum_bayar.length;

  if (total === 0 || admins.length === 0) return;

  const pesan =
    `Perlu tindakan: ${alert.webhook_menunggu.length} webhook belum diproses, ` +
    `${alert.webhook_gagal_jumlah} webhook gagal (24 jam), ` +
    `${alert.payout_gagal_jumlah} payout gagal (24 jam), ` +
    `${alert.langganan_jatuh_tempo.length} langganan jatuh tempo, ` +
    `${alert.invoice_belum_bayar.length} invoice langganan belum lunas.`;

  for (const admin of admins) {
    await kirimEmail(admin.email, "SmartHub — Perlu Tindakan", pesan);
  }

  logger.info({ total, admin: admins.length }, "Alert platform dikirim");
};

export const jalankanTokenCleanup = async (): Promise<void> => {
  const batas = new Date(Date.now() - TOKEN_RETENSI_HARI * 86_400_000);
  const hasil = await prisma.sesiRefreshToken.deleteMany({
    where: { OR: [{ kedaluwarsa: { lt: batas } }, { dicabut_pada: { lt: batas } }] },
  });
  if (hasil.count > 0) logger.info({ dihapus: hasil.count }, "Token sesi lama dibersihkan");
};

const jalankanHarian = async (): Promise<void> => {
  const hariIni = tanggalOnly(tanggalHariIni());
  if (lastDailyRun === hariIni) return;
  lastDailyRun = hariIni;

  await jalankanLanggananTenggat();
  await jalankanPengingatIuran();
  await jalankanRekonsiliasi();
  await jalankanAlertPlatform();
};

const aman = async (nama: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
  } catch (error) {
    logger.error({ err: error, job: nama }, "Worker gagal");
  }
};

export const startWorkers = (): void => {
  if (!env.WORKERS_ENABLED) {
    logger.info("Workers nonaktif (set WORKERS_ENABLED=true untuk mengaktifkan)");
    return;
  }

  timers.push(setInterval(() => void aman("dispatch", jalankanDispatch), env.WORKER_INTERVAL_MS));
  timers.push(setInterval(() => void aman("harian", jalankanHarian), 60 * 60 * 1000));
  timers.push(setInterval(() => void aman("token-cleanup", jalankanTokenCleanup), 6 * 60 * 60 * 1000));

  void aman("dispatch", jalankanDispatch);
  void aman("harian", jalankanHarian);
  void aman("token-cleanup", jalankanTokenCleanup);

  logger.info("Workers SmartHub aktif");
};

export const stopWorkers = (): void => {
  for (const timer of timers) clearInterval(timer);
  timers.length = 0;
};
