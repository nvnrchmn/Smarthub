import type { CreateTamuInput, ListTamuQueryInput, UpdateTamuInput } from "@smarthub/shared";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { toIso } from "../../common/utils/serialize";
import { wilayahService } from "../wilayah/wilayah.service";
import { keamananRepository } from "./keamanan.repository";

interface TamuRecord {
  id_tamu: number;
  id_rumah_tujuan: number;
  nama_tamu: string;
  jumlah_tamu: number;
  tgl_datang: Date;
  tgl_pergi: Date | null;
  keperluan: string;
  rumah: { nomor_rumah: string; blok: string };
}

const presentTamu = (tamu: TamuRecord) => ({
  id_tamu: tamu.id_tamu,
  id_rumah_tujuan: tamu.id_rumah_tujuan,
  nomor_rumah: tamu.rumah.nomor_rumah,
  blok: tamu.rumah.blok,
  nama_tamu: tamu.nama_tamu,
  jumlah_tamu: tamu.jumlah_tamu,
  tgl_datang: toIso(tamu.tgl_datang),
  tgl_pergi: toIso(tamu.tgl_pergi),
  keperluan: tamu.keperluan,
  status: tamu.tgl_pergi ? "keluar" : "didalam",
});

export const keamananService = {
  async create(input: CreateTamuInput) {
    await wilayahService.assertRumahExists(input.id_rumah_tujuan);
    const tamu = await keamananRepository.create({
      id_rumah_tujuan: input.id_rumah_tujuan,
      nama_tamu: input.nama_tamu,
      jumlah_tamu: input.jumlah_tamu,
      keperluan: input.keperluan,
    });
    return presentTamu(tamu);
  },

  async list(query: ListTamuQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { tgl_datang: "desc" });

    const where = {
      ...(query.id_rumah_tujuan ? { id_rumah_tujuan: query.id_rumah_tujuan } : {}),
      ...(query.tanggal
        ? {
            tgl_datang: {
              gte: new Date(`${query.tanggal}T00:00:00.000Z`),
              lte: new Date(`${query.tanggal}T23:59:59.999Z`),
            },
          }
        : {}),
      ...(query.status === "didalam" ? { tgl_pergi: null } : {}),
      ...(query.status === "keluar" ? { tgl_pergi: { not: null } } : {}),
    };

    const { items, total } = await keamananRepository.list({ skip, take, where, orderBy });

    return {
      data: items.map((item) => presentTamu(item)),
      meta: buildMeta(page, limit, total),
    };
  },

  async detail(id_tamu: number) {
    const tamu = await keamananRepository.findById(id_tamu);
    if (!tamu) {
      throw HttpError.notFound("Data tamu tidak ditemukan");
    }
    return presentTamu(tamu);
  },

  async update(id_tamu: number, input: UpdateTamuInput) {
    const tamu = await keamananRepository.findById(id_tamu);
    if (!tamu) {
      throw HttpError.notFound("Data tamu tidak ditemukan");
    }
    if (input.id_rumah_tujuan) {
      await wilayahService.assertRumahExists(input.id_rumah_tujuan);
    }

    const updated = await keamananRepository.update(id_tamu, {
      ...(input.id_rumah_tujuan ? { id_rumah_tujuan: input.id_rumah_tujuan } : {}),
      ...(input.nama_tamu ? { nama_tamu: input.nama_tamu } : {}),
      ...(input.jumlah_tamu ? { jumlah_tamu: input.jumlah_tamu } : {}),
      ...(input.keperluan ? { keperluan: input.keperluan } : {}),
    });

    return presentTamu(updated);
  },

  async checkout(id_tamu: number) {
    const tamu = await keamananRepository.findById(id_tamu);
    if (!tamu) {
      throw HttpError.notFound("Data tamu tidak ditemukan");
    }
    if (tamu.tgl_pergi) {
      throw HttpError.conflict("Tamu ini sudah melakukan check-out");
    }

    const updated = await keamananRepository.checkout(id_tamu, new Date());
    return {
      id_tamu: updated.id_tamu,
      tgl_pergi: toIso(updated.tgl_pergi),
    };
  },
};

export type KeamananService = typeof keamananService;
