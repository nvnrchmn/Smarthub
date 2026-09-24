"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Landmark, Plus, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RekeningItem {
  id_rekening: number;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
  status_verifikasi: string;
}

export default function RekeningPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    bank_code: "",
    bank_name: "",
    account_number: "",
    account_holder: "",
    is_default: true,
  });

  const listQuery = useQuery({
    queryKey: ["rekening"],
    queryFn: async () => (await apiFetch<RekeningItem[]>("/billing/rekening")).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["rekening"] });

  const tambah = useMutation({
    mutationFn: async () => apiFetch("/billing/rekening", { method: "POST", body: form }),
    onSuccess: async () => {
      toast.success("Rekening ditambahkan");
      setDialogOpen(false);
      setForm({ bank_code: "", bank_name: "", account_number: "", account_holder: "", is_default: true });
      await invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Gagal menambah rekening"),
  });

  const hapus = useMutation({
    mutationFn: async (id: number) => apiFetch(`/billing/rekening/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Rekening dihapus");
      await invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Gagal menghapus"),
  });

  const jadikanDefault = useMutation({
    mutationFn: async (id: number) =>
      apiFetch(`/billing/rekening/${id}`, { method: "PATCH", body: { is_default: true } }),
    onSuccess: async () => {
      toast.success("Rekening utama diperbarui");
      await invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui"),
  });

  const items = listQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Rekening Pencairan"
        description="Rekening tujuan pencairan dana iuran RT."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Tambah Rekening
          </Button>
        }
      />

      <DataState
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada rekening pencairan"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Nomor</TableHead>
                <TableHead>Pemilik</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id_rekening}>
                  <TableCell className="font-medium">{item.bank_name} ({item.bank_code})</TableCell>
                  <TableCell>{item.account_number}</TableCell>
                  <TableCell>{item.account_holder}</TableCell>
                  <TableCell>
                    {item.is_default ? <Badge variant="success">Utama</Badge> : <Badge variant="secondary">Cadangan</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!item.is_default ? (
                        <Button variant="outline" size="sm" onClick={() => jadikanDefault.mutate(item.id_rekening)}>
                          Jadikan Utama
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={hapus.isPending}
                        onClick={() => hapus.mutate(item.id_rekening)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" /> Tambah Rekening
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bank_code">Kode Bank</Label>
                <Input id="bank_code" value={form.bank_code} onChange={(e) => setForm({ ...form, bank_code: e.target.value })} placeholder="BCA" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Nama Bank</Label>
                <Input id="bank_name" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">Nomor Rekening</Label>
              <Input
                id="account_number"
                inputMode="numeric"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_holder">Nama Pemilik</Label>
              <Input
                id="account_holder"
                value={form.account_holder}
                onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              />
              Jadikan rekening utama
            </label>
          </div>
          <DialogFooter>
            <Button
              disabled={
                form.bank_code.length < 2 ||
                form.bank_name.length < 2 ||
                !/^\d{6,30}$/.test(form.account_number) ||
                form.account_holder.length < 3 ||
                tambah.isPending
              }
              onClick={() => tambah.mutate()}
            >
              {tambah.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
