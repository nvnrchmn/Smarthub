"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QrCode } from "lucide-react";
import { formatRupiah } from "@smarthub/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PembayaranQris {
  id_pembayaran_iuran: number;
  id_iuran: number;
  referensi_bayar: string;
  qr_string: string;
  jumlah: string;
  status: string;
  kedaluwarsa_pada: string | null;
  paid_at: string | null;
}

const LABEL_STATUS: Record<string, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Lunas",
  EXPIRED: "Kedaluwarsa",
};

export function QrisPembayaranDialog({
  id_iuran,
  open,
  onOpenChange,
  onLunas,
}: {
  id_iuran: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLunas?: () => void;
}) {
  const queryClient = useQueryClient();

  const qrisQuery = useQuery({
    queryKey: ["qris", id_iuran],
    enabled: open && id_iuran !== null,
    queryFn: async () =>
      (await apiFetch<PembayaranQris>(`/billing/iuran/${id_iuran}/qris`, { method: "POST" })).data,
    retry: false,
  });

  useEffect(() => {
    if (!open || !id_iuran) return;
    const interval = setInterval(() => {
      void qrisQuery.refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [open, id_iuran, qrisQuery.refetch]);

  useEffect(() => {
    if (qrisQuery.data?.status === "PAID") {
      onLunas?.();
      void queryClient.invalidateQueries({ queryKey: ["iuran"] });
    }
  }, [qrisQuery.data?.status, onLunas, queryClient]);

  const pembayaran = qrisQuery.data;
  const errorMessage =
    qrisQuery.error instanceof ApiError ? qrisQuery.error.message : qrisQuery.error ? "Gagal membuat QRIS" : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" /> Pembayaran QRIS
          </DialogTitle>
          <DialogDescription>
            Scan kode QR dengan aplikasi bank/e-wallet. Status diperbarui otomatis.
          </DialogDescription>
        </DialogHeader>

        {qrisQuery.isLoading ? <p className="text-sm text-muted-foreground">Membuat QRIS...</p> : null}

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        {pembayaran ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nominal</span>
              <span className="font-semibold">{formatRupiah(pembayaran.jumlah)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={pembayaran.status === "PAID" ? "success" : "warning"}>
                {LABEL_STATUS[pembayaran.status] ?? pembayaran.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">String QRIS</p>
              <pre className="max-h-40 overflow-auto break-all rounded-md border bg-muted p-3 text-xs">
                {pembayaran.qr_string}
              </pre>
            </div>
            {pembayaran.kedaluwarsa_pada ? (
              <p className="text-xs text-muted-foreground">
                Berlaku hingga {new Date(pembayaran.kedaluwarsa_pada).toLocaleString("id-ID")}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => qrisQuery.refetch()}
            disabled={qrisQuery.isFetching}
          >
            {qrisQuery.isFetching ? "Memuat..." : "Perbarui status"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
