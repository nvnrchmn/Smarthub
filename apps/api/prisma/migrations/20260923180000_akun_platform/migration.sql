-- CreateTable
CREATE TABLE "AkunPlatform" (
    "id_akun_platform" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Superadmin',
    "status_akun" "StatusAkun" NOT NULL DEFAULT 'Aktif',
    "terakhir_masuk" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AkunPlatform_pkey" PRIMARY KEY ("id_akun_platform")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id_audit" SERIAL NOT NULL,
    "id_akun_platform" INTEGER,
    "aktor_email" TEXT,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "id_entitas" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id_audit")
);

-- CreateIndex
CREATE UNIQUE INDEX "AkunPlatform_email_key" ON "AkunPlatform"("email");

-- CreateIndex
CREATE INDEX "AkunPlatform_role_status_akun_idx" ON "AkunPlatform"("role", "status_akun");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entitas_id_entitas_idx" ON "AuditLog"("entitas", "id_entitas");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_id_akun_platform_fkey" FOREIGN KEY ("id_akun_platform") REFERENCES "AkunPlatform"("id_akun_platform") ON DELETE SET NULL ON UPDATE CASCADE;

