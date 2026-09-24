-- Fase SaaS — Audit log untuk aksi tenant (id_tenant, id_pengguna)

ALTER TABLE "AuditLog" ADD COLUMN "id_pengguna" INTEGER,
ADD COLUMN "id_tenant" INTEGER;

CREATE INDEX "AuditLog_id_tenant_createdAt_idx" ON "AuditLog"("id_tenant", "createdAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_id_tenant_fkey" FOREIGN KEY ("id_tenant") REFERENCES "Tenant"("id_tenant") ON DELETE SET NULL ON UPDATE CASCADE;
