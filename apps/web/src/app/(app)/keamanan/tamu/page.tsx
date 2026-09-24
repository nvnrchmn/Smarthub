"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarDays, LogOut, Pencil, Plus, ShieldCheck } from "lucide-react";
import {
  createTamuSchema,
  formatTanggalWaktu,
  queryKeys,
  updateTamuSchema,
  type CreateTamuInput,
  type UpdateTamuInput,
} from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { TamuStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TamuStatus = "didalam" | "keluar";

interface TamuItem {
  id_tamu: number;
  id_rumah_tujuan: number;
  nomor_rumah: string;
  blok: string;
  nama_tamu: string;
  jumlah_tamu: number;
  tgl_datang: string;
  tgl_pergi: string | null;
  keperluan: string;
  status: TamuStatus;
}

const todayValue = () => new Date().toISOString().slice(0, 10);

export default function TamuPage() {
  const { data: me } = useMe();
  const isKeamanan = me?.role === "Keamanan";

  const [page, setPage] = useState(1);
  const [tanggal, setTanggal] = useState(todayValue);
  const [status, setStatus] = useState("semua");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<TamuItem | null>(null);

  const queryClient = useQueryClient();

  const queryParams = {
    page,
    limit: 20,
    tanggal: tanggal || undefined,
    status: status === "semua" ? undefined : status,
  };

  const tamuQuery = useQuery({
    queryKey: queryKeys.tamu(queryParams),
    queryFn: async () => apiFetch<TamuItem[]>(`/keamanan/tamu${buildQuery(queryParams)}`),
  });

  const createForm = useForm<CreateTamuInput>({
    resolver: zodResolver(createTamuSchema),
    defaultValues: { id_rumah_tujuan: 0, nama_tamu: "", jumlah_tamu: 1, keperluan: "" },
  });
  const {
    formState: { errors: createErrors },
  } = createForm;

  const editForm = useForm<UpdateTamuInput>({
    resolver: zodResolver(updateTamuSchema),
  });
  const {
    formState: { errors: editErrors },
  } = editForm;

  const createMutation = useMutation({
    mutationFn: async (payload: CreateTamuInput) =>
      apiFetch("/keamanan/tamu", { method: "POST", body: payload }),
    onSuccess: async () => {
      toast.success("Tamu berhasil dicatat");
      setCreateOpen(false);
      createForm.reset();
      await queryClient.invalidateQueries({ queryKey: queryKeys.tamu() });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          createForm.setError(field as keyof CreateTamuInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal mencatat tamu");
      }
    },
  });

  const editMutation = useMutation({
    mutationFn: async (payload: { id_tamu: number; values: UpdateTamuInput }) =>
      apiFetch(`/keamanan/tamu/${payload.id_tamu}`, { method: "PATCH", body: payload.values }),
    onSuccess: async () => {
      toast.success("Data tamu diperbarui");
      setEditOpen(false);
      setEditItem(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tamu() });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          editForm.setError(field as keyof UpdateTamuInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal memperbarui data tamu");
      }
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (idTamu: number) =>
      apiFetch(`/keamanan/tamu/${idTamu}/checkout`, { method: "PUT" }),
    onSuccess: async () => {
      toast.success("Tamu berhasil check-out");
      await queryClient.invalidateQueries({ queryKey: queryKeys.tamu() });
    },
    onError: () => toast.error("Gagal melakukan check-out"),
  });

  const items = tamuQuery.data?.data ?? [];
  const meta = tamuQuery.data?.meta;
  const detailItem = items.find((item) => item.id_tamu === detailId) ?? null;

  const startEdit = (item: TamuItem) => {
    editForm.reset({
      id_rumah_tujuan: item.id_rumah_tujuan,
      nama_tamu: item.nama_tamu,
      jumlah_tamu: item.jumlah_tamu,
      keperluan: item.keperluan,
    });
    setDetailId(null);
    setEditItem(item);
    setEditOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Buku Tamu"
        description="Catatan tamu yang masuk ke lingkungan RT."
        action={
          isKeamanan ? (
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                setCreateOpen(open);
                if (!open) createForm.reset();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Catat Tamu Masuk
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Catat Tamu Masuk</DialogTitle>
                  <DialogDescription>
                    Isi data tamu yang akan masuk ke lingkungan RT.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="nama_tamu">Nama tamu</Label>
                    <Input id="nama_tamu" {...createForm.register("nama_tamu")} />
                    {createErrors.nama_tamu ? (
                      <p className="text-sm text-destructive">{createErrors.nama_tamu.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="jumlah_tamu">Jumlah tamu</Label>
                      <Input
                        id="jumlah_tamu"
                        type="number"
                        min={1}
                        {...createForm.register("jumlah_tamu")}
                      />
                      {createErrors.jumlah_tamu ? (
                        <p className="text-sm text-destructive">{createErrors.jumlah_tamu.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="id_rumah_tujuan">ID Rumah Tujuan</Label>
                      <Input
                        id="id_rumah_tujuan"
                        type="number"
                        min={1}
                        {...createForm.register("id_rumah_tujuan")}
                      />
                      <p className="text-xs text-muted-foreground">
                        Masukkan ID rumah tujuan sesuai data rumah RT.
                      </p>
                      {createErrors.id_rumah_tujuan ? (
                        <p className="text-sm text-destructive">
                          {createErrors.id_rumah_tujuan.message}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keperluan">Keperluan</Label>
                    <Textarea id="keperluan" rows={3} {...createForm.register("keperluan")} />
                    {createErrors.keperluan ? (
                      <p className="text-sm text-destructive">{createErrors.keperluan.message}</p>
                    ) : null}
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            type="date"
            value={tanggal}
            onChange={(event) => {
              setTanggal(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            <SelectItem value="didalam">Di Dalam</SelectItem>
            <SelectItem value="keluar">Sudah Keluar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataState
        isLoading={tamuQuery.isLoading}
        isError={tamuQuery.isError}
        error={tamuQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada catatan tamu"
      >
        <div className="space-y-3">
          {items.map((tamu) => (
            <Card key={tamu.id_tamu}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="rounded-full bg-muted p-2 text-muted-foreground">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="font-medium">{tamu.nama_tamu}</p>
                    <p className="text-xs text-muted-foreground">
                      Rumah {tamu.nomor_rumah} (Blok {tamu.blok}) • {tamu.jumlah_tamu} orang
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Datang {formatTanggalWaktu(tamu.tgl_datang)}
                      {tamu.tgl_pergi ? ` • Keluar ${formatTanggalWaktu(tamu.tgl_pergi)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TamuStatusBadge status={tamu.status} />
                  <Button variant="outline" size="sm" onClick={() => setDetailId(tamu.id_tamu)}>
                    Detail
                  </Button>
                  {isKeamanan && tamu.status === "didalam" ? (
                    <Button
                      size="sm"
                      disabled={checkoutMutation.isPending}
                      onClick={() => checkoutMutation.mutate(tamu.id_tamu)}
                    >
                      <LogOut className="h-4 w-4" /> Check-out
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </DataState>

      <Dialog
        open={detailItem !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Tamu</DialogTitle>
            <DialogDescription>Informasi lengkap kunjungan tamu.</DialogDescription>
          </DialogHeader>
          {detailItem ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <TamuStatusBadge status={detailItem.status} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Nama tamu</span>
                <span className="text-right font-medium">{detailItem.nama_tamu}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Jumlah orang</span>
                <span className="text-right font-medium">{detailItem.jumlah_tamu}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Rumah tujuan</span>
                <span className="text-right font-medium">
                  {detailItem.nomor_rumah} (Blok {detailItem.blok})
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">ID rumah tujuan</span>
                <span className="text-right font-medium">{detailItem.id_rumah_tujuan}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Waktu datang</span>
                <span className="text-right font-medium">
                  {formatTanggalWaktu(detailItem.tgl_datang)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Waktu keluar</span>
                <span className="text-right font-medium">
                  {detailItem.tgl_pergi ? formatTanggalWaktu(detailItem.tgl_pergi) : "-"}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Keperluan</p>
                <p className="font-medium">{detailItem.keperluan}</p>
              </div>
            </div>
          ) : null}
          {isKeamanan && detailItem ? (
            <DialogFooter>
              <Button variant="outline" onClick={() => startEdit(detailItem)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              {detailItem.status === "didalam" ? (
                <Button
                  disabled={checkoutMutation.isPending}
                  onClick={() => checkoutMutation.mutate(detailItem.id_tamu)}
                >
                  <LogOut className="h-4 w-4" /> Check-out
                </Button>
              ) : null}
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditItem(null);
            editForm.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Data Tamu</DialogTitle>
            <DialogDescription>Perbarui data kunjungan tamu bila ada perubahan.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={editForm.handleSubmit((values) => {
              if (!editItem) return;
              editMutation.mutate({ id_tamu: editItem.id_tamu, values });
            })}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="edit_nama_tamu">Nama tamu</Label>
              <Input id="edit_nama_tamu" {...editForm.register("nama_tamu")} />
              {editErrors.nama_tamu ? (
                <p className="text-sm text-destructive">{editErrors.nama_tamu.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_jumlah_tamu">Jumlah tamu</Label>
                <Input
                  id="edit_jumlah_tamu"
                  type="number"
                  min={1}
                  {...editForm.register("jumlah_tamu")}
                />
                {editErrors.jumlah_tamu ? (
                  <p className="text-sm text-destructive">{editErrors.jumlah_tamu.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_id_rumah_tujuan">ID Rumah Tujuan</Label>
                <Input
                  id="edit_id_rumah_tujuan"
                  type="number"
                  min={1}
                  {...editForm.register("id_rumah_tujuan")}
                />
                {editErrors.id_rumah_tujuan ? (
                  <p className="text-sm text-destructive">{editErrors.id_rumah_tujuan.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_keperluan">Keperluan</Label>
              <Textarea id="edit_keperluan" rows={3} {...editForm.register("keperluan")} />
              {editErrors.keperluan ? (
                <p className="text-sm text-destructive">{editErrors.keperluan.message}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editMutation.isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
