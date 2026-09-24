import type { Role } from "@smarthub/shared";
import { extractMentionUsernames } from "@smarthub/shared";
import type {
  CreatePostinganInput,
  ListMentionQueryInput,
  ListPostinganQueryInput,
  ModerasiPostinganInput,
  UpdatePostinganInput,
  VotePollInput,
} from "@smarthub/shared";
import { HttpError } from "../../common/utils/http-error";
import { toDateOnly, toIso } from "../../common/utils/serialize";
import { authService } from "../auth/auth.service";
import { notifikasiService } from "../notifikasi/notifikasi.service";
import { diskusiRepository } from "./diskusi.repository";

export interface Viewer {
  id_pengguna: number;
  role: Role;
}

interface PostinganRecord {
  id_postingan: number;
  id_penulis: number;
  id_induk: number | null;
  isi: string;
  status: string;
  jumlah_suka: number;
  jumlah_balasan: number;
  createdAt: Date;
  updatedAt: Date;
  penulis: {
    id_pengguna: number;
    role: string;
    warga: { nama_lengkap: string | null } | null;
  };
  lampiran: { url: string; tipe: string }[];
  reaksi: { id_reaksi: number }[];
  mention: {
    pengguna: {
      id_pengguna: number;
      username: string | null;
      warga: { nama_lengkap: string | null } | null;
    };
  }[];
  poll: {
    id_poll: number;
    berakhir_pada: Date | null;
    opsi: { id_opsi: number; label: string; urutan: number; jumlah_suara: number }[];
    suara: { id_opsi: number }[];
  } | null;
}

const PENGURUS: Role[] = ["Ketua_RT", "Sekretaris"];

const isPengurus = (role: Role): boolean => PENGURUS.includes(role);

interface NotifikasiDraft {
  id_penerima: number;
  tipe: "Mention" | "Balasan";
  id_referensi: number;
  pesan: string;
}

const resolveMention = async (isi: string, idPenulis: number) => {
  const usernames = extractMentionUsernames(isi);
  if (usernames.length === 0) return [];

  const hasil = await authService.resolveUsernames(usernames);
  return hasil.filter((item) => item.id_pengguna !== idPenulis);
};

const present = (record: PostinganRecord, viewer: Viewer) => {
  const poll = record.poll
    ? (() => {
        const total = record.poll.opsi.reduce((sum, opsi) => sum + opsi.jumlah_suara, 0);
        const sudahBerakhir =
          record.poll.berakhir_pada !== null && record.poll.berakhir_pada.getTime() <= Date.now();
        const pilihanSaya = record.poll.suara[0]?.id_opsi ?? null;

        return {
          id_poll: record.poll.id_poll,
          berakhir_pada: toDateOnly(record.poll.berakhir_pada),
          sudah_berakhir: sudahBerakhir,
          total_suara: total,
          sudah_vote: pilihanSaya !== null,
          pilihan_saya: pilihanSaya,
          opsi: record.poll.opsi.map((opsi) => ({
            id_opsi: opsi.id_opsi,
            label: opsi.label,
            jumlah_suara: opsi.jumlah_suara,
            persen: total > 0 ? Math.round((opsi.jumlah_suara / total) * 100) : 0,
          })),
        };
      })()
    : null;

  return {
    id_postingan: record.id_postingan,
    id_induk: record.id_induk,
    isi: record.isi,
    status: record.status,
    jumlah_suka: record.jumlah_suka,
    jumlah_balasan: record.jumlah_balasan,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    penulis: {
      id_pengguna: record.penulis.id_pengguna,
      role: record.penulis.role,
      nama_lengkap: record.penulis.warga?.nama_lengkap ?? null,
    },
    lampiran: record.lampiran.map((lampiran) => lampiran.url),
    disukai_saya: record.reaksi.length > 0,
    mention: record.mention
      .filter((item) => item.pengguna.username !== null)
      .map((item) => ({
        id_pengguna: item.pengguna.id_pengguna,
        username: item.pengguna.username as string,
        nama_lengkap: item.pengguna.warga?.nama_lengkap ?? null,
      })),
    poll,
    bisa_diedit: record.id_penulis === viewer.id_pengguna && record.status === "Aktif",
    bisa_dihapus:
      (record.id_penulis === viewer.id_pengguna || isPengurus(viewer.role)) &&
      record.status !== "Dihapus",
    bisa_dimoderasi: isPengurus(viewer.role),
  };
};

