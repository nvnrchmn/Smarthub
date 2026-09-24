import type { CreateTenantInput, ListTenantQueryInput } from "@smarthub/shared";
import type { Prisma, Tenant } from "@prisma/client";
import { hashPassword } from "../../config/security";
import { runWithTenant } from "../../common/tenant/tenant-context";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { authRepository } from "../auth/auth.repository";
import { langgananService } from "../langganan/langganan.service";
import { tenantRepository } from "./tenant.repository";

type TenantWithCount = Tenant & { _count: { rumah: number } };

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug.length >= 3 ? slug : `rt-${Date.now()}`;
};

const buatUsernameUnik = async (nama: string): Promise<string> => {
  const dasar =
    nama
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "pengurus";

  let kandidat = dasar.length >= 3 ? dasar : "pengurus";
  let urutan = 1;

  while (await authRepository.usernameExists(kandidat)) {
    urutan += 1;
    kandidat = `${dasar.slice(0, 27)}_${urutan}`;
  }

  return kandidat;
};

const present = (tenant: TenantWithCount, pengurus?: { id_pengguna: number; email: string; username: string | null; role: string }) => ({
  id_tenant: tenant.id_tenant,
  nama: tenant.nama,
  slug: tenant.slug,
  provinsi: tenant.provinsi,
  kabupaten: tenant.kabupaten,
  kecamatan: tenant.kecamatan,
  status: tenant.status,
  jumlah_rumah: tenant.jumlah_rumah,
  jumlah_rumah_terpakai: tenant._count.rumah,
  kontak_email: tenant.kontak_email,
  kontak_hp: tenant.kontak_hp,
  ...(pengurus ? { pengurus } : {}),
});

export const tenantService = {
  async create(input: CreateTenantInput) {
    const slug = input.slug ?? slugify(input.nama);

    if (await tenantRepository.findBySlug(slug)) {
      throw HttpError.conflict("Slug tenant sudah digunakan");
    }
    if (await authRepository.findByEmail(input.pengurus.email)) {
      throw HttpError.conflict("Email pengurus sudah digunakan akun lain");
    }
    if (input.pengurus.nik && (await authRepository.findByNik(input.pengurus.nik))) {
      throw HttpError.conflict("NIK pengurus sudah memiliki akun");
    }
    if (input.pengurus.username && (await authRepository.usernameExists(input.pengurus.username))) {
      throw HttpError.conflict("Username sudah dipakai akun lain");
    }

    const tenant = await tenantRepository.create({
      nama: input.nama,
      slug,
      provinsi: input.provinsi,
      kabupaten: input.kabupaten,
      kecamatan: input.kecamatan,
      jumlah_rumah: input.jumlah_rumah ?? null,
      kontak_email: input.kontak_email,
      kontak_hp: input.kontak_hp ?? null,
      status: "Aktif",
    });

    const username = input.pengurus.username ?? (await buatUsernameUnik(input.pengurus.nama_lengkap));
    const password_hash = await hashPassword(input.pengurus.password);

    const akun = await runWithTenant({ id_tenant: tenant.id_tenant }, async () =>
      authRepository.create({
        nik: input.pengurus.nik ?? null,
        email: input.pengurus.email,
        username,
        password_hash,
        role: input.pengurus.role,
      }),
    );

    await langgananService.mulaiTrial(tenant.id_tenant);

    return present(
      { ...tenant, _count: { rumah: 0 } },
      {
        id_pengguna: akun.id_pengguna,
        email: akun.email,
        username: akun.username,
        role: akun.role,
      },
    );
  },

  async list(query: ListTenantQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "desc" });
    const where: Prisma.TenantWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const { items, total } = await tenantRepository.list({ skip, take, where, orderBy });
    return { data: items.map((item) => present(item)), meta: buildMeta(page, limit, total) };
  },

  async detail(id_tenant: number) {
    const tenant = await tenantRepository.findById(id_tenant);
    if (!tenant) throw HttpError.notFound("Tenant tidak ditemukan");
    return present(tenant);
  },
};
