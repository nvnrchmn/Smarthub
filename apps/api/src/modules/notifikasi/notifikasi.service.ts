import type { KanalNotifikasi, TipeNotifikasi } from "@prisma/client";
import type { ListNotifikasiQueryInput, PreferensiNotifikasiInput } from "@smarthub/shared";
import { kirimEmail, kirimWhatsApp } from "../../config/kanal-notifikasi";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolvePagination } from "../../common/utils/pagination";
import { toIso } from "../../common/utils/serialize";
import { notifikasiRepository, type NotifikasiInput } from "./notifikasi.repository";

const MAKS_PERCOBAAN = 5;
const BACKOFF_MENIT = 10;

export interface AntreanInput {
  id_tenant: number;
  id_penerima?: number | null;
  kanal: KanalNotifikasi;
  tujuan: string;
  tipe: string;
  judul?: string | null;
  pesan: string;
  terjadwal_pada?: Date;
}

export interface Viewer {
  id_pengguna: number;
}

export const notifikasiService = {
  async kirim(input: NotifikasiInput) {
    return notifikasiRepository.create(input);
  },

  async kirimBanyak(items: NotifikasiInput[]) {
    if (items.length === 0) return;
    await notifikasiRepository.createMany(items);
  },

  async kirimKe(
    id_penerima: number,
    tipe: TipeNotifikasi,
    id_referensi: number,
    pesan: string,
  ) {
    return notifikasiRepository.create({ id_penerima, tipe, id_referensi, pesan });
  },

  async list(query: ListNotifikasiQueryInput, viewer: Viewer) {
    const { page, limit, skip, take } = resolvePagination(query);

    const { items, total } = await notifikasiRepository.list({
      id_penerima: viewer.id_pengguna,
      skip,
      take,
      ...(query.belum_dibaca !== undefined ? { belumDibaca: query.belum_dibaca } : {}),
    });

    return {
      data: items.map((item) => ({
        id_notifikasi: item.id_notifikasi,
        tipe: item.tipe,
        id_referensi: item.id_referensi,
        pesan: item.pesan,
        dibaca: item.dibaca_pada !== null,
        dibaca_pada: toIso(item.dibaca_pada),
        createdAt: toIso(item.createdAt),
      })),
      meta: buildMeta(page, limit, total),
    };
  },

  async jumlahBelumDibaca(viewer: Viewer) {
    const jumlah = await notifikasiRepository.countBelumDibaca(viewer.id_pengguna);
    return { belum_dibaca: jumlah };
  },

  async tandaiDibaca(id_notifikasi: number, viewer: Viewer) {
    const hasil = await notifikasiRepository.tandaiDibaca(id_notifikasi, viewer.id_pengguna);
    if (hasil.count === 0) {
      const ada = await notifikasiRepository.countBelumDibaca(viewer.id_pengguna);
      if (ada === 0) {
        throw HttpError.notFound("Notifikasi tidak ditemukan");
      }
    }
    return { id_notifikasi, dibaca: true };
  },

  async tandaiSemuaDibaca(viewer: Viewer) {
    const hasil = await notifikasiRepository.tandaiSemuaDibaca(viewer.id_pengguna);
    return { jumlah_ditandai: hasil.count };
  },

  async preferensiGet(id_pengguna: number): Promise<PreferensiNotifikasiInput> {
    const preferensi = await notifikasiRepository.preferensiGet(id_pengguna);
    return {
      whatsapp: preferensi?.whatsapp ?? true,
      email: preferensi?.email ?? true,
      pengingat_iuran: preferensi?.pengingat_iuran ?? true,
    };
  },

  async preferensiUpdate(
    id_pengguna: number,
    input: PreferensiNotifikasiInput,
  ): Promise<PreferensiNotifikasiInput> {
    const data = {
      ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.pengingat_iuran !== undefined ? { pengingat_iuran: input.pengingat_iuran } : {}),
    };

    const tersimpan = await notifikasiRepository.preferensiUpsert(
      id_pengguna,
      data,
      { id_pengguna, ...data },
    );

    return {
      whatsapp: tersimpan.whatsapp,
      email: tersimpan.email,
      pengingat_iuran: tersimpan.pengingat_iuran,
    };
  },

  async antrekan(input: AntreanInput) {
    return notifikasiRepository.outboxCreate({
      id_tenant: input.id_tenant,
      id_penerima: input.id_penerima ?? null,
      kanal: input.kanal,
      tujuan: input.tujuan,
      tipe: input.tipe,
      judul: input.judul ?? null,
      pesan: input.pesan,
      terjadwal_pada: input.terjadwal_pada ?? new Date(),
    });
  },

  async antrekanBanyak(items: AntreanInput[]) {
    if (items.length === 0) return { jumlah: 0 };
    await notifikasiRepository.outboxCreateMany(
      items.map((item) => ({
        id_tenant: item.id_tenant,
        id_penerima: item.id_penerima ?? null,
        kanal: item.kanal,
        tujuan: item.tujuan,
        tipe: item.tipe,
        judul: item.judul ?? null,
        pesan: item.pesan,
        terjadwal_pada: item.terjadwal_pada ?? new Date(),
      })),
    );
    return { jumlah: items.length };
  },

  /** Mengirim antrean yang jatuh tempo. Dipanggil worker. */
  async dispatchDue(limit = 50) {
    const items = await notifikasiRepository.outboxDue(limit);
    let terkirim = 0;
    let gagal = 0;

    for (const item of items) {
      const hasil =
        item.kanal === "WhatsApp"
          ? await kirimWhatsApp(item.tujuan, item.pesan)
          : item.kanal === "Email"
            ? await kirimEmail(item.tujuan, item.judul ?? "SmartHub", item.pesan)
            : { terkirim: true, dry: true };

      if (hasil.terkirim) {
        terkirim += 1;
        await notifikasiRepository.outboxUpdate(item.id_outbox, {
          status: "Terkirim",
          terkirim_pada: new Date(),
          percobaan: item.percobaan + 1,
          error: null,
        });
        continue;
      }

      gagal += 1;
      const percobaan = item.percobaan + 1;
      const habis = percobaan >= MAKS_PERCOBAAN;
      await notifikasiRepository.outboxUpdate(item.id_outbox, {
        status: habis ? "Gagal" : "Menunggu",
        percobaan,
        error: hasil.pesan ?? "Pengiriman gagal",
        terjadwal_pada: habis ? item.terjadwal_pada : new Date(Date.now() + BACKOFF_MENIT * 60_000),
      });
    }

    return { diproses: items.length, terkirim, gagal };
  },
};

export type NotifikasiService = typeof notifikasiService;
