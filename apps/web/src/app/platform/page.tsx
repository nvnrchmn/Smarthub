"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Plus } from "lucide-react";
import {
  PLATFORM_ROLE_LABELS,
  STATUS_LANGGANAN_LABELS,
  STATUS_TENANT,
  STATUS_TENANT_LABELS,
  formatRupiah,
  formatTanggalWaktu,
  type PlatformRole,
  type StatusLangganan,
  type StatusTenant,
} from "@smarthub/shared";
import { ApiError, buildQuery } from "@/lib/api-client";
import { platformFetch } from "@/lib/platform-api-client";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Ringkasan {
  tenant_per_status: { status: StatusTenant; jumlah: number }[];
  langganan_per_status: { status: StatusLangganan; jumlah: number }[];
  pembayaran_qris: {
    jumlah_transaksi: number;
    total_pembayaran: string;
    total_fee_platform: string;
    total_net_ke_rt: string;
  };
  webhook_belum_diproses: number;
}

interface TenantItem {
  id_tenant: number;
  nama: string;
  slug: string;
  status: StatusTenant;
  rumah_terpakai: number;
  akun_pengguna: number;
  kontak_email: string;
  langganan: { status: StatusLangganan; nama_paket: string; berakhir: string | null } | null;
}

interface LanggananItem {
  id_langganan: number;
  tenant: { id_tenant: number; nama: string; slug: string };
  nama_paket: string;
  status: StatusLangganan;
  berakhir: string | null;
}

interface WebhookItem {
  id_event: number;
  event_id: string;
  tipe: string;
  processed_at: string | null;
  error: string | null;
  dibuat_pada: string | null;
}

interface AuditItem {
  id_audit: number;
  aktor_email: string | null;
  aksi: string;
  entitas: string;
  id_entitas: string | null;
  dibuat_pada: string | null;
}

interface AkunPlatformItem {
  id_akun_platform: number;
  nama: string;
  email: string;
  role: PlatformRole;
  status_akun: string;
}

interface AlertData {
  webhook_menunggu: WebhookItem[];
  webhook_gagal: WebhookItem[];
  webhook_gagal_jumlah: number;
  payout_gagal: {
    id_pencairan: number;
    id_tenant: number;
    tenant: string;
    jumlah: string;
    failure_code: string | null;
    failure_reason: string | null;
    diperbarui_pada: string | null;
  }[];
  payout_gagal_jumlah: number;
  langganan_jatuh_tempo: {
    id_tenant: number;
    tenant: { id_tenant: number; nama: string; slug: string };
    nama_paket: string;
    status: StatusLangganan;
    berakhir: string | null;
  }[];
  invoice_belum_bayar: {
    id_invoice: number;
    tenant: { id_tenant: number; nama: string; slug: string };
    nama_paket: string;
    jumlah: string;
    status: string;
    jatuh_tempo: string | null;
  }[];
}

interface PlatformMe {
  id_akun_platform: number;
  nama: string;
  email: string;
  role: PlatformRole;
  mfa_aktif: boolean;
}

