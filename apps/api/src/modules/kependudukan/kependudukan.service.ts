import type {
  CreateKkInput,
  CreateMutasiInput,
  CreateWargaInput,
  ImporBarisError,
  ImporHasil,
  ListKkQueryInput,
  ListMutasiQueryInput,
  ListWargaQueryInput,
  ListWargaTanpaAkunQueryInput,
  StatusAktif,
  UpdateKkInput,
  UpdateWargaInput,
  VerifikasiMutasiInput,
} from "@smarthub/shared";
import {
  createKkSchema,
  createWargaSchema,
  normalizePhone,
  phoneSearchTail,
} from "@smarthub/shared";
import { HttpError } from "../../common/utils/http-error";
import { isDuplicateError, pesanError, ringkasZodError } from "../../common/utils/impor";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { parseDateOnly, toDateOnly, toIso } from "../../common/utils/serialize";
import { wilayahService } from "../wilayah/wilayah.service";
import { kependudukanRepository } from "./kependudukan.repository";

interface WargaRecord {
  nik: string;
  no_kk: string;
  nama_lengkap: string;
  tempat_lahir: string;
  tanggal_lahir: Date;
  jenis_kelamin: string;
  agama: string;
  status_perkawinan: string;
  pekerjaan: string;
  no_hp: string | null;
  status_hubungan_keluarga: string;
  status_tinggal: string;
  status_aktif: string;
}

const presentWarga = (warga: WargaRecord) => ({
  nik: warga.nik,
  no_kk: warga.no_kk,
  nama_lengkap: warga.nama_lengkap,
  tempat_lahir: warga.tempat_lahir,
  tanggal_lahir: toDateOnly(warga.tanggal_lahir),
  jenis_kelamin: warga.jenis_kelamin,
  agama: warga.agama,
  status_perkawinan: warga.status_perkawinan,
  pekerjaan: warga.pekerjaan,
  no_hp: warga.no_hp,
  status_hubungan_keluarga: warga.status_hubungan_keluarga,
  status_tinggal: warga.status_tinggal,
  status_aktif: warga.status_aktif,
});

const presentWargaRingkas = (warga: WargaRecord) => ({
  nik: warga.nik,
  nama_lengkap: warga.nama_lengkap,
  no_kk: warga.no_kk,
  status_hubungan_keluarga: warga.status_hubungan_keluarga,
  status_aktif: warga.status_aktif,
});

const STATUS_AKTIF_BY_MUTASI: Record<string, StatusAktif | undefined> = {
  Lahir: "Aktif",
  Datang: "Aktif",
  Meninggal: "Meninggal",
  Pindah_Keluar: "Pindah_Keluar",
};