const assertVisible = (record: PostinganRecord, viewer: Viewer): void => {
  if (record.status === "Aktif") return;
  const bolehLihat = record.id_penulis === viewer.id_pengguna || isPengurus(viewer.role);
  if (!bolehLihat) {
    throw HttpError.notFound("Postingan tidak ditemukan");
  }
};

export const diskusiService = {
  async create(input: CreatePostinganInput, viewer: Viewer) {
    let induk: PostinganRecord | null = null;

    if (input.id_induk !== undefined) {
      const ditemukan = await diskusiRepository.findById(input.id_induk, viewer.id_pengguna);
      if (!ditemukan) {
        throw HttpError.unprocessable("Validasi gagal", [
          { field: "id_induk", message: "Postingan induk tidak ditemukan" },
        ]);
      }
      if (ditemukan.status !== "Aktif") {
        throw HttpError.unprocessable("Validasi gagal", [
          { field: "id_induk", message: "Postingan induk sudah tidak aktif" },
        ]);
      }
      if (ditemukan.id_induk !== null) {
        throw HttpError.unprocessable("Validasi gagal", [
          { field: "id_induk", message: "Balasan hanya dapat dibuat pada postingan utama" },
        ]);
      }
      induk = ditemukan as PostinganRecord;
    }

    const disebut = await resolveMention(input.isi, viewer.id_pengguna);

    const id_postingan = await diskusiRepository.create({
      id_penulis: viewer.id_pengguna,
      isi: input.isi,
      ...(input.id_induk !== undefined ? { id_induk: input.id_induk } : {}),
      ...(input.lampiran ? { lampiran: input.lampiran } : {}),
      ...(input.poll
        ? {
            poll: {
              opsi: input.poll.opsi,
              ...(input.poll.berakhir_pada
                ? { berakhir_pada: new Date(`${input.poll.berakhir_pada}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
      ...(disebut.length > 0 ? { mentionIds: disebut.map((item) => item.id_pengguna) } : {}),
    });

    const created = await diskusiRepository.findById(id_postingan, viewer.id_pengguna);
    if (!created) {
      throw HttpError.notFound("Postingan tidak ditemukan");
    }

    const namaPenulis = created.penulis.warga?.nama_lengkap ?? "Seorang warga";
    const draf = new Map<number, NotifikasiDraft>();

    for (const orang of disebut) {
      draf.set(orang.id_pengguna, {
        id_penerima: orang.id_pengguna,
        tipe: "Mention",
        id_referensi: id_postingan,
        pesan: `${namaPenulis} menyebut Anda di Diskusi Warga.`,
      });
    }

    if (induk && induk.id_penulis !== viewer.id_pengguna && !draf.has(induk.id_penulis)) {
      draf.set(induk.id_penulis, {
        id_penerima: induk.id_penulis,
        tipe: "Balasan",
        id_referensi: id_postingan,
        pesan: `${namaPenulis} membalas postingan Anda di Diskusi Warga.`,
      });
    }

    await notifikasiService.kirimBanyak(Array.from(draf.values()));

    return present(created, viewer);
  },

  async cariMention(query: ListMentionQueryInput, viewer: Viewer) {
    return authService.cariPenggunaRingkas(query.q, query.limit, viewer.id_pengguna);
  },

  async list(query: ListPostinganQueryInput, viewer: Viewer) {
    const { items, total, hasMore, nextCursor } = await diskusiRepository.list({
      id_pengguna: viewer.id_pengguna,
      limit: query.limit,
      ...(query.cursor !== undefined ? { cursor: query.cursor } : {}),
      ...(query.id_induk !== undefined ? { id_induk: query.id_induk } : {}),
      ...(query.id_penulis !== undefined ? { id_penulis: query.id_penulis } : {}),
    });

    return {
      data: items.map((item) => present(item, viewer)),
      meta: {
        limit: query.limit,
        total,
        next_cursor: nextCursor,
        has_more: hasMore,
      },
    };
  },

  async detail(id_postingan: number, viewer: Viewer) {
    const record = await diskusiRepository.findById(id_postingan, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Postingan tidak ditemukan");
    }
    assertVisible(record, viewer);
    return present(record, viewer);
  },

  async update(id_postingan: number, input: UpdatePostinganInput, viewer: Viewer) {
    const record = await diskusiRepository.findById(id_postingan, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Postingan tidak ditemukan");
    }
    if (record.id_penulis !== viewer.id_pengguna) {
      throw HttpError.forbidden("Hanya penulis yang dapat mengubah postingan ini");
    }
    if (record.status !== "Aktif") {
      throw HttpError.conflict("Postingan yang tidak aktif tidak dapat diubah");
    }

    await diskusiRepository.updateIsi(id_postingan, input.isi);

    const disebut = await resolveMention(input.isi, viewer.id_pengguna);
    await diskusiRepository.replaceMentions(
      id_postingan,
      disebut.map((item) => item.id_pengguna),
    );

    const updated = await diskusiRepository.findById(id_postingan, viewer.id_pengguna);
    return present(updated as PostinganRecord, viewer);
  },

  async remove(id_postingan: number, viewer: Viewer) {
    const record = await diskusiRepository.findById(id_postingan, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Postingan tidak ditemukan");
    }
    if (record.id_penulis !== viewer.id_pengguna && !isPengurus(viewer.role)) {
      throw HttpError.forbidden("Anda tidak berhak menghapus postingan ini");
    }
    if (record.status === "Dihapus") {
      throw HttpError.conflict("Postingan sudah dihapus");
    }

    await diskusiRepository.updateStatus(id_postingan, "Dihapus");
    if (record.id_induk !== null) {
      await diskusiRepository.decrementBalasan(record.id_induk);
    }

    return { id_postingan, status: "Dihapus" };
  },

  async moderasi(id_postingan: number, input: ModerasiPostinganInput, viewer: Viewer) {
    const record = await diskusiRepository.findById(id_postingan, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Postingan tidak ditemukan");
    }
    if (record.status === "Dihapus") {
      throw HttpError.conflict("Postingan sudah dihapus dan tidak dapat dimoderasi");
    }

    const updated = await diskusiRepository.updateStatus(id_postingan, input.status);
    return { id_postingan: updated.id_postingan, status: updated.status };
  },

  async toggleReaksi(id_postingan: number, viewer: Viewer) {
    const record = await diskusiRepository.findById(id_postingan, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Postingan tidak ditemukan");
    }
    if (record.status !== "Aktif") {
      throw HttpError.conflict("Postingan tidak aktif");
    }

    const existing = await diskusiRepository.findReaksi(id_postingan, viewer.id_pengguna);
    const jumlah_suka = existing
      ? await diskusiRepository.removeReaksi(existing.id_reaksi, id_postingan)
      : await diskusiRepository.addReaksi(id_postingan, viewer.id_pengguna);

    return {
      id_postingan,
      disukai_saya: !existing,
      jumlah_suka: Math.max(0, jumlah_suka),
    };
  },

  async vote(id_poll: number, input: VotePollInput, viewer: Viewer) {
    const poll = await diskusiRepository.findPoll(id_poll);
    if (!poll) {
      throw HttpError.notFound("Poll tidak ditemukan");
    }

    const postingan = await diskusiRepository.findById(poll.id_postingan, viewer.id_pengguna);
    if (!postingan) {
      throw HttpError.notFound("Postingan tidak ditemukan");
    }
    if (postingan.status !== "Aktif") {
      throw HttpError.conflict("Poll pada postingan yang tidak aktif tidak dapat dipilih");
    }
    if (poll.berakhir_pada !== null && poll.berakhir_pada.getTime() <= Date.now()) {
      throw HttpError.conflict("Poll sudah ditutup");
    }

    const opsi = await diskusiRepository.findOpsi(input.id_opsi);
    if (!opsi || opsi.id_poll !== id_poll) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "id_opsi", message: "Opsi tidak sesuai dengan poll ini" },
      ]);
    }

    const existing = await diskusiRepository.findSuara(id_poll, viewer.id_pengguna);
    if (existing) {
      throw HttpError.conflict("Anda sudah memberikan suara pada poll ini");
    }

    await diskusiRepository.addSuara(id_poll, input.id_opsi, viewer.id_pengguna);
    const updated = await diskusiRepository.findById(poll.id_postingan, viewer.id_pengguna);
    return present(updated as PostinganRecord, viewer);
  },

  async tutupPoll(id_poll: number, viewer: Viewer) {
    const poll = await diskusiRepository.findPoll(id_poll);
    if (!poll) {
      throw HttpError.notFound("Poll tidak ditemukan");
    }

    const postingan = await diskusiRepository.findById(poll.id_postingan, viewer.id_pengguna);
    if (!postingan) {
      throw HttpError.notFound("Postingan tidak ditemukan");
    }
    if (postingan.id_penulis !== viewer.id_pengguna && !isPengurus(viewer.role)) {
      throw HttpError.forbidden("Hanya pembuat poll atau pengurus yang dapat menutup poll");
    }

    await diskusiRepository.tutupPoll(id_poll, new Date());
    return { id_poll, ditutup: true };
  },
};

export type DiskusiService = typeof diskusiService;
