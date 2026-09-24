import type { Prisma, StatusAkun } from "@prisma/client";
import { prisma } from "../../config/database";
import { tenantCreateScope } from "../../common/tenant/tenant-context";

interface ListAccountParams {
  skip: number;
  take: number;
  role?: Prisma.AkunPenggunaWhereInput["role"];
  status_akun?: StatusAkun;
  orderBy: Record<string, "asc" | "desc">;
}

const withWarga = {
  warga: {
    select: {
      nik: true,
      nama_lengkap: true,
      no_kk: true,
      status_aktif: true,
    },
  },
} satisfies Prisma.AkunPenggunaInclude;

export const authRepository = {
  findByEmail: (email: string) =>
    prisma.akunPengguna.findUnique({ where: { email }, include: withWarga }),

  findById: (id_pengguna: number) =>
    prisma.akunPengguna.findUnique({ where: { id_pengguna }, include: withWarga }),

  findByNik: (nik: string) =>
    prisma.akunPengguna.findUnique({ where: { nik }, include: withWarga }),

  findByUsername: (username: string) =>
    prisma.akunPengguna.findUnique({ where: { username }, include: withWarga }),

  usernameExists: async (username: string, kecualiId?: number): Promise<boolean> => {
    const ditemukan = await prisma.akunPengguna.findUnique({
      where: { username },
      select: { id_pengguna: true },
    });
    return Boolean(ditemukan && ditemukan.id_pengguna !== kecualiId);
  },

  cariPengguna: (q: string, limit: number, kecualiId: number) =>
    prisma.akunPengguna.findMany({
      where: {
        username: { not: null },
        status_akun: "Aktif",
        id_pengguna: { not: kecualiId },
        ...(q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" as const } },
                { warga: { nama_lengkap: { contains: q, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: { username: "asc" },
      select: {
        id_pengguna: true,
        username: true,
        role: true,
        warga: { select: { nama_lengkap: true } },
      },
    }),

  cariByUsernames: (usernames: string[]) =>
    prisma.akunPengguna.findMany({
      where: { username: { in: usernames }, status_akun: "Aktif" },
      select: {
        id_pengguna: true,
        username: true,
        warga: { select: { nama_lengkap: true } },
      },
    }),

  updateAkun: (id_pengguna: number, data: Prisma.AkunPenggunaUncheckedUpdateInput) =>
    prisma.akunPengguna.update({ where: { id_pengguna }, data, include: withWarga }),

  create: (data: Omit<Prisma.AkunPenggunaUncheckedCreateInput, "id_tenant">) =>
    prisma.akunPengguna.create({ data: { ...data, ...tenantCreateScope() }, include: withWarga }),

  updatePassword: (id_pengguna: number, password_hash: string) =>
    prisma.akunPengguna.update({ where: { id_pengguna }, data: { password_hash } }),

  updateStatus: (id_pengguna: number, status_akun: StatusAkun) =>
    prisma.akunPengguna.update({
      where: { id_pengguna },
      data: { status_akun },
      include: withWarga,
    }),

  updateMfa: (id_pengguna: number, data: { mfa_secret?: string | null; mfa_aktif?: boolean }) =>
    prisma.akunPengguna.update({ where: { id_pengguna }, data }),

  sesiCreate: (data: Prisma.SesiRefreshTokenUncheckedCreateInput) =>
    prisma.sesiRefreshToken.create({ data }),

  sesiByHash: (token_hash: string) =>
    prisma.sesiRefreshToken.findUnique({ where: { token_hash } }),

  sesiUpdate: (id_sesi: number, data: Prisma.SesiRefreshTokenUncheckedUpdateInput) =>
    prisma.sesiRefreshToken.update({ where: { id_sesi }, data }),

  sesiCabutByHash: (token_hash: string) =>
    prisma.sesiRefreshToken.updateMany({
      where: { token_hash, dicabut_pada: null },
      data: { dicabut_pada: new Date() },
    }),

  sesiCabutSemua: (id_pengguna: number) =>
    prisma.sesiRefreshToken.updateMany({
      where: { id_pengguna, dicabut_pada: null },
      data: { dicabut_pada: new Date() },
    }),

  list: async ({ skip, take, role, status_akun, orderBy }: ListAccountParams) => {
    const where: Prisma.AkunPenggunaWhereInput = {
      ...(role ? { role } : {}),
      ...(status_akun ? { status_akun } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.akunPengguna.findMany({
        where,
        skip,
        take,
        orderBy,
        include: withWarga,
      }),
      prisma.akunPengguna.count({ where }),
    ]);

    return { items, total };
  },
};
