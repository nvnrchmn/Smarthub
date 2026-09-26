import type { KanalNotifikasi } from "@prisma/client";
import { prisma } from "../config/database";
import { env } from "../config/environment";
import { kirimEmail } from "../config/kanal-notifikasi";
import { logger } from "../config/logger";
import { adminService } from "../modules/admin/admin.service";
import { KODE_FREE } from "../modules/langganan/langganan.fitur";
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
    antrean.push({
      id_tenant,
      id_penerima: akun.id_pengguna,
      kanal: "Email",
      tujuan: akun.email,
      tipe,
      judul,
      pesan,
    });
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

const apakahSudahDiantrekanHariIni = async (
  id_penerima: number,
  tipe: string,
): Promise<boolean> => {
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
  const batasMenunggak = new Date(hariIni.getTime() - TENGGANG_HARI * 86_400_000);
  const berlakuSampai = new Date(
    Date.UTC(hariIni.getUTCFullYear() + 100, hariIni.getUTCMonth(), hariIni.getUTCDate()),
  );

  const turunKeGratis = async (
    id_langganan: number,
    id_tenant: number,
    tipe: string,
    judul: string,
    pesan: string,
  ): Promise<void> => {
    await prisma.langgananTenant.update({
      where: { id_langganan },
      data: {
        kode_paket: KODE_FREE,
        status: "Aktif",
        trial_berakhir: null,
        berakhir: berlakuSampai,
      },
    });

    const pengurus = await prisma.akunPengguna.findMany({
      where: { id_tenant, role: { in: [...PERAN_PENGURUS] }, status_akun: "Aktif" },
      select: { id_pengguna: true, email: true, warga: { select: { no_hp: true } } },
    });
    for (const akun of pengurus) {
      if (await apakahSudahDiantrekanHariIni(akun.id_pengguna, tipe)) continue;
      await antrekanKeAkun(akun, id_tenant, tipe, judul, pesan);
    }
  };

  // Trial berakhir → paket Gratis (akses tetap; data tidak dihapus).
  const trialHabis = await prisma.langgananTenant.findMany({
    where: { status: "Trial", berakhir: { lt: hariIni } },
    include: { tenant: { select: { id_tenant: true, nama: true } } },
  });
  for (const langganan of trialHabis) {
    await turunKeGratis(
      langganan.id_langganan,
      langganan.id_tenant,
      "Langganan_Trial_Berakhir",
      "Trial SmartHub berakhir",
      `Masa trial Pro ${langganan.tenant.nama} berakhir. Akun otomatis beralih ke paket Gratis tanpa kehilangan data. Upgrade paket untuk fitur lanjutan.`,
    );
  }

  // Langganan berbayar berakhir → Menunggak + pengingat.
  const akanMenunggak = await prisma.langgananTenant.findMany({
    where: { status: "Aktif", berakhir: { lt: hariIni }, kode_paket: { not: KODE_FREE } },
    include: { tenant: { select: { id_tenant: true, nama: true } } },
  });
  for (const langganan of akanMenunggak) {
    await prisma.langgananTenant.update({
      where: { id_langganan: langganan.id_langganan },
      data: { status: "Menunggak" },
    });

    const pengurus = await prisma.akunPengguna.findMany({
      where: {
        id_tenant: langganan.id_tenant,
        role: { in: [...PERAN_PENGURUS] },
        status_akun: "Aktif",
      },
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

  // Lewat masa tenggang → paket Gratis (bukan mematikan akses).
  const lewatTenggang = await prisma.langgananTenant.findMany({
    where: { status: "Menunggak", berakhir: { lt: batasMenunggak } },
    include: { tenant: { select: { id_tenant: true, nama: true } } },
  });
  for (const langganan of lewatTenggang) {
    await turunKeGratis(
      langganan.id_langganan,
      langganan.id_tenant,
      "Langganan_Turun_Gratis",
      "Langganan beralih ke paket Gratis",
      `Langganan ${langganan.tenant.nama} melewati masa tenggang. Akun beralih ke paket Gratis; data tetap tersimpan.`,
    );
  }

  if (trialHabis.length > 0 || akanMenunggak.length > 0 || lewatTenggang.length > 0) {
    logger.info(
      {
        trial_habis: trialHabis.length,
        menunggak: akanMenunggak.length,
        turun_gratis: lewatTenggang.length,
      },
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
    select: {
      id_iuran: true,
      id_tenant: true,
      id_rumah: true,
      jumlah_tagihan: true,
      bulan: true,
      tahun: true,
    },
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
  timers.push(
    setInterval(() => void aman("token-cleanup", jalankanTokenCleanup), 6 * 60 * 60 * 1000),
  );

  void aman("dispatch", jalankanDispatch);
  void aman("harian", jalankanHarian);
  void aman("token-cleanup", jalankanTokenCleanup);

  logger.info("Workers SmartHub aktif");
};

export const stopWorkers = (): void => {
  for (const timer of timers) clearInterval(timer);
  timers.length = 0;
};
