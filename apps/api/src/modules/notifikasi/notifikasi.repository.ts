import type { Prisma, TipeNotifikasi } from "@prisma/client";
import { prisma } from "../../config/database";
import { tenantCreateScope } from "../../common/tenant/tenant-context";

export interface NotifikasiInput {
  id_penerima: number;
  tipe: TipeNotifikasi;
  id_referensi?: number;
  pesan: string;
}

interface ListNotifikasiParams {
  id_penerima: number;
  skip: number;
  take: number;
  belumDibaca?: boolean;
}

export const notifikasiRepository = {
  create: (data: NotifikasiInput) =>
    prisma.notifikasi.create({
      data: {
        ...tenantCreateScope(),
        id_penerima: data.id_penerima,
        tipe: data.tipe,
        id_referensi: data.id_referensi ?? null,
        pesan: data.pesan,
      },
    }),

  createMany: (items: NotifikasiInput[]) =>
    prisma.notifikasi.createMany({
      data: items.map((item) => ({
        ...tenantCreateScope(),
        id_penerima: item.id_penerima,
        tipe: item.tipe,
        id_referensi: item.id_referensi ?? null,
        pesan: item.pesan,
      })),
    }),

  list: async ({ id_penerima, skip, take, belumDibaca }: ListNotifikasiParams) => {
    const where: Prisma.NotifikasiWhereInput = {
      id_penerima,
      ...(belumDibaca ? { dibaca_pada: null } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.notifikasi.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.notifikasi.count({ where }),
    ]);

    return { items, total };
  },

  countBelumDibaca: (id_penerima: number) =>
    prisma.notifikasi.count({ where: { id_penerima, dibaca_pada: null } }),

  tandaiDibaca: (id_notifikasi: number, id_penerima: number) =>
    prisma.notifikasi.updateMany({
      where: { id_notifikasi, id_penerima, dibaca_pada: null },
      data: { dibaca_pada: new Date() },
    }),

  tandaiSemuaDibaca: (id_penerima: number) =>
    prisma.notifikasi.updateMany({
      where: { id_penerima, dibaca_pada: null },
      data: { dibaca_pada: new Date() },
    }),

  preferensiGet: (id_pengguna: number) =>
    prisma.preferensiNotifikasi.findUnique({ where: { id_pengguna } }),

  preferensiUpsert: (
    id_pengguna: number,
    data: Prisma.PreferensiNotifikasiUncheckedUpdateInput,
    create: Prisma.PreferensiNotifikasiUncheckedCreateInput,
  ) => prisma.preferensiNotifikasi.upsert({ where: { id_pengguna }, update: data, create }),

  outboxCreate: (data: Prisma.NotificationOutboxUncheckedCreateInput) =>
    prisma.notificationOutbox.create({ data }),

  outboxCreateMany: (items: Prisma.NotificationOutboxUncheckedCreateInput[]) =>
    prisma.notificationOutbox.createMany({ data: items }),

  outboxDue: (limit: number) =>
    prisma.notificationOutbox.findMany({
      where: { status: "Menunggu", terjadwal_pada: { lte: new Date() } },
      orderBy: { terjadwal_pada: "asc" },
      take: limit,
    }),

  outboxUpdate: (id_outbox: number, data: Prisma.NotificationOutboxUncheckedUpdateInput) =>
    prisma.notificationOutbox.update({ where: { id_outbox }, data }),

  outboxCountByStatus: (status: Prisma.EnumStatusOutboxFilter["equals"]) =>
    prisma.notificationOutbox.count({ where: { status } }),

  sesiKedaluwarsaHapus: (sebelum: Date) =>
    prisma.sesiRefreshToken.deleteMany({
      where: { OR: [{ kedaluwarsa: { lt: sebelum } }, { dicabut_pada: { lt: sebelum } }] },
    }),
};
