import type {
  CreateRumahInput,
  ImporBarisError,
  ImporHasil,
  ListRumahQueryInput,
  UpdateRumahInput,
} from "@smarthub/shared";
import { createRumahSchema } from "@smarthub/shared";
import { getTenantId } from "../../common/tenant/tenant-context";
import { HttpError } from "../../common/utils/http-error";
import { isDuplicateError, pesanError, ringkasZodError } from "../../common/utils/impor";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { toDateOnly } from "../../common/utils/serialize";
import { langgananService } from "../langganan/langganan.service";
import { wilayahRepository } from "./wilayah.repository";

interface RumahRecord {
  id_rumah: number;
  nomor_rumah: string;
  blok: string;
  jalan_gang: string;
  status_kepemilikan: string;
  status_hunian: string;
}

const presentRumah = (rumah: RumahRecord) => ({
  id_rumah: rumah.id_rumah,
  nomor_rumah: rumah.nomor_rumah,
  blok: rumah.blok,
  jalan_gang: rumah.jalan_gang,
  status_kepemilikan: rumah.status_kepemilikan,
  status_hunian: rumah.status_hunian,
});

export const wilayahService = {
  async create(input: CreateRumahInput) {
    const id_tenant = getTenantId();
    if (id_tenant !== null) {
      await langgananService.pastikanKuotaCukup(id_tenant, 1);
    }

    const rumah = await wilayahRepository.create(input);
    return presentRumah(rumah);
  },

  async list(query: ListRumahQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { nomor_rumah: "asc" });

    const where = {
      ...(query.blok ? { blok: query.blok } : {}),
      ...(query.status_hunian ? { status_hunian: query.status_hunian } : {}),
      ...(query.status_kepemilikan ? { status_kepemilikan: query.status_kepemilikan } : {}),
      ...(query.nomor_rumah
        ? { nomor_rumah: { contains: query.nomor_rumah, mode: "insensitive" as const } }
        : {}),
    };

    const { items, total } = await wilayahRepository.list({ skip, take, where, orderBy });

    return {
      data: items.map((item) => presentRumah(item)),
      meta: buildMeta(page, limit, total),
    };
  },

  async detail(id_rumah: number) {
    const rumah = await wilayahRepository.findById(id_rumah);
    if (!rumah) {
      throw HttpError.notFound("Rumah tidak ditemukan");
    }

    return {
      ...presentRumah(rumah),
      kartu_keluarga: rumah.kartu_keluarga.map((kk) => ({
        no_kk: kk.no_kk,
        id_rumah: kk.id_rumah,
        tgl_dikeluarkan: toDateOnly(kk.tgl_dikeluarkan),
        warga: kk.warga.map((warga) => ({
          nik: warga.nik,
          nama_lengkap: warga.nama_lengkap,
          status_hubungan_keluarga: warga.status_hubungan_keluarga,
          status_aktif: warga.status_aktif,
        })),
      })),
    };
  },

  async update(id_rumah: number, input: UpdateRumahInput) {
    const exists = await wilayahRepository.exists(id_rumah);
    if (!exists) {
      throw HttpError.notFound("Rumah tidak ditemukan");
    }
    const rumah = await wilayahRepository.update(id_rumah, input);
    return presentRumah(rumah);
  },

  async imporRumah(rows: unknown[]): Promise<ImporHasil> {
    const id_tenant = getTenantId();
    if (id_tenant !== null && rows.length > 0) {
      await langgananService.pastikanKuotaCukup(id_tenant, rows.length);
    }

    const errors: ImporBarisError[] = [];
    let berhasil = 0;
    let dilewati = 0;

    for (const [index, row] of rows.entries()) {
      const parsed = createRumahSchema.safeParse(row);
      if (!parsed.success) {
        errors.push({ baris: index + 1, message: ringkasZodError(parsed.error) });
        continue;
      }

      try {
        await wilayahRepository.create(parsed.data);
        berhasil += 1;
      } catch (error) {
        if (isDuplicateError(error)) {
          dilewati += 1;
          continue;
        }
        errors.push({ baris: index + 1, message: pesanError(error) });
      }
    }

    return {
      total: rows.length,
      berhasil,
      dilewati,
      gagal: errors.length,
      errors: errors.slice(0, 100),
    };
  },

  async assertRumahExists(id_rumah: number): Promise<void> {
    const exists = await wilayahRepository.exists(id_rumah);
    if (!exists) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "id_rumah", message: "Rumah tidak ditemukan" },
      ]);
    }
  },

  async listDihuniRumahIds(): Promise<number[]> {
    return wilayahRepository.listDihuniIds();
  },
};

export type WilayahService = typeof wilayahService;
