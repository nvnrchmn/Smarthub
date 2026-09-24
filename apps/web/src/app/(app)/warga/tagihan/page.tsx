"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, ExternalLink, FileText, QrCode, ReceiptText, Upload } from "lucide-react";
import {
  formatPeriode,
  formatRupiah,
  formatTanggal,
  queryKeys,
  type StatusBayar,
} from "@smarthub/shared";
import { ApiError, apiFetch, apiUpload } from "@/lib/api-client";
import { QrisPembayaranDialog } from "@/components/billing/qris-pembayaran-dialog";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { StatCard } from "@/components/stat-card";
import { StatusBayarBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IuranSaya {
  id_iuran: number;
  id_rumah: number;
  nomor_rumah: string;
  blok: string;
  id_kategori: number;
  nama_kategori: string;
  bulan: number;
  tahun: number;
  jumlah_tagihan: string;
  status_bayar: StatusBayar;
  tgl_bayar: string | null;
  bukti_transfer: string | null;
  diverifikasi_oleh: number | null;
  diverifikasi_pada: string | null;
}

export default function TagihanSayaPage() {
  const queryClient = useQueryClient();
  const [bayarItem, setBayarItem] = useState<IuranSaya | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [qrisItem, setQrisItem] = useState<IuranSaya | null>(null);

  const tagihanQuery = useQuery({
    queryKey: queryKeys.iuranSaya,
    queryFn: async () => (await apiFetch<IuranSaya[]>("/keuangan/iuran/saya")).data,
  });

  const bayarMutation = useMutation({
    mutationFn: async (payload: { id_iuran: number; file: File }) => {
      const url = await apiUpload(payload.file);
      return apiFetch(`/keuangan/iuran/${payload.id_iuran}/bayar`, {
        method: "PUT",
        body: { bukti_transfer: url },
      });
    },
    onSuccess: async () => {
      toast.success("Bukti pembayaran berhasil diunggah");
      setBayarItem(null);
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.iuranSaya });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengunggah bukti pembayaran");
    },
  });

  const items = tagihanQuery.data ?? [];
  const belumLunas = items.filter((item) => item.status_bayar !== "Lunas");
  const totalTunggakan = belumLunas.reduce((total, item) => total + Number(item.jumlah_tagihan), 0);

  const closeDialog = (open: boolean) => {
    if (!open) {
      setBayarItem(null);
      setFile(null);
    }
  };

  const handleBayar = () => {
    if (!bayarItem) return;
    if (!file) {
      toast.error("Pilih berkas bukti transfer terlebih dahulu");
      return;
    }
    bayarMutation.mutate({ id_iuran: bayarItem.id_iuran, file });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Tagihan Iuran"
        description="Daftar tagihan iuran rumah Anda beserta status pembayarannya."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Tunggakan"
          value={formatRupiah(totalTunggakan)}
          hint={`${belumLunas.length} tagihan belum lunas`}
          icon={ReceiptText}
          loading={tagihanQuery.isLoading}
        />
        <StatCard
          label="Jumlah Tagihan"
          value={String(items.length)}
          hint="Seluruh periode yang tercatat"
          icon={FileText}
          loading={tagihanQuery.isLoading}
        />
      </div>

      <DataState
        isLoading={tagihanQuery.isLoading}
        isError={tagihanQuery.isError}
        error={tagihanQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada tagihan iuran"
      >
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_iuran}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{item.nama_kategori}</CardTitle>
                    <CardDescription>
                      {formatPeriode(item.bulan, item.tahun)} • Rumah {item.nomor_rumah} (Blok{" "}
                      {item.blok})
                    </CardDescription>
                  </div>
                  <StatusBayarBadge status={item.status_bayar} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Jumlah tagihan</span>
                  <span className="text-base font-semibold">{formatRupiah(item.jumlah_tagihan)}</span>
                </div>

                {item.status_bayar === "Belum_Bayar" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="w-full"
                      onClick={() => {
                        setFile(null);
                        setBayarItem(item);
                      }}
                    >
                      <Upload className="h-4 w-4" /> Unggah Bukti &amp; Bayar
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setQrisItem(item)}
                    >
                      <QrCode className="h-4 w-4" /> Bayar QRIS
                    </Button>
                  </div>
                ) : null}

                {item.status_bayar === "Menunggu_Konfirmasi" ? (
                  <Alert variant="warning">
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Menunggu konfirmasi bendahara</AlertTitle>
                    <AlertDescription>
                      Bukti transfer sudah diunggah dan sedang menunggu verifikasi bendahara. Anda
                      tidak perlu mengunggah ulang.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {item.status_bayar === "Lunas" && item.tgl_bayar ? (
                  <p className="text-sm text-muted-foreground">
                    Dibayar pada {formatTanggal(item.tgl_bayar)}
                  </p>
                ) : null}

                {item.bukti_transfer ? (
                  <Button variant="outline" className="w-full sm:w-auto" asChild>
                    <a href={item.bukti_transfer} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" /> Lihat bukti transfer
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </DataState>

      <Dialog open={bayarItem !== null} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unggah Bukti &amp; Bayar</DialogTitle>
            <DialogDescription>
              {bayarItem
                ? `${bayarItem.nama_kategori} • ${formatPeriode(bayarItem.bulan, bayarItem.tahun)} • ${formatRupiah(bayarItem.jumlah_tagihan)}`
                : undefined}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bukti_transfer">Berkas bukti transfer</Label>
            <Input
              id="bukti_transfer"
              key={bayarItem?.id_iuran}
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Unggah foto atau PDF bukti transfer sesuai nominal tagihan.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => closeDialog(false)}
              disabled={bayarMutation.isPending}
            >
              Batal
            </Button>
            <Button onClick={handleBayar} disabled={bayarMutation.isPending || !file}>
              {bayarMutation.isPending ? "Mengunggah..." : "Kirim Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QrisPembayaranDialog
        id_iuran={qrisItem?.id_iuran ?? null}
        open={qrisItem !== null}
        onOpenChange={(open) => !open && setQrisItem(null)}
        onLunas={() => {
          toast.success("Pembayaran QRIS terkonfirmasi");
          void queryClient.invalidateQueries({ queryKey: queryKeys.iuranSaya });
          setQrisItem(null);
        }}
      />
    </div>
  );
}
