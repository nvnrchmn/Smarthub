import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  id_tenant: number | null;
}

export const tenantAls = new AsyncLocalStorage<TenantContext>();

export const getTenantId = (): number | null => tenantAls.getStore()?.id_tenant ?? null;

export const runWithTenant = <T>(context: TenantContext, callback: () => T): T =>
  tenantAls.run(context, callback);

/**
 * Konteks tulis untuk repository: menghasilkan `id_tenant` dari tenant aktif.
 * Gagal-tertutup bila tidak ada konteks tenant, sehingga tidak ada baris domain
 * yang dapat ditulis tanpa tenant.
 */
export const tenantCreateScope = (): { id_tenant: number } => {
  const id_tenant = getTenantId();
  if (id_tenant === null) {
    throw new Error("Konteks tenant tidak tersedia untuk operasi tulis");
  }
  return { id_tenant };
};
