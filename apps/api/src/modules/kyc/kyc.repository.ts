import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

export const kycRepository = {
  akunFindByTenant: (id_tenant: number) =>
    prisma.akunPembayaranTenant.findUnique({ where: { id_tenant } }),

  akunCreate: (data: Prisma.AkunPembayaranTenantUncheckedCreateInput) =>
    prisma.akunPembayaranTenant.create({ data }),

  akunFindByPenyediaId: (penyedia_account_id: string) =>
    prisma.akunPembayaranTenant.findUnique({ where: { penyedia_account_id } }),

  akunUpdate: (
    id_akun_pembayaran: number,
    data: Prisma.AkunPembayaranTenantUncheckedUpdateInput,
  ) => prisma.akunPembayaranTenant.update({ where: { id_akun_pembayaran }, data }),

  submissionCreate: (data: Prisma.KycSubmissionUncheckedCreateInput) =>
    prisma.kycSubmission.create({ data }),

  submissionLatest: (id_tenant: number) =>
    prisma.kycSubmission.findFirst({ where: { id_tenant }, orderBy: { id_kyc: "desc" } }),

  submissionUpdate: (id_kyc: number, data: Prisma.KycSubmissionUncheckedUpdateInput) =>
    prisma.kycSubmission.update({ where: { id_kyc }, data }),

  pengurusAktif: (id_tenant: number) =>
    prisma.akunPengguna.findMany({
      where: { id_tenant, role: { in: ["Ketua_RT", "Sekretaris", "Bendahara"] }, status_akun: "Aktif" },
      select: { id_pengguna: true, email: true, warga: { select: { no_hp: true } } },
    }),
};
