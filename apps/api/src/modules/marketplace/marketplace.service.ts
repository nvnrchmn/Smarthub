import type { Prisma } from "@prisma/client";
import type { Role } from "@smarthub/shared";
import { buildWhatsAppLink } from "@smarthub/shared";
import type {
  CreateKategoriProdukInput,
  CreateLaporanInput,
  CreateProdukInput,
  ListLaporanQueryInput,
  ListProdukQueryInput,
  ModerasiProdukInput,
  UpdateKategoriProdukInput,
  UpdateLaporanInput,
  UpdateProdukInput,
} from "@smarthub/shared";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolvePagination } from "../../common/utils/pagination";
import { toIso, toMoney } from "../../common/utils/serialize";
import { marketplaceRepository } from "./marketplace.repository";

export interface Viewer {
  id_pengguna: number;
  role: Role;
}

interface ProdukRecord {
  id_produk: number;
  id_penjual: number;
  id_kategori_produk: number | null;
  judul: string;
  deskripsi: string;
  harga: { toString(): string };
  kondisi: string;
  satuan: string;
  bisa_nego: boolean;
  tampilkan_kontak: boolean;
  status: string;
  jumlah_dilihat: number;
  createdAt: Date;
  updatedAt: Date;
  penjual: {
    id_pengguna: number;
    role: string;
    warga: { nama_lengkap: string | null; no_hp: string | null } | null;
  };
  kategori: { id_kategori_produk: number; nama: string; slug: string } | null;
  foto: { url: string; urutan: number }[];
  favorit: { id_favorit: number }[];
  _count: { laporan: number };
}

interface LaporanRecord {
  id_laporan: number;
  id_produk: number;
  id_pelapor: number;
  alasan: string;
  keterangan: string | null;
  status: string;
  ditangani_oleh: number | null;
  ditangani_pada: Date | null;
  createdAt: Date;
  produk: { id_produk: number; judul: string; status: string };
  pelapor: { id_pengguna: number; role: string; warga: { nama_lengkap: string | null } | null };
}

const PENGURUS: Role[] = ["Ketua_RT", "Sekretaris"];

const isPengurus = (role: Role): boolean => PENGURUS.includes(role);

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug.length > 0 ? slug : `kategori-${Date.now()}`;
};

const orderByFor = (urut: string): Prisma.ProdukOrderByWithRelationInput[] => {
  if (urut === "termurah") return [{ harga: "asc" }, { id_produk: "desc" }];
  if (urut === "termahal") return [{ harga: "desc" }, { id_produk: "desc" }];
  return [{ createdAt: "desc" }, { id_produk: "desc" }];
};

const presentProduk = (record: ProdukRecord, viewer: Viewer) => {
  const pemilik = record.id_penjual === viewer.id_pengguna;
  const pengurus = isPengurus(viewer.role);
  const nomorHp = record.penjual.warga?.no_hp ?? null;

  return {
    id_produk: record.id_produk,
    judul: record.judul,
    deskripsi: record.deskripsi,
    harga: toMoney(record.harga),
    kondisi: record.kondisi,
    satuan: record.satuan,
    bisa_nego: record.bisa_nego,
    status: record.status,
    jumlah_dilihat: record.jumlah_dilihat,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    id_kategori_produk: record.id_kategori_produk,
    nama_kategori: record.kategori?.nama ?? null,
    penjual: {
      id_pengguna: record.penjual.id_pengguna,
      nama_lengkap: record.penjual.warga?.nama_lengkap ?? null,
      role: record.penjual.role,
      tampilkan_kontak: record.tampilkan_kontak,
      kontak_wa:
        record.tampilkan_kontak && nomorHp
          ? buildWhatsAppLink(
              nomorHp,
              `Halo, saya tertarik dengan "${record.judul}" di Marketplace SmartHub.`,
            )
          : null,
    },
    foto: record.foto.map((item) => item.url),
    difavoritkan: record.favorit.length > 0,
    bisa_diedit: pemilik && record.status !== "Dihapus",
    bisa_dihapus: (pemilik || pengurus) && record.status !== "Dihapus",
    bisa_dimoderasi: pengurus,
    jumlah_laporan_baru: pengurus ? record._count.laporan : null,
  };
};

