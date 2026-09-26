"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, KeyRound } from "lucide-react";
import {
  STATUS_LANGGANAN_LABELS,
  STATUS_TENANT_LABELS,
  type StatusLangganan,
  type StatusTenant,
} from "@smarthub/shared";
import { ApiError } from "@/lib/api-client";
import { platformFetch } from "@/lib/platform-api-client";
import { DataState } from "@/components/data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TenantDetail {
  id_tenant: number;
  nama: string;
  slug: string;
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  status: StatusTenant;
  rumah_terpakai: number;
  akun_pengguna: number;
  kontak_email: string;
  kontak_hp: string | null;
  langganan: { status: StatusLangganan; nama_paket: string; berakhir: string | null } | null;
}

export default function PlatformTenantDetailPage() {
  const params = useParams<{ id_tenant: string }>();
  const idTenant = Number(params.id_tenant);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [kodeMfa, setKodeMfa] = useState("");

  const meQuery = useQuery({
    queryKey: ["platform", "me"],
    queryFn: async () => (await platformFetch<{ role: string }>("/me")).data,
    retry: false,
  });
  const isSuperadmin = meQuery.data?.role === "Superadmin";

  const tenantQuery = useQuery({
    queryKey: ["platform", "tenant", idTenant],
    queryFn: async () => (await platformFetch<TenantDetail>(`/tenant/${idTenant}`)).data,
    enabled: Number.isFinite(idTenant),
  });

  const ubahStatus = useMutation({
    mutationFn: async (status: StatusTenant) =>
      platformFetch(`/tenant/${idTenant}/status`, { method: "PATCH", body: { status } }),
    onSuccess: async () => {
      toast.success("Status tenant diperbarui");
      await queryClient.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui"),
  });

  const impersonasi = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id_tenant: idTenant, alasan, kode_mfa: kodeMfa }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Impersonasi gagal");
    },
    onSuccess: () => {
      toast.success("Sesi impersonasi dimulai (read-only)");
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Gagal impersonasi"),
  });

  const tenant = tenantQuery.data;

  return (
    <div className="space-y-6">
      <Link
        href="/platform"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke dasbor
      </Link>

      <DataState
        isLoading={tenantQuery.isLoading}
        isError={tenantQuery.isError}
        error={tenantQuery.error}
        isEmpty={!tenant}
        emptyMessage="Tenant tidak ditemukan"
      >
        {tenant ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{tenant.nama}</h1>
                <p className="text-sm text-muted-foreground">{tenant.slug}</p>
              </div>
              <div className="flex gap-2">
                {!isSuperadmin ? (
                  <span className="text-xs text-muted-foreground">Hanya baca</span>
                ) : (
                  <>
                    {tenant.status === "Aktif" ? (
                      <Button
                        variant="outline"
                        disabled={ubahStatus.isPending}
                        onClick={() => ubahStatus.mutate("Ditangguhkan")}
                      >
                        Tangguhkan
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={ubahStatus.isPending}
                        onClick={() => ubahStatus.mutate("Aktif")}
                      >
                        Aktifkan
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setDialogOpen(true);
                        setKodeMfa("");
                      }}
                    >
                      <KeyRound className="h-4 w-4" /> Masuk sebagai
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Info Tenant</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <Badge variant={tenant.status === "Aktif" ? "success" : "secondary"}>
                    {STATUS_TENANT_LABELS[tenant.status]}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Langganan: </span>
                  {tenant.langganan
                    ? `${tenant.langganan.nama_paket} (${STATUS_LANGGANAN_LABELS[tenant.langganan.status]})`
                    : "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Wilayah: </span>
                  {tenant.kecamatan}, {tenant.kabupaten}, {tenant.provinsi}
                </div>
                <div>
                  <span className="text-muted-foreground">Kontak: </span>
                  {tenant.kontak_email}
                </div>
                <div>
                  <span className="text-muted-foreground">Rumah terpakai: </span>
                  {tenant.rumah_terpakai}
                </div>
                <div>
                  <span className="text-muted-foreground">Akun pengguna: </span>
                  {tenant.akun_pengguna}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </DataState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masuk sebagai {tenant?.nama}</DialogTitle>
            <DialogDescription>
              Sesi read-only 30 menit sebagai Ketua_RT tenant ini, tercatat di audit log. Kode MFA
              diperlukan (step-up).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="alasan">Alasan</Label>
            <Input
              id="alasan"
              value={alasan}
              onChange={(event) => setAlasan(event.target.value)}
              placeholder="mis. menindaklanjuti tiket dukungan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kode-mfa">Kode MFA</Label>
            <Input
              id="kode-mfa"
              inputMode="numeric"
              maxLength={6}
              value={kodeMfa}
              onChange={(event) => setKodeMfa(event.target.value)}
              placeholder="6 digit dari aplikasi authenticator"
            />
          </div>
          <DialogFooter>
            <Button
              disabled={
                alasan.trim().length < 5 || !/^\d{6}$/.test(kodeMfa) || impersonasi.isPending
              }
              onClick={() => impersonasi.mutate()}
            >
              {impersonasi.isPending ? "Memproses..." : "Masuk sebagai (read-only)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
