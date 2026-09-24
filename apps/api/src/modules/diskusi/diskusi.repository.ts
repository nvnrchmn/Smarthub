import type { Prisma, StatusPostingan } from "@prisma/client";
import { prisma } from "../../config/database";
import { tenantCreateScope } from "../../common/tenant/tenant-context";

const buildInclude = (id_pengguna: number) =>
  ({
    penulis: {
      select: {
        id_pengguna: true,
        role: true,
        warga: { select: { nama_lengkap: true } },
      },
    },
    lampiran: { select: { url: true, tipe: true }, orderBy: { id_lampiran: "asc" } },
    reaksi: { where: { id_pengguna }, select: { id_reaksi: true } },
    mention: {
      select: {
        pengguna: {
          select: {
            id_pengguna: true,
            username: true,
            warga: { select: { nama_lengkap: true } },
          },
        },
      },
    },
    poll: {
      include: {
        opsi: { orderBy: { urutan: "asc" } },
        suara: { where: { id_pengguna }, select: { id_opsi: true } },
      },
    },
  }) satisfies Prisma.PostinganInclude;

interface CreatePostinganData {
  id_penulis: number;
  isi: string;
  id_induk?: number;
  lampiran?: string[];
  poll?: { opsi: string[]; berakhir_pada?: Date };
  mentionIds?: number[];
}

interface ListPostinganParams {
  id_pengguna: number;
  limit: number;
  cursor?: number;
  id_induk?: number;
  id_penulis?: number;
}

export const diskusiRepository = {
  create: (input: CreatePostinganData) =>
    prisma.$transaction(async (tx) => {
      const postingan = await tx.postingan.create({
        data: {
          ...tenantCreateScope(),
          id_penulis: input.id_penulis,
          isi: input.isi,
          id_induk: input.id_induk ?? null,
          ...(input.lampiran && input.lampiran.length > 0
            ? {
                lampiran: {
                  create: input.lampiran.map((url) => ({ url, tipe: "image" })),
                },
              }
            : {}),
          ...(input.poll
            ? {
                poll: {
                  create: {
                    berakhir_pada: input.poll.berakhir_pada ?? null,
                    opsi: {
                      create: input.poll.opsi.map((label, index) => ({
                        label,
                        urutan: index + 1,
                      })),
                    },
                  },
                },
              }
            : {}),
        },
        select: { id_postingan: true },
      });

      if (input.id_induk) {
        await tx.postingan.update({
          where: { id_postingan: input.id_induk },
          data: { jumlah_balasan: { increment: 1 } },
        });
      }

      if (input.mentionIds && input.mentionIds.length > 0) {
        await tx.postinganMention.createMany({
          data: input.mentionIds.map((id_pengguna) => ({
            id_postingan: postingan.id_postingan,
            id_pengguna,
          })),
          skipDuplicates: true,
        });
      }

      return postingan.id_postingan;
    }),

  replaceMentions: (id_postingan: number, ids: number[]) =>
    prisma.$transaction(async (tx) => {
      await tx.postinganMention.deleteMany({ where: { id_postingan } });

      if (ids.length > 0) {
        await tx.postinganMention.createMany({
          data: ids.map((id_pengguna) => ({ id_postingan, id_pengguna })),
          skipDuplicates: true,
        });
      }
    }),

  findById: (id_postingan: number, id_pengguna: number) =>
    prisma.postingan.findUnique({
      where: { id_postingan },
      include: buildInclude(id_pengguna),
    }),

  list: async ({ id_pengguna, limit, cursor, id_induk, id_penulis }: ListPostinganParams) => {
    const where: Prisma.PostinganWhereInput = {
      status: "Aktif",
      ...(id_induk !== undefined ? { id_induk } : { id_induk: null }),
      ...(id_penulis ? { id_penulis } : {}),
      ...(cursor ? { id_postingan: { lt: cursor } } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.postingan.findMany({
        where,
        orderBy: { id_postingan: "desc" },
        take: limit + 1,
        include: buildInclude(id_pengguna),
      }),
      prisma.postingan.count({ where }),
    ]);

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const last = page[page.length - 1];

    return {
      items: page,
      total,
      hasMore,
      nextCursor: hasMore && last ? last.id_postingan : null,
    };
  },

  updateIsi: (id_postingan: number, isi: string) =>
    prisma.postingan.update({ where: { id_postingan }, data: { isi } }),

  updateStatus: (id_postingan: number, status: StatusPostingan) =>
    prisma.postingan.update({ where: { id_postingan }, data: { status } }),

  decrementBalasan: (id_postingan: number) =>
    prisma.postingan.update({
      where: { id_postingan },
      data: { jumlah_balasan: { decrement: 1 } },
    }),

  findReaksi: (id_postingan: number, id_pengguna: number) =>
    prisma.reaksiPostingan.findUnique({
      where: { id_postingan_id_pengguna: { id_postingan, id_pengguna } },
    }),

  addReaksi: (id_postingan: number, id_pengguna: number) =>
    prisma.$transaction(async (tx) => {
      await tx.reaksiPostingan.create({ data: { id_postingan, id_pengguna } });
      const updated = await tx.postingan.update({
        where: { id_postingan },
        data: { jumlah_suka: { increment: 1 } },
        select: { jumlah_suka: true },
      });
      return updated.jumlah_suka;
    }),

  removeReaksi: (id_reaksi: number, id_postingan: number) =>
    prisma.$transaction(async (tx) => {
      await tx.reaksiPostingan.delete({ where: { id_reaksi } });
      const updated = await tx.postingan.update({
        where: { id_postingan },
        data: { jumlah_suka: { decrement: 1 } },
        select: { jumlah_suka: true },
      });
      return updated.jumlah_suka;
    }),

  findPoll: (id_poll: number) => prisma.poll.findUnique({ where: { id_poll } }),

  findOpsi: (id_opsi: number) => prisma.pollOpsi.findUnique({ where: { id_opsi } }),

  findSuara: (id_poll: number, id_pengguna: number) =>
    prisma.pollSuara.findUnique({
      where: { id_poll_id_pengguna: { id_poll, id_pengguna } },
    }),

  addSuara: (id_poll: number, id_opsi: number, id_pengguna: number) =>
    prisma.$transaction(async (tx) => {
      await tx.pollSuara.create({ data: { id_poll, id_opsi, id_pengguna } });
      await tx.pollOpsi.update({
        where: { id_opsi },
        data: { jumlah_suara: { increment: 1 } },
      });
    }),

  tutupPoll: (id_poll: number, berakhir_pada: Date) =>
    prisma.poll.update({ where: { id_poll }, data: { berakhir_pada } }),
};
