import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

interface LedgerEntryInput {
  akun: string;
  debit: number;
  kredit: number;
}

interface ListParams<TWhere> {
  skip: number;
  take: number;
  where: TWhere;
  orderBy: Record<string, "asc" | "desc">;
}

export const billingRepository = {
  iuranFindById: (id_iuran: number) =>
    prisma.iuranRumah.findUnique({
      where: { id_iuran },
      include: { rumah: { select: { nomor_rumah: true, blok: true } } },
    }),

  akunPembayaranFindByTenant: (id_tenant: number) =>
    prisma.akunPembayaranTenant.findUnique({ where: { id_tenant } }),

  pembayaranFindByIdIuran: (id_iuran: number) =>
    prisma.pembayaranIuran.findUnique({ where: { id_iuran } }),

  pembayaranFindByReferensi: (referensi_bayar: string) =>
    prisma.pembayaranIuran.findUnique({ where: { referensi_bayar } }),

  pembayaranCreate: (data: Prisma.PembayaranIuranUncheckedCreateInput) =>
    prisma.pembayaranIuran.create({ data }),

  pembayaranUpdate: (id_pembayaran_iuran: number, data: Prisma.PembayaranIuranUncheckedUpdateInput) =>
    prisma.pembayaranIuran.update({ where: { id_pembayaran_iuran }, data }),

  iuranTandaiLunas: (id_iuran: number, tgl_bayar: Date) =>
    prisma.iuranRumah.update({
      where: { id_iuran },
      data: { status_bayar: "Lunas", tgl_bayar },
    }),

  ledgerCreate: (
    data: {
      id_tenant: number | null;
      tipe: string;
      id_referensi: number;
      keterangan: string;
    },
    entries: LedgerEntryInput[],
  ) =>
    prisma.ledgerTransaksi.create({
      data: {
        ...data,
        entries: { create: entries },
      },
      include: { entries: true },
    }),

  rekeningList: (id_tenant: number) =>
    prisma.rekeningBankTenant.findMany({ where: { id_tenant }, orderBy: [{ is_default: "desc" }, { id_rekening: "asc" }] }),

  rekeningFindById: (id_rekening: number) =>
    prisma.rekeningBankTenant.findUnique({ where: { id_rekening } }),

  rekeningCreate: (data: Prisma.RekeningBankTenantUncheckedCreateInput) =>
    prisma.rekeningBankTenant.create({ data }),

  rekeningUpdate: (id_rekening: number, data: Prisma.RekeningBankTenantUncheckedUpdateInput) =>
    prisma.rekeningBankTenant.update({ where: { id_rekening }, data }),

  rekeningDelete: (id_rekening: number) =>
    prisma.rekeningBankTenant.delete({ where: { id_rekening } }),

  rekeningResetDefault: (id_tenant: number, kecualiId: number) =>
    prisma.rekeningBankTenant.updateMany({
      where: { id_tenant, id_rekening: { not: kecualiId }, is_default: true },
      data: { is_default: false },
    }),

  pencairanList: async ({ skip, take, where, orderBy }: ListParams<Prisma.PencairanTenantWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.pencairanTenant.findMany({ where, skip, take, orderBy }),
      prisma.pencairanTenant.count({ where }),
    ]);
    return { items, total };
  },

  pencairanCreate: (data: Prisma.PencairanTenantUncheckedCreateInput) =>
    prisma.pencairanTenant.create({ data }),

  pencairanFindById: (id_pencairan: number) =>
    prisma.pencairanTenant.findUnique({ where: { id_pencairan } }),

  pencairanFindByReferensi: (referensi_payout: string) =>
    prisma.pencairanTenant.findFirst({ where: { referensi_payout } }),

  pencairanUpdate: (id_pencairan: number, data: Prisma.PencairanTenantUncheckedUpdateInput) =>
    prisma.pencairanTenant.update({ where: { id_pencairan }, data }),

  webhookFindByEventId: (event_id: string) =>
    prisma.webhookEvent.findUnique({ where: { event_id } }),

  webhookCreate: (data: { event_id: string; tipe: string; payload: Prisma.InputJsonValue }) =>
    prisma.webhookEvent.create({ data }),

  webhookTandai: (id_event: number, data: { processed_at?: Date; error?: string | null }) =>
    prisma.webhookEvent.update({ where: { id_event }, data }),

  ringkasanPembayaran: (where: Prisma.PembayaranIuranWhereInput) =>
    prisma.pembayaranIuran.aggregate({
      where,
      _count: { _all: true },
      _sum: { jumlah: true, fee_platform: true, biaya_hub: true, mdr: true, net_ke_rt: true },
    }),
};