export const kependudukanService = {
  async findWargaByNik(nik: string) {
    const warga = await kependudukanRepository.findWargaByNik(nik);
    if (!warga) return null;
    return {
      nik: warga.nik,
      nama_lengkap: warga.nama_lengkap,
      no_kk: warga.no_kk,
      status_aktif: warga.status_aktif,
    };
  },

  async findNikByNoHp(noHp: string): Promise<string | null> {
    const tail = phoneSearchTail(noHp);
    if (tail.length < 7) return null;

    const normalized = normalizePhone(noHp);
    const candidates = await kependudukanRepository.findWargaByNoHpTail(tail);

    const matches = candidates.filter(
      (warga) =>
        warga.akun_pengguna !== null && warga.no_hp !== null && normalizePhone(warga.no_hp) === normalized,
    );

    if (matches.length !== 1) return null;
    return matches[0]?.nik ?? null;
  },

  async findRumahIdByNik(nik: string): Promise<number | null> {
    const warga = await kependudukanRepository.findWargaByNik(nik);
    return warga?.kartu_keluarga.id_rumah ?? null;
  },

  async assertKkExists(no_kk: string): Promise<void> {
    const exists = await kependudukanRepository.existsKk(no_kk);
    if (!exists) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "no_kk", message: "Kartu Keluarga tidak ditemukan" },
      ]);
    }
  },

  async createKk(input: CreateKkInput) {
    await wilayahService.assertRumahExists(input.id_rumah);
    const kk = await kependudukanRepository.createKk({
      no_kk: input.no_kk,
      id_rumah: input.id_rumah,
      tgl_dikeluarkan: parseDateOnly(input.tgl_dikeluarkan),
    });
    return {
      no_kk: kk.no_kk,
      id_rumah: kk.id_rumah,
      tgl_dikeluarkan: toDateOnly(kk.tgl_dikeluarkan),
    };
  },

  async imporKk(rows: unknown[]): Promise<ImporHasil> {
    const errors: ImporBarisError[] = [];
    let berhasil = 0;
    let dilewati = 0;

    for (const [index, row] of rows.entries()) {
      const parsed = createKkSchema.safeParse(row);
      if (!parsed.success) {
        errors.push({ baris: index + 1, message: ringkasZodError(parsed.error) });
        continue;
      }

      try {
        await wilayahService.assertRumahExists(parsed.data.id_rumah);
        await kependudukanRepository.createKk({
          no_kk: parsed.data.no_kk,
          id_rumah: parsed.data.id_rumah,
          tgl_dikeluarkan: parseDateOnly(parsed.data.tgl_dikeluarkan),
        });
        berhasil += 1;
      } catch (error) {
        if (isDuplicateError(error)) {
          dilewati += 1;
          continue;
        }
        if (error instanceof HttpError) {
          errors.push({
            baris: index + 1,
            message: error.errors.map((item) => item.message).join("; ") || error.message,
          });
          continue;
        }
        errors.push({ baris: index + 1, message: pesanError(error) });
      }
    }

    return { total: rows.length, berhasil, dilewati, gagal: errors.length, errors: errors.slice(0, 100) };
  },

  async listKk(query: ListKkQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "desc" });

    const { items, total } = await kependudukanRepository.listKk({
      skip,
      take,
      where: { ...(query.id_rumah ? { id_rumah: query.id_rumah } : {}) },
      orderBy,
    });

    return {
      data: items.map((kk) => ({
        no_kk: kk.no_kk,
        id_rumah: kk.id_rumah,
        tgl_dikeluarkan: toDateOnly(kk.tgl_dikeluarkan),
        nomor_rumah: kk.rumah.nomor_rumah,
        blok: kk.rumah.blok,
        jumlah_anggota: kk._count.warga,
      })),
      meta: buildMeta(page, limit, total),
    };
  },

  async detailKk(no_kk: string) {
    const kk = await kependudukanRepository.findKkById(no_kk);
    if (!kk) {
      throw HttpError.notFound("Kartu Keluarga tidak ditemukan");
    }
    return {
      no_kk: kk.no_kk,
      id_rumah: kk.id_rumah,
      tgl_dikeluarkan: toDateOnly(kk.tgl_dikeluarkan),
      anggota_keluarga: kk.warga.map(presentWargaRingkas),
    };
  },

  async updateKk(no_kk: string, input: UpdateKkInput) {
    const exists = await kependudukanRepository.existsKk(no_kk);
    if (!exists) {
      throw HttpError.notFound("Kartu Keluarga tidak ditemukan");
    }
    if (input.id_rumah !== undefined) {
      await wilayahService.assertRumahExists(input.id_rumah);
    }

    const kk = await kependudukanRepository.updateKk(no_kk, {
      ...(input.id_rumah !== undefined ? { id_rumah: input.id_rumah } : {}),
      ...(input.tgl_dikeluarkan ? { tgl_dikeluarkan: parseDateOnly(input.tgl_dikeluarkan) } : {}),
    });

    return {
      no_kk: kk.no_kk,
      id_rumah: kk.id_rumah,
      tgl_dikeluarkan: toDateOnly(kk.tgl_dikeluarkan),
    };
  },

  async kkSaya(nik: string) {
    const warga = await kependudukanRepository.findWargaByNik(nik);
    if (!warga) {
      throw HttpError.notFound("Data warga tidak ditemukan");
    }
    const kk = await kependudukanRepository.findKkById(warga.no_kk);
    if (!kk) {
      throw HttpError.notFound("Kartu Keluarga tidak ditemukan");
    }
    return {
      no_kk: kk.no_kk,
      id_rumah: kk.id_rumah,
      anggota_keluarga: kk.warga.map(presentWargaRingkas),
    };
  },

  async createWarga(input: CreateWargaInput) {
    await kependudukanService.assertKkExists(input.no_kk);

    const warga = await kependudukanRepository.createWarga({
      nik: input.nik,
      no_kk: input.no_kk,
      nama_lengkap: input.nama_lengkap,
      tempat_lahir: input.tempat_lahir,
      tanggal_lahir: parseDateOnly(input.tanggal_lahir),
      jenis_kelamin: input.jenis_kelamin,
      agama: input.agama,
      status_perkawinan: input.status_perkawinan,
      pekerjaan: input.pekerjaan,
      no_hp: input.no_hp ?? null,
      status_hubungan_keluarga: input.status_hubungan_keluarga,
      status_tinggal: input.status_tinggal,
    });

    return presentWarga(warga);
  },

  async imporWarga(rows: unknown[]): Promise<ImporHasil> {
    const errors: ImporBarisError[] = [];
    let berhasil = 0;
    let dilewati = 0;

    for (const [index, row] of rows.entries()) {
      const parsed = createWargaSchema.safeParse(row);
      if (!parsed.success) {
        errors.push({ baris: index + 1, message: ringkasZodError(parsed.error) });
        continue;
      }

      try {
        await kependudukanService.assertKkExists(parsed.data.no_kk);
        await kependudukanRepository.createWarga({
          nik: parsed.data.nik,
          no_kk: parsed.data.no_kk,
          nama_lengkap: parsed.data.nama_lengkap,
          tempat_lahir: parsed.data.tempat_lahir,
          tanggal_lahir: parseDateOnly(parsed.data.tanggal_lahir),
          jenis_kelamin: parsed.data.jenis_kelamin,
          agama: parsed.data.agama,
          status_perkawinan: parsed.data.status_perkawinan,
          pekerjaan: parsed.data.pekerjaan,
          no_hp: parsed.data.no_hp ?? null,
          status_hubungan_keluarga: parsed.data.status_hubungan_keluarga,
          status_tinggal: parsed.data.status_tinggal,
        });
        berhasil += 1;
      } catch (error) {
        if (isDuplicateError(error)) {
          dilewati += 1;
          continue;
        }
        if (error instanceof HttpError) {
          errors.push({
            baris: index + 1,
            message: error.errors.map((item) => item.message).join("; ") || error.message,
          });
          continue;
        }
        errors.push({ baris: index + 1, message: pesanError(error) });
      }
    }

    return { total: rows.length, berhasil, dilewati, gagal: errors.length, errors: errors.slice(0, 100) };
  },

  async listWarga(query: ListWargaQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { nama_lengkap: "asc" });

    const { items, total } = await kependudukanRepository.listWarga({
      skip,
      take,
      where: {
        ...(query.no_kk ? { no_kk: query.no_kk } : {}),
        ...(query.status_aktif ? { status_aktif: query.status_aktif } : {}),
        ...(query.nama ? { nama_lengkap: { contains: query.nama, mode: "insensitive" as const } } : {}),
      },
      orderBy,
    });

    return {
      data: items.map(presentWargaRingkas),
      meta: buildMeta(page, limit, total),
    };
  },

  async listWargaTanpaAkun(query: ListWargaTanpaAkunQueryInput) {
    const { page, limit, skip, take } = resolvePagination(query);

    const { items, total } = await kependudukanRepository.listWargaTanpaAkun({
      skip,
      take,
      q: query.q,
    });

    return {
      data: items.map((warga) => ({
        nik: warga.nik,
        nama_lengkap: warga.nama_lengkap,
        no_kk: warga.no_kk,
        nomor_rumah: warga.kartu_keluarga.rumah.nomor_rumah,
        blok: warga.kartu_keluarga.rumah.blok,
      })),
      meta: buildMeta(page, limit, total),
    };
  },

  async detailWarga(nik: string) {
    const warga = await kependudukanRepository.findWargaByNik(nik);
    if (!warga) {
      throw HttpError.notFound("Warga tidak ditemukan");
    }
    return presentWarga(warga);
  },

  async updateWarga(nik: string, input: UpdateWargaInput) {
    const warga = await kependudukanRepository.findWargaByNik(nik);
    if (!warga) {
      throw HttpError.notFound("Warga tidak ditemukan");
    }
    if (input.no_kk) {
      await kependudukanService.assertKkExists(input.no_kk);
    }

    const updated = await kependudukanRepository.updateWarga(nik, {
      ...(input.no_kk ? { no_kk: input.no_kk } : {}),
      ...(input.nama_lengkap ? { nama_lengkap: input.nama_lengkap } : {}),
      ...(input.tempat_lahir ? { tempat_lahir: input.tempat_lahir } : {}),
      ...(input.tanggal_lahir ? { tanggal_lahir: parseDateOnly(input.tanggal_lahir) } : {}),
      ...(input.jenis_kelamin ? { jenis_kelamin: input.jenis_kelamin } : {}),
      ...(input.agama ? { agama: input.agama } : {}),
      ...(input.status_perkawinan ? { status_perkawinan: input.status_perkawinan } : {}),
      ...(input.pekerjaan ? { pekerjaan: input.pekerjaan } : {}),
      ...(input.no_hp !== undefined ? { no_hp: input.no_hp || null } : {}),
      ...(input.status_hubungan_keluarga
        ? { status_hubungan_keluarga: input.status_hubungan_keluarga }
        : {}),
      ...(input.status_tinggal ? { status_tinggal: input.status_tinggal } : {}),
      ...(input.status_aktif ? { status_aktif: input.status_aktif } : {}),
    });

    return presentWarga(updated);
  },

  async updateWargaStatus(nik: string, status_aktif: StatusAktif) {
    const warga = await kependudukanRepository.findWargaByNik(nik);
    if (!warga) {
      throw HttpError.notFound("Warga tidak ditemukan");
    }
    const updated = await kependudukanRepository.updateWargaStatus(nik, status_aktif);
    return { nik: updated.nik, status_aktif: updated.status_aktif };
  },

  async createMutasi(input: CreateMutasiInput) {
    const warga = await kependudukanRepository.findWargaByNik(input.nik);
    if (!warga) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "nik", message: "Warga dengan NIK tersebut tidak ditemukan" },
      ]);
    }

    const mutasi = await kependudukanRepository.createMutasi({
      nik: input.nik,
      jenis_mutasi: input.jenis_mutasi,
      tanggal_peristiwa: parseDateOnly(input.tanggal_peristiwa),
      keterangan: input.keterangan,
      berkas_pendukung: input.berkas_pendukung ?? null,
    });

    return {
      id_mutasi: mutasi.id_mutasi,
      jenis_mutasi: mutasi.jenis_mutasi,
      status_verifikasi: mutasi.status_verifikasi,
    };
  },

  async listMutasi(query: ListMutasiQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { tanggal_lapor: "desc" });

    const { items, total } = await kependudukanRepository.listMutasi({
      skip,
      take,
      where: {
        ...(query.jenis_mutasi ? { jenis_mutasi: query.jenis_mutasi } : {}),
        ...(query.status_verifikasi ? { status_verifikasi: query.status_verifikasi } : {}),
        ...(query.nik ? { nik: query.nik } : {}),
      },
      orderBy,
    });

    return {
      data: items.map((mutasi) => ({
        id_mutasi: mutasi.id_mutasi,
        nik: mutasi.nik,
        nama_lengkap: mutasi.warga.nama_lengkap,
        jenis_mutasi: mutasi.jenis_mutasi,
        tanggal_peristiwa: toDateOnly(mutasi.tanggal_peristiwa),
        tanggal_lapor: toIso(mutasi.tanggal_lapor),
        keterangan: mutasi.keterangan,
        berkas_pendukung: mutasi.berkas_pendukung,
        status_verifikasi: mutasi.status_verifikasi,
        diverifikasi_oleh: mutasi.diverifikasi_oleh,
        diverifikasi_pada: toIso(mutasi.diverifikasi_pada),
      })),
      meta: buildMeta(page, limit, total),
    };
  },

  async verifikasiMutasi(id_mutasi: number, input: VerifikasiMutasiInput, verifikatorId: number) {
    const mutasi = await kependudukanRepository.findMutasiById(id_mutasi);
    if (!mutasi) {
      throw HttpError.notFound("Mutasi tidak ditemukan");
    }
    if (mutasi.status_verifikasi !== "Menunggu_Verifikasi") {
      throw HttpError.conflict("Mutasi ini sudah diverifikasi sebelumnya");
    }

    const wargaStatus =
      input.status_verifikasi === "Terverifikasi"
        ? STATUS_AKTIF_BY_MUTASI[mutasi.jenis_mutasi]
        : undefined;

    const updated = await kependudukanRepository.applyMutasiVerification(
      id_mutasi,
      { diverifikasi_oleh: verifikatorId, status_verifikasi: input.status_verifikasi },
      wargaStatus,
    );

    return {
      id_mutasi: updated.id_mutasi,
      status_verifikasi: updated.status_verifikasi,
      diverifikasi_oleh: updated.diverifikasi_oleh,
      diverifikasi_pada: toIso(updated.diverifikasi_pada),
    };
  },
};

export type KependudukanService = typeof kependudukanService;
