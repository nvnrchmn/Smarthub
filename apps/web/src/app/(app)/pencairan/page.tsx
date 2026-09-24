"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { formatRupiah, formatTanggal } from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PencairanItem {
  id_pencairan: number;
  id_rekening: number | null;
  jumlah: string;
  biaya_transfer: string;
  status: string;
  failure_reason: string | null;
  referensi_payout: string | null;
  bukti_transfer: string | null;
  dijadwalkan_pada: string | null;
  selesai_pada: string | null;
  dibuat_pada: string | null;
}

interface Saldo {
  available: number;
  currency: string;
  terverifikasi: boolean;
}

interface RekeningItem {
  id_rekening: number;
  bank_name: string;
  account_number: string;
  is_default: boolean;
}

const LABEL_STATUS: Record<string, string> = {
  MENUNGGU: "Menunggu",
  PROCESSING: "Diproses",
  SELESAI: "Selesai",
  GAGAL: "Gagal",
  DIBATALKAN: "Dibatalkan",
};

export default function PencairanPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jumlah, setJumlah] = useState("");
  const [idRekening, setIdRekening] = useState<string>("");

  const saldoQuery = useQuery({
    queryKey: ["saldo"],
    queryFn: async () => (await apiFetch<Saldo>("/billing/saldo")).data,
  });

  const rekeningQuery = useQuery({
    queryKey: ["rekening"],
    queryFn: async () => (await apiFetch<RekeningItem[]>("/billing/rekening")).data,
  });

  const listQuery = useQuery({
    queryKey: ["pencairan"],
    queryFn: async () =>
      apiFetch<PencairanItem[]>(`/billing/pencairan${buildQuery({ page: 1, limit: 20 })}`),
  });

  const ajukan = useMutation({
    mutationFn: async () =>
      apiFetch("/billing/pencairan", {
        method: "POST",
        body: { jumlah: Number(jumlah), ...(idRekening ? { id_rekening: Number(idRekening) } : {}) },
      }),
    onSuccess: async () => {
      toast.success("Permintaan pencairan diajukan");
      setDialogOpen(false);
      setJumlah("");
      setIdRekening("");
      await queryClient.invalidateQueries({ queryKey: ["pencairan"] });
      await queryClient.invalidateQueries({ queryKey: ["saldo"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Gagal mengajukan pencairan"),
  });

  const items = listQuery.data?.data ?? [];
  const rekening = rekeningQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Pencairan Dana"
        description="Ajukan pencairan dana iuran ke rekening RT."
        action={
          <Button
            onClick={() => {
              setIdRekening(rekening.find((item) => item.is_default)?.id_rekening.toString() ?? "");
              setDialogOpen(true);
            }}
          >
            <Wallet className="h-4 w-4" /> Ajukan Pencairan
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Saldo tersedia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-semibold">
            {saldoQuery.data ? formatRupiah(saldoQuery.data.available) : "-"}
          </p>
          {saldoQuery.data && !saldoQuery.data.terverifikasi ? (
            <p className="text-sm text-destructive">
              Akun pembayaran belum terverifikasi. Selesaikan Verifikasi Identitas terlebih dahulu.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <DataState
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada permintaan pencairan"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diajukan</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bukti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id_pencairan}>
                  <TableCell>{formatTanggal(item.dibuat_pada)}</TableCell>
                  <TableCell>{formatRupiah(item.jumlah)}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "SELESAI" ? "success" : item.status === "GAGAL" ? "destructive" : "secondary"}>
                      {LABEL_STATUS[item.status] ?? item.status}
                    </Badge>
                    {item.failure_reason ? (
                      <p className="text-xs text-muted-foreground">{item.failure_reason}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {item.bukti_transfer ? (
                      <a className="text-sm underline" href={item.bukti_transfer} target="_blank" rel="noreferrer">
                        Lihat
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Pencairan</DialogTitle>
            <DialogDescription>Dana dicairkan ke rekening pencairan yang dipilih.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Rekening Tujuan</Label>
              {rekening.length === 0 ? (
                <p className="text-sm text-destructive">
                  Belum ada rekening. Tambahkan di menu Rekening Pencairan.
                </p>
              ) : (
                <Select value={idRekening} onValueChange={setIdRekening}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rekening" />
                  </SelectTrigger>
                  <SelectContent>
                    {rekening.map((item) => (
                      <SelectItem key={item.id_rekening} value={item.id_rekening.toString()}>
                        {item.bank_name} - {item.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jumlah">Jumlah (Rp)</Label>
              <Input id="jumlah" type="number" value={jumlah} onChange={(event) => setJumlah(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={Number(jumlah) <= 0 || rekening.length === 0 || ajukan.isPending}
              onClick={() => ajukan.mutate()}
            >
              {ajukan.isPending ? "Mengirim..." : "Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
