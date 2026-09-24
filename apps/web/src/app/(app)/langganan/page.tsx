"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, RefreshCw, Upload } from "lucide-react";
import {
  PERIODE_LANGGANAN,
  formatRupiah,
  formatTanggal,
  queryKeys,
  type StatusBayar,
  type StatusLangganan,
} from "@smarthub/shared";
import { ApiError, apiFetch, apiUpload, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { StatusBayarBadge, StatusLanggananBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PaketItem {
  kode: string;
  nama: string;
  harga_bulanan: string;
  harga_tahunan: string;
  batas_rumah: number | null;
  fitur: string[];
  aktif: boolean;
}

interface StatusLanggananData {
  status: StatusLangganan;
  kode_paket: string;
  nama_paket: string;
  mulai: string | null;
  berakhir: string | null;
  trial_berakhir: string | null;
  hari_tersisa: number;
  batas_rumah: number | null;
  rumah_terpakai: number;
  kuota_terlampaui: boolean;
}

interface InvoiceItem {
  id_invoice: number;
  kode_paket: string | null;
  nama_paket: string;
  periode_mulai: string | null;
  periode_akhir: string | null;
  jumlah: string;
  status_bayar: StatusBayar;
  jatuh_tempo: string | null;
  bukti_transfer: string | null;
  paid_at: string | null;
  dibuat_pada: string | null;
}

const PERIODE_LABELS: Record<(typeof PERIODE_LANGGANAN)[number], string> = {
  bulanan: "Bulanan",
  tahunan: "Tahunan",
};

export default function LanggananPage() {
  const { data: me } = useMe();
  const canPay = me?.role === "Ketua_RT" || me?.role === "Bendahara";
  const canVerify = me?.role === "Ketua_RT";

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kodePaket, setKodePaket] = useState<string>("");
  const [periode, setPeriode] = useState<(typeof PERIODE_LANGGANAN)[number]>("bulanan");
  const [bayarInvoice, setBayarInvoice] = useState<InvoiceItem | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const paketQuery = useQuery({
    queryKey: queryKeys.langgananPaket,
    queryFn: async () => apiFetch<PaketItem[]>("/langganan/paket"),
  });

  const statusQuery = useQuery({
    queryKey: queryKeys.langgananStatus,
    queryFn: async () => apiFetch<StatusLanggananData>("/langganan/status"),
    retry: false,
  });

  const invoiceParams = { page, limit: 10 };
  const invoiceQuery = useQuery({
    queryKey: queryKeys.langgananInvoice(invoiceParams),
    queryFn: async () =>
      apiFetch<InvoiceItem[]>(`/langganan/invoice${buildQuery(invoiceParams)}`),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["langganan"] }),
    ]);
  };

  const buatInvoice = useMutation({
    mutationFn: async () =>
      apiFetch("/langganan/invoice", {
        method: "POST",
        body: { kode_paket: kodePaket, periode },
      }),
    onSuccess: async () => {
      toast.success("Invoice langganan dibuat");
      setDialogOpen(false);
      await invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Gagal membuat invoice");
    },
  });

  const bayar = useMutation({
    mutationFn: async () => {
      if (!bayarInvoice || !file) throw new Error("Bukti transfer belum dipilih");
      const url = await apiUpload(file);
      return apiFetch(`/langganan/invoice/${bayarInvoice.id_invoice}/bayar`, {
        method: "POST",
        body: { bukti_transfer: url, metode: "Transfer_Manual" },
      });
    },
    onSuccess: async () => {
      toast.success("Bukti pembayaran terkirim, menunggu verifikasi");
      setBayarInvoice(null);
      setFile(null);
      await invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengirim bukti pembayaran");
    },
  });

  const verifikasi = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: StatusBayar }) =>
      apiFetch(`/langganan/invoice/${id}/verifikasi`, {
        method: "PATCH",
        body: { status_bayar: status },
      }),
    onSuccess: async () => {
      toast.success("Status invoice diperbarui");
      await invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui invoice");
    },
  });

  const paketItems = paketQuery.data?.data ?? [];
  const status = statusQuery.data?.data ?? null;
  const invoices = invoiceQuery.data?.data ?? [];

  const paketTerpilih = paketItems.find((item) => item.kode === kodePaket);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Langganan"
        description="Kelola paket dan pembayaran langganan RT."
        action={
          canPay ? (
            <Button
              onClick={() => {
                setKodePaket(paketItems[0]?.kode ?? "");
                setDialogOpen(true);
              }}
            >
              <CreditCard className="h-4 w-4" /> Pilih Paket
            </Button>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Status"
          value={status ? status.status : "-"}
          hint={status ? `Paket ${status.nama_paket}` : undefined}
          icon={CreditCard}
          loading={statusQuery.isLoading}
        />
        <StatCard
          label="Berakhir"
          value={status?.berakhir ? formatTanggal(status.berakhir) : "-"}
          hint={status ? `${status.hari_tersisa} hari tersisa` : undefined}
          icon={RefreshCw}
          loading={statusQuery.isLoading}
        />
        <StatCard
          label="Rumah Terpakai"
          value={status ? String(status.rumah_terpakai) : "-"}
          hint={status?.batas_rumah ? `Batas paket ${status.batas_rumah} rumah` : "Tanpa batas"}
          icon={CheckCircle2}
          loading={statusQuery.isLoading}
        />
      </div>

      {status?.kuota_terlampaui ? (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>Kuota rumah terlampaui</AlertTitle>
          <AlertDescription>
            Jumlah rumah melebihi batas paket {status.nama_paket}. Pertimbangkan upgrade paket.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Daftar Paket</h2>
        <DataState
          isLoading={paketQuery.isLoading}
          isError={paketQuery.isError}
          error={paketQuery.error}
          isEmpty={paketItems.length === 0}
          emptyMessage="Belum ada paket langganan"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {paketItems.map((paket) => (
              <div key={paket.kode} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{paket.nama}</h3>
                  {status?.kode_paket === paket.kode ? (
                    <StatusLanggananBadge status={status.status} />
                  ) : null}
                </div>
                <p className="mt-2 text-2xl font-semibold">{formatRupiah(paket.harga_bulanan)}</p>
                <p className="text-xs text-muted-foreground">per bulan</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {paket.batas_rumah ? `Maksimal ${paket.batas_rumah} rumah` : "Tanpa batas rumah"}
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {paket.fitur.map((fitur) => (
                    <li key={fitur}>- {fitur}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DataState>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Tagihan Langganan</h2>
      <DataState
        isLoading={invoiceQuery.isLoading}
        isError={invoiceQuery.isError}
        error={invoiceQuery.error}
        isEmpty={invoices.length === 0}
        emptyMessage="Belum ada tagihan langganan"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paket</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id_invoice}>
                  <TableCell className="font-medium">{invoice.nama_paket}</TableCell>
                  <TableCell>
                    {formatTanggal(invoice.periode_mulai)} - {formatTanggal(invoice.periode_akhir)}
                  </TableCell>
                  <TableCell>{formatRupiah(invoice.jumlah)}</TableCell>
                  <TableCell>{formatTanggal(invoice.jatuh_tempo)}</TableCell>
                  <TableCell>
                    <StatusBayarBadge status={invoice.status_bayar} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canPay && invoice.status_bayar !== "Lunas" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBayarInvoice(invoice);
                            setFile(null);
                          }}
                        >
                          <Upload className="h-4 w-4" /> Bayar
                        </Button>
                      ) : null}
                      {canVerify && invoice.status_bayar === "Menunggu_Konfirmasi" ? (
                        <Button
                          size="sm"
                          disabled={verifikasi.isPending}
                          onClick={() =>
                            verifikasi.mutate({ id: invoice.id_invoice, status: "Lunas" })
                          }
                        >
                          Verifikasi
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination meta={invoiceQuery.data?.meta} onPageChange={setPage} />
      </DataState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih Paket Langganan</DialogTitle>
            <DialogDescription>
              Sistem menerbitkan invoice; setelah transfer dan verifikasi, langganan aktif.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paket</Label>
              <Select value={kodePaket} onValueChange={setKodePaket}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  {paketItems.map((paket) => (
                    <SelectItem key={paket.kode} value={paket.kode}>
                      {paket.nama} - {formatRupiah(paket.harga_bulanan)}/bulan
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Periode</Label>
              <Select
                value={periode}
                onValueChange={(value) => setPeriode(value as (typeof PERIODE_LANGGANAN)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODE_LANGGANAN.map((value) => (
                    <SelectItem key={value} value={value}>
                      {PERIODE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {paketTerpilih ? (
              <p className="text-sm text-muted-foreground">
                Tagihan:{" "}
                {formatRupiah(periode === "tahunan" ? paketTerpilih.harga_tahunan : paketTerpilih.harga_bulanan)}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              disabled={!kodePaket || buatInvoice.isPending}
              onClick={() => buatInvoice.mutate()}
            >
              {buatInvoice.isPending ? "Membuat..." : "Buat Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bayarInvoice !== null} onOpenChange={(open) => !open && setBayarInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unggah Bukti Transfer</DialogTitle>
            <DialogDescription>
              Transfer sesuai nominal tagihan, lalu unggah bukti (JPG, PNG, WEBP, atau PDF).
            </DialogDescription>
          </DialogHeader>
          {bayarInvoice ? (
            <p className="text-sm">
              {bayarInvoice.nama_paket} - {formatRupiah(bayarInvoice.jumlah)}
            </p>
          ) : null}
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <DialogFooter>
            <Button disabled={!file || bayar.isPending} onClick={() => bayar.mutate()}>
              {bayar.isPending ? "Mengirim..." : "Kirim Bukti"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