export default function PlatformDashboardPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantStatus, setTenantStatus] = useState<string>("semua");

  const [impersonateTenant, setImpersonateTenant] = useState<TenantItem | null>(null);
  const [alasan, setAlasan] = useState("");
  const [impersonateKodeMfa, setImpersonateKodeMfa] = useState("");

  const [akunDialog, setAkunDialog] = useState(false);
  const [akunForm, setAkunForm] = useState({
    nama: "",
    email: "",
    password: "",
    role: "Operator" as PlatformRole,
  });

  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpauth, setMfaOtpauth] = useState<string | null>(null);
  const [mfaKode, setMfaKode] = useState("");

  const tenantParams = {
    page: tenantPage,
    limit: 10,
    status: tenantStatus === "semua" ? undefined : tenantStatus,
  };

  const ringkasanQuery = useQuery({
    queryKey: ["platform", "ringkasan"],
    queryFn: async () => (await platformFetch<Ringkasan>("/ringkasan")).data,
  });

  const tenantQuery = useQuery({
    queryKey: ["platform", "tenant", tenantParams],
    queryFn: async () => platformFetch<TenantItem[]>(`/tenant${buildQuery(tenantParams)}`),
  });

  const langgananQuery = useQuery({
    queryKey: ["platform", "langganan"],
    queryFn: async () =>
      platformFetch<LanggananItem[]>(`/langganan${buildQuery({ page: 1, limit: 20 })}`),
  });

  const webhookQuery = useQuery({
    queryKey: ["platform", "webhook"],
    queryFn: async () =>
      platformFetch<WebhookItem[]>(`/webhook-event${buildQuery({ page: 1, limit: 20 })}`),
  });

  const auditQuery = useQuery({
    queryKey: ["platform", "audit"],
    queryFn: async () =>
      platformFetch<AuditItem[]>(`/audit-log${buildQuery({ page: 1, limit: 20 })}`),
  });

  const meQuery = useQuery({
    queryKey: ["platform", "me"],
    queryFn: async () => (await platformFetch<PlatformMe>("/me")).data,
    retry: false,
  });

  const isSuperadmin = meQuery.data?.role === "Superadmin";

  const akunQuery = useQuery({
    queryKey: ["platform", "akun"],
    queryFn: async () =>
      platformFetch<AkunPlatformItem[]>(`/akun${buildQuery({ page: 1, limit: 50 })}`),
    // Hanya Superadmin yang boleh membaca daftar akun platform.
    enabled: isSuperadmin,
  });

  const alertQuery = useQuery({
    queryKey: ["platform", "alert"],
    queryFn: async () => (await platformFetch<AlertData>("/alert")).data,
  });

  const invalidatePlatform = async () => {
    await queryClient.invalidateQueries({ queryKey: ["platform"] });
  };

  const ubahStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: StatusTenant }) =>
      platformFetch(`/tenant/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: async () => {
      toast.success("Status tenant diperbarui");
      await invalidatePlatform();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui"),
  });

  const impersonasi = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id_tenant: impersonateTenant?.id_tenant,
          alasan,
          kode_mfa: impersonateKodeMfa,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Impersonasi gagal");
    },
    onSuccess: () => {
      toast.success("Sesi impersonasi dimulai (berlaku 60 menit, read-only)");
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Gagal impersonasi"),
  });

  const buatAkun = useMutation({
    mutationFn: async () => platformFetch("/akun", { method: "POST", body: akunForm }),
    onSuccess: async () => {
      toast.success("Akun platform dibuat");
      setAkunDialog(false);
      setAkunForm({ nama: "", email: "", password: "", role: "Operator" });
      await invalidatePlatform();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal membuat akun"),
  });

  const ubahStatusAkun = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      platformFetch(`/akun/${id}`, { method: "PATCH", body: { status_akun: status } }),
    onSuccess: async () => {
      toast.success("Akun platform diperbarui");
      await invalidatePlatform();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui akun"),
  });

  const setupMfa = useMutation({
    mutationFn: async () =>
      (
        await platformFetch<{ secret: string; otpauth_url: string }>("/auth/mfa/setup", {
          method: "POST",
        })
      ).data,
    onSuccess: (data) => {
      setMfaSecret(data.secret);
      setMfaOtpauth(data.otpauth_url);
      toast.success("Masukkan secret ke aplikasi authenticator, lalu aktifkan.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Gagal setup MFA"),
  });

  const activateMfa = useMutation({
    mutationFn: async () =>
      platformFetch("/auth/mfa/activate", { method: "POST", body: { kode: mfaKode } }),
    onSuccess: async () => {
      toast.success("MFA diaktifkan");
      setMfaSecret(null);
      setMfaOtpauth(null);
      setMfaKode("");
      await invalidatePlatform();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Kode MFA salah"),
  });

  const disableMfa = useMutation({
    mutationFn: async () =>
      platformFetch("/auth/mfa/disable", { method: "POST", body: { kode: mfaKode } }),
    onSuccess: async () => {
      toast.success("MFA dinonaktifkan");
      setMfaKode("");
      await invalidatePlatform();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Kode MFA salah"),
  });

  const mfaAktif = meQuery.data?.mfa_aktif ?? false;
  const alerts = alertQuery.data;
  const totalAlert = alerts
    ? alerts.webhook_menunggu.length +
      alerts.webhook_gagal_jumlah +
      alerts.payout_gagal_jumlah +
      alerts.langganan_jatuh_tempo.length +
      alerts.invoice_belum_bayar.length
    : 0;

  const ringkasan = ringkasanQuery.data;
  const tenants = tenantQuery.data?.data ?? [];
  const langganan = langgananQuery.data?.data ?? [];
  const webhooks = webhookQuery.data?.data ?? [];
  const audit = auditQuery.data?.data ?? [];
  const akun = akunQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dasbor Platform</h1>
        <p className="text-sm text-muted-foreground">
          Kelola tenant, langganan, webhook, dan akun platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Tenant</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {ringkasan
              ? ringkasan.tenant_per_status.reduce((total, item) => total + item.jumlah, 0)
              : "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pembayaran QRIS</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {ringkasan ? ringkasan.pembayaran_qris.jumlah_transaksi : "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Fee Platform</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {ringkasan ? formatRupiah(ringkasan.pembayaran_qris.total_fee_platform) : "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Webhook Belum Diproses</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {ringkasan ? ringkasan.webhook_belum_diproses : "-"}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tenant">
        <TabsList>
          <TabsTrigger value="alert">
            Perlu Tindakan{totalAlert > 0 ? ` (${totalAlert})` : ""}
          </TabsTrigger>
          <TabsTrigger value="tenant">Tenant</TabsTrigger>
          <TabsTrigger value="langganan">Langganan</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          {isSuperadmin ? <TabsTrigger value="akun">Akun Platform</TabsTrigger> : null}
          <TabsTrigger value="keamanan">Keamanan</TabsTrigger>
        </TabsList>

        <TabsContent value="alert" className="space-y-4">
          <DataState
            isLoading={alertQuery.isLoading}
            isError={alertQuery.isError}
            error={alertQuery.error}
            isEmpty={totalAlert === 0}
            emptyMessage="Tidak ada yang perlu ditindak"
          >
            <div className="space-y-4">
              {alerts && alerts.webhook_menunggu.length > 0 ? (
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="mb-2 font-semibold">
                    Webhook belum diproses ({alerts.webhook_menunggu.length})
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {alerts.webhook_menunggu.map((item) => (
                      <li key={item.id_event} className="font-mono text-xs">
                        {item.tipe} · {item.event_id}
                        {item.error ? ` · ${item.error}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {alerts && alerts.webhook_gagal.length > 0 ? (
                <div className="rounded-lg border border-destructive/40 bg-card p-4">
                  <h3 className="mb-2 font-semibold">
                    Webhook gagal 24 jam ({alerts.webhook_gagal_jumlah})
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {alerts.webhook_gagal.map((item) => (
                      <li key={item.id_event} className="font-mono text-xs">
                        {item.tipe} · {item.event_id}
                        {item.error ? ` · ${item.error}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {alerts && alerts.payout_gagal.length > 0 ? (
                <div className="rounded-lg border border-destructive/40 bg-card p-4">
                  <h3 className="mb-2 font-semibold">
                    Payout gagal 24 jam ({alerts.payout_gagal_jumlah})
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {alerts.payout_gagal.map((item) => (
                      <li key={item.id_pencairan}>
                        {item.tenant} · {formatRupiah(item.jumlah)}
                        {item.failure_code ? ` · ${item.failure_code}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {alerts && alerts.langganan_jatuh_tempo.length > 0 ? (
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="mb-2 font-semibold">
                    Langganan jatuh tempo ≤7 hari ({alerts.langganan_jatuh_tempo.length})
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {alerts.langganan_jatuh_tempo.map((item) => (
                      <li key={item.id_tenant}>
                        {item.tenant.nama} · {item.nama_paket} · berakhir {item.berakhir}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {alerts && alerts.invoice_belum_bayar.length > 0 ? (
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="mb-2 font-semibold">
                    Invoice langganan belum lunas ({alerts.invoice_belum_bayar.length})
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {alerts.invoice_belum_bayar.map((item) => (
                      <li key={item.id_invoice}>
                        {item.tenant.nama} · {item.nama_paket} · {formatRupiah(item.jumlah)} ·{" "}
                        {item.status}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </DataState>
        </TabsContent>

        <TabsContent value="keamanan" className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold">Autentikasi Dua Faktor (MFA)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Status: {mfaAktif ? "Aktif" : "Belum aktif"}
            </p>

            {!mfaAktif && !mfaSecret ? (
              <Button
                className="mt-3"
                disabled={setupMfa.isPending}
                onClick={() => setupMfa.mutate()}
              >
                {setupMfa.isPending ? "Menyiapkan..." : "Aktifkan MFA"}
              </Button>
            ) : null}

            {!mfaAktif && mfaSecret ? (
              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <Label>Secret</Label>
                  <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">
                    {mfaSecret}
                  </pre>
                  {mfaOtpauth ? (
                    <p className="break-all text-xs text-muted-foreground">{mfaOtpauth}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mfa-aktif">Kode 6 digit</Label>
                  <Input
                    id="mfa-aktif"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaKode}
                    onChange={(event) => setMfaKode(event.target.value)}
                  />
                </div>
                <Button
                  disabled={mfaKode.length !== 6 || activateMfa.isPending}
                  onClick={() => activateMfa.mutate()}
                >
                  {activateMfa.isPending ? "Mengaktifkan..." : "Konfirmasi & Aktifkan"}
                </Button>
              </div>
            ) : null}

            {mfaAktif ? (
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="mfa-nonaktif">Kode 6 digit untuk menonaktifkan</Label>
                  <Input
                    id="mfa-nonaktif"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaKode}
                    onChange={(event) => setMfaKode(event.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={mfaKode.length !== 6 || disableMfa.isPending}
                  onClick={() => disableMfa.mutate()}
                >
                  {disableMfa.isPending ? "Memproses..." : "Nonaktifkan MFA"}
                </Button>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="tenant" className="space-y-3">
          <Select
            value={tenantStatus}
            onValueChange={(value) => {
              setTenantStatus(value);
              setTenantPage(1);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Status tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua status</SelectItem>
              {STATUS_TENANT.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_TENANT_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DataState
            isLoading={tenantQuery.isLoading}
            isError={tenantQuery.isError}
            error={tenantQuery.error}
            isEmpty={tenants.length === 0}
            emptyMessage="Belum ada tenant"
          >
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Rumah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id_tenant}>
                      <TableCell>
                        <Link
                          href={`/platform/tenant/${tenant.id_tenant}`}
                          className="font-medium hover:underline"
                        >
                          {tenant.nama}
                        </Link>
                        <div className="text-xs text-muted-foreground">{tenant.slug}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.status === "Aktif" ? "success" : "secondary"}>
                          {STATUS_TENANT_LABELS[tenant.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{tenant.langganan?.nama_paket ?? "-"}</TableCell>
                      <TableCell>{tenant.rumah_terpakai}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!isSuperadmin ? (
                            <span className="text-xs text-muted-foreground">Hanya baca</span>
                          ) : (
                            <>
                              {tenant.status === "Aktif" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={ubahStatus.isPending}
                                  onClick={() =>
                                    ubahStatus.mutate({
                                      id: tenant.id_tenant,
                                      status: "Ditangguhkan",
                                    })
                                  }
                                >
                                  Tangguhkan
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={ubahStatus.isPending}
                                  onClick={() =>
                                    ubahStatus.mutate({ id: tenant.id_tenant, status: "Aktif" })
                                  }
                                >
                                  Aktifkan
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setImpersonateTenant(tenant);
                                  setAlasan("");
                                  setImpersonateKodeMfa("");
                                }}
                              >
                                <KeyRound className="h-4 w-4" /> Impersonasi
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination meta={tenantQuery.data?.meta} onPageChange={setTenantPage} />
          </DataState>
        </TabsContent>

        <TabsContent value="langganan">
          <DataState
            isLoading={langgananQuery.isLoading}
            isError={langgananQuery.isError}
            error={langgananQuery.error}
            isEmpty={langganan.length === 0}
            emptyMessage="Belum ada langganan"
          >
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Berakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {langganan.map((item) => (
                    <TableRow key={item.id_langganan}>
                      <TableCell className="font-medium">{item.tenant.nama}</TableCell>
                      <TableCell>{item.nama_paket}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "Aktif" ? "success" : "secondary"}>
                          {STATUS_LANGGANAN_LABELS[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.berakhir ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataState>
        </TabsContent>

        <TabsContent value="webhook">
          <DataState
            isLoading={webhookQuery.isLoading}
            isError={webhookQuery.isError}
            error={webhookQuery.error}
            isEmpty={webhooks.length === 0}
            emptyMessage="Belum ada webhook"
          >
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((item) => (
                    <TableRow key={item.id_event}>
                      <TableCell className="font-mono text-xs">{item.event_id}</TableCell>
                      <TableCell>{item.tipe}</TableCell>
                      <TableCell>
                        {item.processed_at ? (
                          <Badge variant="success">Diproses</Badge>
                        ) : (
                          <Badge variant="warning">{item.error ? "Gagal" : "Menunggu"}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatTanggalWaktu(item.dibuat_pada)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataState>
        </TabsContent>

        <TabsContent value="audit">
          <DataState
            isLoading={auditQuery.isLoading}
            isError={auditQuery.isError}
            error={auditQuery.error}
            isEmpty={audit.length === 0}
            emptyMessage="Belum ada audit log"
          >
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Entitas</TableHead>
                    <TableHead>Aktor</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.map((item) => (
                    <TableRow key={item.id_audit}>
                      <TableCell className="font-medium">{item.aksi}</TableCell>
                      <TableCell>
                        {item.entitas}
                        {item.id_entitas ? ` #${item.id_entitas}` : ""}
                      </TableCell>
                      <TableCell>{item.aktor_email ?? "-"}</TableCell>
                      <TableCell>{formatTanggalWaktu(item.dibuat_pada)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataState>
        </TabsContent>

        <TabsContent value="akun" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setAkunDialog(true)}>
              <Plus className="h-4 w-4" /> Tambah Akun
            </Button>
          </div>
          <DataState
            isLoading={akunQuery.isLoading}
            isError={akunQuery.isError}
            error={akunQuery.error}
            isEmpty={akun.length === 0}
            emptyMessage="Belum ada akun platform"
          >
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {akun.map((item) => (
                    <TableRow key={item.id_akun_platform}>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>{PLATFORM_ROLE_LABELS[item.role] ?? item.role}</TableCell>
                      <TableCell>
                        <Badge variant={item.status_akun === "Aktif" ? "success" : "secondary"}>
                          {item.status_akun}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ubahStatusAkun.isPending}
                          onClick={() =>
                            ubahStatusAkun.mutate({
                              id: item.id_akun_platform,
                              status: item.status_akun === "Aktif" ? "Nonaktif" : "Aktif",
                            })
                          }
                        >
                          {item.status_akun === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataState>
        </TabsContent>
      </Tabs>

      <Dialog
        open={impersonateTenant !== null}
        onOpenChange={(open) => !open && setImpersonateTenant(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masuk sebagai {impersonateTenant?.nama}</DialogTitle>
            <DialogDescription>
              Sesi berjalan sebagai Ketua_RT tenant ini, berlaku 60 menit,{" "}
              <strong>hanya baca</strong>, dan tercatat di audit log.
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
            <Label htmlFor="impersonate-mfa">Kode MFA</Label>
            <Input
              id="impersonate-mfa"
              inputMode="numeric"
              maxLength={6}
              value={impersonateKodeMfa}
              onChange={(event) => setImpersonateKodeMfa(event.target.value)}
              placeholder="6 digit dari aplikasi authenticator"
            />
            <p className="text-xs text-muted-foreground">
              MFA wajib aktif untuk impersonasi (step-up).
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={
                alasan.trim().length < 5 ||
                !/^\d{6}$/.test(impersonateKodeMfa) ||
                impersonasi.isPending
              }
              onClick={() => impersonasi.mutate()}
            >
              {impersonasi.isPending ? "Memproses..." : "Masuk sebagai (read-only)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={akunDialog} onOpenChange={setAkunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Akun Platform</DialogTitle>
            <DialogDescription>Buat akun Operator atau Superadmin baru.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="akun-nama">Nama</Label>
              <Input
                id="akun-nama"
                value={akunForm.nama}
                onChange={(event) => setAkunForm({ ...akunForm, nama: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="akun-email">Email</Label>
              <Input
                id="akun-email"
                type="email"
                value={akunForm.email}
                onChange={(event) => setAkunForm({ ...akunForm, email: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="akun-password">Password</Label>
              <Input
                id="akun-password"
                type="password"
                value={akunForm.password}
                onChange={(event) => setAkunForm({ ...akunForm, password: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={akunForm.role}
                onValueChange={(value) => setAkunForm({ ...akunForm, role: value as PlatformRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operator">Operator</SelectItem>
                  <SelectItem value="Superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                akunForm.nama.trim().length < 3 ||
                !akunForm.email.includes("@") ||
                akunForm.password.length < 8 ||
                buatAkun.isPending
              }
              onClick={() => buatAkun.mutate()}
            >
              {buatAkun.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
