import type { Prisma, StatusBayar } from "@prisma/client";
import { prisma } from "../../config/database";

const invoiceInclude = {
  paket: true,
  langganan: { include: { paket: true } },
  pembayaran: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.InvoiceLanggananInclude;

export type InvoiceLanggananWithRelations = Prisma.InvoiceLanggananGetPayload<{
  include: typeof invoiceInclude;
}>;

export type LanggananWithPaket = Prisma.LanggananTenantGetPayload<{
  include: { paket: true };
}>;

interface ListInvoiceParams {
  skip: number;
  take: number;
  status_bayar?: StatusBayar;
  orderBy: Record<string, "asc" | "desc">;
}

export const langgananRepository = {
  listPaket: () =>
    prisma.paketLangganan.findMany({
      where: { aktif: true },
      orderBy: { harga_bulanan: "asc" },
    }),

  paketByKode: (kode: string) =>
    prisma.paketLangganan.findUnique({ where: { kode } }),

  langgananByTenant: (id_tenant: number) =>
    prisma.langgananTenant.findUnique({
      where: { id_tenant },
      include: { paket: true },
    }),

  upsertLangganan: (
    id_tenant: number,
    update: Prisma.LanggananTenantUncheckedUpdateInput,
    create: Prisma.LanggananTenantUncheckedCreateInput,
  ) =>
    prisma.langgananTenant.upsert({
      where: { id_tenant },
      update,
      create,
      include: { paket: true },
    }),

  invoiceCreate: (data: Prisma.InvoiceLanggananUncheckedCreateInput) =>
    prisma.invoiceLangganan.create({ data, include: invoiceInclude }),

  invoiceFindById: (id_invoice: number) =>
    prisma.invoiceLangganan.findUnique({ where: { id_invoice }, include: invoiceInclude }),

  invoiceFindFirstOpen: (id_tenant: number) =>
    prisma.invoiceLangganan.findFirst({
      where: { id_tenant, status: { not: "Lunas" } },
      orderBy: { createdAt: "desc" },
      include: invoiceInclude,
    }),

  invoiceList: async ({ skip, take, status_bayar, orderBy }: ListInvoiceParams) => {
    const where: Prisma.InvoiceLanggananWhereInput = {
      ...(status_bayar ? { status: status_bayar } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.invoiceLangganan.findMany({ where, skip, take, orderBy, include: invoiceInclude }),
      prisma.invoiceLangganan.count({ where }),
    ]);
    return { items, total };
  },

  invoiceUpdate: (id_invoice: number, data: Prisma.InvoiceLanggananUncheckedUpdateInput) =>
    prisma.invoiceLangganan.update({ where: { id_invoice }, data, include: invoiceInclude }),

  pembayaranCreate: (data: Prisma.PembayaranLanggananUncheckedCreateInput) =>
    prisma.pembayaranLangganan.create({ data }),

  pembayaranUpdate: (id_pembayaran: number, data: Prisma.PembayaranLanggananUncheckedUpdateInput) =>
    prisma.pembayaranLangganan.update({ where: { id_pembayaran }, data }),

  countRumah: () => prisma.rumah.count(),
};
