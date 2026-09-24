import type { PaginationMeta } from "@smarthub/shared";

export interface ResolvedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
  sort: string | undefined;
}

export const resolvePagination = (query: {
  page?: number;
  limit?: number;
  sort?: string;
}): ResolvedPagination => {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 20;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    sort: query.sort,
  };
};

export const buildMeta = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
});

const SORTABLE_ASC = new Set([
  "createdAt",
  "updatedAt",
  "nama_lengkap",
  "nama_tamu",
  "tanggal",
  "tgl_datang",
  "bulan",
  "tahun",
  "tgl_peristiwa",
  "nomor_rumah",
  "nama_kategori",
]);

export const resolveOrderBy = (
  sort: string | undefined,
  fallback: Record<string, "asc" | "desc">,
): Record<string, "asc" | "desc"> => {
  if (!sort) return fallback;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  if (!SORTABLE_ASC.has(field)) return fallback;
  return { [field]: desc ? "desc" : "asc" };
};
