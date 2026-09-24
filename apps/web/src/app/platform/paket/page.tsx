"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { formatRupiah } from "@smarthub/shared";
import { ApiError } from "@/lib/api-client";
import { platformFetch } from "@/lib/platform-api-client";
import { DataState } from "@/components/data-state";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface PaketForm {
  nama: string;
  harga_bulanan: string;
  harga_tahunan: string;
  batas_rumah: string;
  aktif: boolean;
}

export default function PlatformPaketPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PaketItem | null>(null);
  const [form, setForm] = useState<PaketForm>({
    nama: "",
    harga_bulanan: "",
    harga_tahunan: "",
    batas_rumah: "",
    aktif: true,
  });

  const paketQuery = useQuery({
    queryKey: ["platform", "paket"],
    queryFn: async () => (await platformFetch<PaketItem[]>("/paket")).data,
  });

  useEffect(() => {
    if (editing) {
      setForm({
        nama: editing.nama,
        harga_bulanan: String(Number(editing.harga_bulanan)),
        harga_tahunan: String(Number(editing.harga_tahunan)),
        batas_rumah: editing.batas_rumah === null ? "" : String(editing.batas_rumah),
        aktif: editing.aktif,
      });
    }
  }, [editing]);

  const simpan = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      return platformFetch(`/paket/${editing.kode}`, {
        method: "PATCH",
        body: {
          nama: form.nama,
          harga_bulanan: Number(form.harga_bulanan),
          harga_tahunan: Number(form.harga_tahunan),
          batas_rumah: form.batas_rumah === "" ? null : Number(form.batas_rumah),
          aktif: form.aktif,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Paket diperbarui");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["platform", "paket"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui paket"),
  });

  const paket = paketQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paket Langganan</h1>
        <p className="text-sm text-muted-foreground">Atur harga, kuota rumah, dan status paket.</p>
      </div>

      <DataState
        isLoading={paketQuery.isLoading}
        isError={paketQuery.isError}
        error={paketQuery.error}
        isEmpty={paket.length === 0}
        emptyMessage="Belum ada paket"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paket</TableHead>
                <TableHead>Bulanan</TableHead>
                <TableHead>Tahunan</TableHead>
                <TableHead>Batas Rumah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paket.map((item) => (
                <TableRow key={item.kode}>
                  <TableCell className="font-medium">{item.nama}</TableCell>
                  <TableCell>{formatRupiah(item.harga_bulanan)}</TableCell>
                  <TableCell>{formatRupiah(item.harga_tahunan)}</TableCell>
                  <TableCell>{item.batas_rumah ?? "Tanpa batas"}</TableCell>
                  <TableCell>
                    <Badge variant={item.aktif ? "success" : "secondary"}>
                      {item.aktif ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditing(item)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataState>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Paket {editing?.nama}</DialogTitle>
            <DialogDescription>Perubahan berlaku untuk invoice baru.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paket-nama">Nama</Label>
              <Input
                id="paket-nama"
                value={form.nama}
                onChange={(event) => setForm({ ...form, nama: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paket-bulanan">Harga bulanan</Label>
                <Input
                  id="paket-bulanan"
                  type="number"
                  value={form.harga_bulanan}
                  onChange={(event) => setForm({ ...form, harga_bulanan: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paket-tahunan">Harga tahunan</Label>
                <Input
                  id="paket-tahunan"
                  type="number"
                  value={form.harga_tahunan}
                  onChange={(event) => setForm({ ...form, harga_tahunan: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paket-batas">Batas rumah (kosongkan = tanpa batas)</Label>
              <Input
                id="paket-batas"
                type="number"
                value={form.batas_rumah}
                onChange={(event) => setForm({ ...form, batas_rumah: event.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(event) => setForm({ ...form, aktif: event.target.checked })}
              />
              Paket aktif
            </label>
          </div>
          <DialogFooter>
            <Button disabled={simpan.isPending} onClick={() => simpan.mutate()}>
              {simpan.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