const presentLaporan = (record: LaporanRecord) => ({
  id_laporan: record.id_laporan,
  id_produk: record.id_produk,
  judul_produk: record.produk.judul,
  status_produk: record.produk.status,
  alasan: record.alasan,
  keterangan: record.keterangan,
  status: record.status,
  createdAt: toIso(record.createdAt),
  ditangani_oleh: record.ditangani_oleh,
  ditangani_pada: toIso(record.ditangani_pada),
  pelapor: {
    id_pengguna: record.pelapor.id_pengguna,
    nama_lengkap: record.pelapor.warga?.nama_lengkap ?? null,
    role: record.pelapor.role,
  },
});

const assertProdukAktif = (record: ProdukRecord, viewer: Viewer): void => {
  if (record.status === "Aktif" || record.status === "Terjual") return;
  const bolehLihat = record.id_penjual === viewer.id_pengguna || isPengurus(viewer.role);
  if (!bolehLihat) {
    throw HttpError.notFound("Produk tidak ditemukan");
  }
};

export const marketplaceService = {
  async listKategori(viewer: Viewer) {
    const kategori = await marketplaceRepository.listKategori(!isPengurus(viewer.role));
    return kategori;
  },

  async createKategori(input: CreateKategoriProdukInput) {
    const dasar = input.slug ?? slugify(input.nama);
    let slug = dasar;
    let urutan = 2;

    while (await marketplaceRepository.findKategoriBySlug(slug)) {
      slug = `${dasar}-${urutan}`;
      urutan += 1;
    }

    return marketplaceRepository.createKategori({
      nama: input.nama,
      slug,
      aktif: input.aktif,
    });
  },

  async updateKategori(id_kategori_produk: number, input: UpdateKategoriProdukInput) {
    const kategori = await marketplaceRepository.findKategoriById(id_kategori_produk);
    if (!kategori) {
      throw HttpError.notFound("Kategori tidak ditemukan");
    }

    let slug: string | undefined;
    if (input.slug && input.slug !== kategori.slug) {
      const bentrok = await marketplaceRepository.findKategoriBySlug(input.slug);
      if (bentrok) {
        throw HttpError.conflict("Slug kategori sudah dipakai");
      }
      slug = input.slug;
    }

    return marketplaceRepository.updateKategori(id_kategori_produk, {
      ...(input.nama ? { nama: input.nama } : {}),
      ...(slug ? { slug } : {}),
      ...(input.aktif !== undefined ? { aktif: input.aktif } : {}),
    });
  },

  async createProduk(input: CreateProdukInput, viewer: Viewer) {
    if (input.id_kategori_produk) {
      const kategori = await marketplaceRepository.findKategoriById(input.id_kategori_produk);
      if (!kategori || !kategori.aktif) {
        throw HttpError.unprocessable("Validasi gagal", [
          { field: "id_kategori_produk", message: "Kategori tidak ditemukan atau tidak aktif" },
        ]);
      }
    }

    const { id_produk } = await marketplaceRepository.createProduk({
      id_penjual: viewer.id_pengguna,
      judul: input.judul,
      deskripsi: input.deskripsi,
      harga: input.harga,
      kondisi: input.kondisi,
      satuan: input.satuan,
      bisa_nego: input.bisa_nego,
      tampilkan_kontak: input.tampilkan_kontak,
      ...(input.id_kategori_produk ? { id_kategori_produk: input.id_kategori_produk } : {}),
      ...(input.foto ? { foto: input.foto } : {}),
    });

    const created = await marketplaceRepository.findProdukById(id_produk, viewer.id_pengguna);
    return presentProduk(created as ProdukRecord, viewer);
  },

  async listProduk(query: ListProdukQueryInput, viewer: Viewer) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ProdukWhereInput = {
      status: "Aktif",
      ...(query.id_kategori_produk ? { id_kategori_produk: query.id_kategori_produk } : {}),
      ...(query.kondisi ? { kondisi: query.kondisi } : {}),
      ...(query.penjual ? { id_penjual: query.penjual } : {}),
      ...(query.q
        ? {
            OR: [
              { judul: { contains: query.q, mode: "insensitive" as const } },
              { deskripsi: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(query.harga_min !== undefined || query.harga_max !== undefined
        ? {
            harga: {
              ...(query.harga_min !== undefined ? { gte: query.harga_min } : {}),
              ...(query.harga_max !== undefined ? { lte: query.harga_max } : {}),
            },
          }
        : {}),
    };

    const { items, total } = await marketplaceRepository.listProduk({
      id_pengguna: viewer.id_pengguna,
      skip,
      take,
      where,
      orderBy: orderByFor(query.urut),
    });

    return { data: items.map((item) => presentProduk(item, viewer)), meta: buildMeta(page, limit, total) };
  },

  async detailProduk(id_produk: number, viewer: Viewer) {
    const record = await marketplaceRepository.findProdukById(id_produk, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Produk tidak ditemukan");
    }
    assertProdukAktif(record as ProdukRecord, viewer);

    const jumlah_dilihat = await marketplaceRepository.incrementDilihat(id_produk);

    return presentProduk({ ...(record as ProdukRecord), jumlah_dilihat: jumlah_dilihat.jumlah_dilihat }, viewer);
  },

  async produkSaya(viewer: Viewer) {
    const items = await marketplaceRepository.listProdukPenjual(
      viewer.id_pengguna,
      viewer.id_pengguna,
    );
    return items.map((item) => presentProduk(item, viewer));
  },

  async updateProduk(id_produk: number, input: UpdateProdukInput, viewer: Viewer) {
    const record = await marketplaceRepository.findProdukById(id_produk, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Produk tidak ditemukan");
    }
    if (record.id_penjual !== viewer.id_pengguna) {
      throw HttpError.forbidden("Hanya penjual yang dapat mengubah produk ini");
    }
    if (record.status === "Dihapus") {
      throw HttpError.conflict("Produk sudah dihapus");
    }

    if (input.id_kategori_produk) {
      const kategori = await marketplaceRepository.findKategoriById(input.id_kategori_produk);
      if (!kategori || !kategori.aktif) {
        throw HttpError.unprocessable("Validasi gagal", [
          { field: "id_kategori_produk", message: "Kategori tidak ditemukan atau tidak aktif" },
        ]);
      }
    }

    await marketplaceRepository.updateProduk(
      id_produk,
      {
        ...(input.judul ? { judul: input.judul } : {}),
        ...(input.deskripsi ? { deskripsi: input.deskripsi } : {}),
        ...(input.harga !== undefined ? { harga: input.harga } : {}),
        ...(input.kondisi ? { kondisi: input.kondisi } : {}),
        ...(input.satuan ? { satuan: input.satuan } : {}),
        ...(input.bisa_nego !== undefined ? { bisa_nego: input.bisa_nego } : {}),
        ...(input.tampilkan_kontak !== undefined
          ? { tampilkan_kontak: input.tampilkan_kontak }
          : {}),
        ...(input.id_kategori_produk !== undefined
          ? { id_kategori_produk: input.id_kategori_produk }
          : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      input.foto,
    );

    const updated = await marketplaceRepository.findProdukById(id_produk, viewer.id_pengguna);
    return presentProduk(updated as ProdukRecord, viewer);
  },

  async removeProduk(id_produk: number, viewer: Viewer) {
    const record = await marketplaceRepository.findProdukById(id_produk, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Produk tidak ditemukan");
    }
    if (record.id_penjual !== viewer.id_pengguna && !isPengurus(viewer.role)) {
      throw HttpError.forbidden("Anda tidak berhak menghapus produk ini");
    }
    if (record.status === "Dihapus") {
      throw HttpError.conflict("Produk sudah dihapus");
    }

    await marketplaceRepository.updateStatusProduk(id_produk, "Dihapus");
    return { id_produk, status: "Dihapus" };
  },

  async moderasiProduk(id_produk: number, input: ModerasiProdukInput) {
    const record = await marketplaceRepository.findProdukById(id_produk, 0);
    if (!record) {
      throw HttpError.notFound("Produk tidak ditemukan");
    }
    if (record.status === "Dihapus") {
      throw HttpError.conflict("Produk sudah dihapus dan tidak dapat dimoderasi");
    }

    const updated = await marketplaceRepository.updateStatusProduk(id_produk, input.status);
    return { id_produk: updated.id_produk, status: updated.status };
  },

  async toggleFavorit(id_produk: number, viewer: Viewer) {
    const record = await marketplaceRepository.findProdukById(id_produk, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Produk tidak ditemukan");
    }
    if (record.status !== "Aktif") {
      throw HttpError.conflict("Hanya produk aktif yang dapat difavoritkan");
    }

    const existing = await marketplaceRepository.findFavorit(id_produk, viewer.id_pengguna);
    if (existing) {
      await marketplaceRepository.removeFavorit(existing.id_favorit);
      return { id_produk, difavoritkan: false };
    }

    await marketplaceRepository.addFavorit(id_produk, viewer.id_pengguna);
    return { id_produk, difavoritkan: true };
  },

  async favoritSaya(viewer: Viewer) {
    const items = await marketplaceRepository.listFavorit(viewer.id_pengguna);
    return items.map((item) => presentProduk(item.produk as ProdukRecord, viewer));
  },

  async createLaporan(input: CreateLaporanInput, viewer: Viewer) {
    const record = await marketplaceRepository.findProdukById(input.id_produk, viewer.id_pengguna);
    if (!record) {
      throw HttpError.notFound("Produk tidak ditemukan");
    }
    if (record.id_penjual === viewer.id_pengguna) {
      throw HttpError.badRequest("Anda tidak dapat melaporkan produk milik sendiri");
    }

    const existing = await marketplaceRepository.findLaporanBaru(input.id_produk, viewer.id_pengguna);
    if (existing) {
      throw HttpError.conflict("Anda sudah melaporkan produk ini dan laporan masih diproses");
    }

    const laporan = await marketplaceRepository.createLaporan({
      id_produk: input.id_produk,
      id_pelapor: viewer.id_pengguna,
      alasan: input.alasan,
      keterangan: input.keterangan ?? null,
    });

    return { id_laporan: laporan.id_laporan, status: laporan.status };
  },

  async listLaporan(query: ListLaporanQueryInput) {
    const { page, limit, skip, take } = resolvePagination(query);

    const { items, total } = await marketplaceRepository.listLaporan({
      skip,
      take,
      where: { ...(query.status ? { status: query.status } : {}) },
    });

    return {
      data: items.map((item) => presentLaporan(item as LaporanRecord)),
      meta: buildMeta(page, limit, total),
    };
  },

  async updateLaporan(id_laporan: number, input: UpdateLaporanInput, viewer: Viewer) {
    const laporan = await marketplaceRepository.findLaporanById(id_laporan);
    if (!laporan) {
      throw HttpError.notFound("Laporan tidak ditemukan");
    }
    if (laporan.status !== "Baru") {
      throw HttpError.conflict("Laporan ini sudah ditangani sebelumnya");
    }

    const updated = await marketplaceRepository.updateLaporan(id_laporan, {
      status: input.status,
      ditangani_oleh: viewer.id_pengguna,
      ditangani_pada: new Date(),
    });

    return {
      id_laporan: updated.id_laporan,
      status: updated.status,
      ditangani_oleh: updated.ditangani_oleh,
      ditangani_pada: toIso(updated.ditangani_pada),
    };
  },
};

export type MarketplaceService = typeof marketplaceService;
