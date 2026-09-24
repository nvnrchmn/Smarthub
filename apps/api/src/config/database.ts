import { PrismaClient } from "@prisma/client";
import { getTenantId } from "../common/tenant/tenant-context";
import { isProduction } from "./environment";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["warn", "error"],
  });

if (!isProduction) {
  globalForPrisma.prisma = basePrisma;
}

/**
 * Model domain yang memiliki kolom `id_tenant`. Operasi pada model ini otomatis
 * di-scope ke tenant aktif (dari JWT). Bila konteks tenant tidak tersedia
 * (mis. login, seed, konsol platform) operasi dilewatkan apa adanya.
 */
const TENANT_SCOPED_MODELS = new Set<string>([
  "Rumah",
  "KartuKeluarga",
  "Warga",
  "MutasiWarga",
  "TamuKunjungan",
  "KategoriKeuangan",
  "IuranRumah",
  "KasUmum",
  "AkunPengguna",
  "Postingan",
  "KategoriProduk",
  "Produk",
  "LaporanProduk",
  "Notifikasi",
  "LanggananTenant",
  "InvoiceLangganan",
  "AkunPembayaranTenant",
  "RekeningBankTenant",
  "KycSubmission",
  "PembayaranIuran",
  "PencairanTenant",
]);

interface ScopedArgs {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
}

const WHERE_OPERATIONS = new Set<string>([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

export const prisma = basePrisma.$extends({
  name: "tenant-scope",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const id_tenant = getTenantId();
        if (id_tenant === null || !TENANT_SCOPED_MODELS.has(model)) {
          return query(args);
        }

        const next = { ...(args as ScopedArgs) };

        if (WHERE_OPERATIONS.has(operation)) {
          next.where = { ...(next.where ?? {}), id_tenant };
        } else if (operation === "create") {
          next.data = { ...((next.data as Record<string, unknown>) ?? {}), id_tenant };
        } else if (operation === "createMany") {
          next.data = Array.isArray(next.data)
            ? next.data.map((item) => ({ ...item, id_tenant }))
            : { ...(next.data ?? {}), id_tenant };
        } else if (operation === "update" || operation === "delete") {
          next.where = { ...(next.where ?? {}), id_tenant };
        } else if (operation === "upsert") {
          next.where = { ...(next.where ?? {}), id_tenant };
          next.create = { ...(next.create ?? {}), id_tenant };
        }

        return query(next as unknown as typeof args);
      },
    },
  },
});
