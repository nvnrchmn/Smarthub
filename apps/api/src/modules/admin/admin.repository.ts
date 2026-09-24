import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

interface ListParams<TWhere> {
  skip: number;
  take: number;
  where: TWhere;
  orderBy: Record<string, "asc" | "desc">;
}

const tenantInclude = {
  _count: { select: { rumah: true, akun_pengguna: true } },
  langganan: { include: { paket: true } },
} satisfies Prisma.TenantInclude;

const langgananInclude = {
  tenant: { select: { id_tenant: true, nama: true, slug: true } },
  paket: true,
} satisfies Prisma.LanggananTenantInclude;

export const adminRepository = {
  akunByEmail: (email: string) => prisma.akunPlatform.findUnique({ where: { email } }),

  akunById: (id_akun_platform: number) =>
    prisma.akunPlatform.findUnique({ where: { id_akun_platform } }),

  touchLogin: (id_akun_platform: number) =>
    prisma.akunPlatform.update({ where: { id_akun_platform }, data: { terakhir_masuk: new Date() } }),

  akunList: async ({ skip, take, where, orderBy }: ListParams<Prisma.AkunPlatformWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.akunPlatform.findMany({ where, skip, take, orderBy }),
      prisma.akunPlatform.count({ where }),
    ]);
    return { items, total };
  },

  akunCreate: (data: Prisma.AkunPlatformUncheckedCreateInput) => prisma.akunPlatform.create({ data }),

  akunUpdate: (id_akun_platform: number, data: Prisma.AkunPlatformUncheckedUpdateInput) =>
    prisma.akunPlatform.update({ where: { id_akun_platform }, data }),

  tenantKetua: (id_tenant: number) =>
    prisma.akunPengguna.findFirst({
      where: { id_tenant, role: "Ketua_RT", status_akun: "Aktif" },
      orderBy: { id_pengguna: "asc" },
    }),

  tenantList: async ({ skip, take, where, orderBy }: ListParams<Prisma.TenantWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.tenant.findMany({ where, skip, take, orderBy, include: tenantInclude }),
      prisma.tenant.count({ where }),
    ]);
    return { items, total };
  },

  tenantFindById: (id_tenant: number) =>
    prisma.tenant.findUnique({ where: { id_tenant }, include: tenantInclude }),

  tenantUpdateStatus: (id_tenant: number, status: Prisma.TenantUpdateInput["status"]) =>
    prisma.tenant.update({ where: { id_tenant }, data: { status } }),

  langgananList: async ({
    skip,
    take,
    where,
    orderBy,
  }: ListParams<Prisma.LanggananTenantWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.langgananTenant.findMany({ where, skip, take, orderBy, include: langgananInclude }),
      prisma.langgananTenant.count({ where }),
    ]);
    return { items, total };
  },

  webhookList: async ({ skip, take, where, orderBy }: ListParams<Prisma.WebhookEventWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.webhookEvent.findMany({ where, skip, take, orderBy }),
      prisma.webhookEvent.count({ where }),
    ]);
    return { items, total };
  },

  auditList: async ({ skip, take, where, orderBy }: ListParams<Prisma.AuditLogWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, skip, take, orderBy }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, total };
  },

  auditCreate: (data: Prisma.AuditLogUncheckedCreateInput) => prisma.auditLog.create({ data }),

  paketList: () => prisma.paketLangganan.findMany({ orderBy: { harga_bulanan: "asc" } }),

  paketFindByKode: (kode: string) => prisma.paketLangganan.findUnique({ where: { kode } }),

  paketUpdate: (kode: string, data: Prisma.PaketLanggananUncheckedUpdateInput) =>
    prisma.paketLangganan.update({ where: { kode }, data }),

  metrikPembayaran: () =>
    prisma.pembayaranIuran.aggregate({
      where: { status: "PAID" },
      _count: { _all: true },
      _sum: { jumlah: true, fee_platform: true, net_ke_rt: true },
    }),

  metrikLangganan: () =>
    prisma.langgananTenant.findMany({
      where: { status: "Aktif" },
      include: { paket: { select: { harga_bulanan: true } } },
    }),

  metrikTenantCreatedAt: () =>
    prisma.tenant.findMany({ select: { createdAt: true, status: true } }),

  pembayaranPaid: () =>
    prisma.pembayaranIuran.findMany({
      where: { status: "PAID" },
      select: { id_pembayaran_iuran: true, id_tenant: true, jumlah: true, paid_at: true },
      orderBy: { id_pembayaran_iuran: "asc" },
    }),

  ledgerReferensiQris: () =>
    prisma.ledgerTransaksi.findMany({
      where: { tipe: "IURAN_QRIS" },
      select: { id_referensi: true },
    }),

  akunPlatformAktif: () =>
    prisma.akunPlatform.findMany({
      where: { status_akun: "Aktif" },
      select: { id_akun_platform: true, email: true, role: true },
    }),

  alertWebhook: () =>
    prisma.webhookEvent.findMany({
      where: { processed_at: null },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),

  alertWebhookGagal: (sejak: Date) =>
    prisma.webhookEvent.findMany({
      where: { error: { not: null }, createdAt: { gte: sejak } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

  alertPayoutGagal: (sejak: Date) =>
    prisma.pencairanTenant.findMany({
      where: { status: "GAGAL", updatedAt: { gte: sejak } },
      include: { tenant: { select: { id_tenant: true, nama: true, slug: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),

  alertLangganan: (sampai: Date) =>
    prisma.langgananTenant.findMany({
      where: {
        status: { in: ["Trial", "Aktif", "Menunggak"] },
        berakhir: { lte: sampai },
      },
      include: { tenant: { select: { id_tenant: true, nama: true, slug: true } }, paket: true },
      orderBy: { berakhir: "asc" },
      take: 20,
    }),

  alertInvoice: () =>
    prisma.invoiceLangganan.findMany({
      where: { status: { in: ["Belum_Bayar", "Menunggu_Konfirmasi"] } },
      include: { tenant: { select: { id_tenant: true, nama: true, slug: true } }, paket: true },
      orderBy: { jatuh_tempo: "asc" },
      take: 20,
    }),

  ringkasan: async () => {
    const [tenantPerStatus, langgananPerStatus, pembayaran, webhookGagal] = await Promise.all([
      prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.langgananTenant.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.pembayaranIuran.aggregate({
        where: { status: "PAID" },
        _count: { _all: true },
        _sum: { jumlah: true, fee_platform: true, net_ke_rt: true },
      }),
      prisma.webhookEvent.count({ where: { processed_at: null } }),
    ]);

    return { tenantPerStatus, langgananPerStatus, pembayaran, webhookGagal };
  },
};
