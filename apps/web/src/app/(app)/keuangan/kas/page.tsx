"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  JENIS_KAS,
  JENIS_KAS_LABELS,
  STATUS_VERIFIKASI,
  STATUS_VERIFIKASI_LABELS,
  createKasSchema,
  formatRupiah,
  formatTanggal,
  queryKeys,
  type CreateKasInput,
  type JenisKas,
  type StatusVerifikasi,
} from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { StatusVerifikasiBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface KasItem {
  id_transaksi: number;
  id_kategori: number;
  nama_kategori: string;
  jenis: JenisKas;
  id_pengurus: number;
  email_pengurus: string;
  tanggal: string;
  jumlah: string;
  keterangan: string;
  status_verifikasi: StatusVerifikasi;
  diverifikasi_oleh: number | null;
  diverifikasi_pada: string | null;
}

interface KategoriItem {
  id_kategori: number;
  nama_kategori: string;
  jenis: JenisKas;
}

export default function KasListPage() {
  const { data: me } = useMe();
  const canCreate = me?.role === "Bendahara";
  const canVerify = me?.role === "Ketua_RT";

  const [page, setPage] = useState(1);
  const [jenis, setJenis] = useState<string>("semua");
  const [statusVerifikasi, setStatusVerifikasi] = useState<string>("semua");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const queryParams = {
    page,
    limit: 20,
    jenis: jenis === "semua" ? undefined : jenis,
    status_verifikasi: statusVerifikasi === "semua" ? undefined : statusVerifikasi,
    dari: dari || undefined,
    sampai: sampai || undefined,
  };

  const kasQuery = useQuery({
    queryKey: queryKeys.kas(queryParams),
    queryFn: async () => apiFetch<KasItem[]>(`/keuangan/kas${buildQuery(queryParams)}`),
  });

  const kategoriQuery = useQuery({
    queryKey: queryKeys.kategori({ limit: 100 }),
    queryFn: async () =>
      (await apiFetch<KategoriItem[]>(`/keuangan/kategori${buildQuery({ limit: 100 })}`)).data,
    enabled: canCreate,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateKasInput>({
    resolver: zodResolver(createKasSchema),
    defaultValues: { tanggal: new Date().toISOString().slice(0, 10), keterangan: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateKasInput) =>
      apiFetch("/keuangan/kas", { method: "POST", body: payload }),
    onSuccess: async () => {
      toast.success("Transaksi kas berhasil dicatat");
      setDialogOpen(false);
      reset({ tanggal: new Date().toISOString().slice(0, 10), keterangan: "" });
      await queryClient.invalidateQueries({ queryKey: ["kas"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateKasInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal mencatat transaksi kas");
      }
    },
  });

  const verifikasiMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "Terverifikasi" | "Ditolak" }) =>
      apiFetch(`/keuangan/kas/${id}/verifikasi`, {
        method: "PATCH",
        body: { status_verifikasi: status },
      }),
    onSuccess: async () => {
      toast.success("Status transaksi diperbarui");
      await queryClient.invalidateQueries({ queryKey: ["kas"] });
    },
    onError: () => toast.error("Gagal memperbarui status transaksi"),
  });

  const kategoriOptions = kategoriQuery.data ?? [];
  const items = kasQuery.data?.data ?? [];
  const meta = kasQuery.data?.meta;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kas RT"
        description="Buku kas pemasukan dan pengeluaran lingkungan RT."
        action={
          canCreate ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Catat Transaksi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Catat Transaksi Kas</DialogTitle>
                  <DialogDescription>
                    Transaksi baru akan berstatus menunggu verifikasi Ketua RT.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Controller
                      control={control}
                      name="id_kategori"
                      render={({ field }) => (
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {kategoriOptions.map((kategori) => (
                              <SelectItem
                                key={kategori.id_kategori}
                                value={String(kategori.id_kategori)}
                              >
                                {kategori.nama_kategori} - {JENIS_KAS_LABELS[kategori.jenis]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.id_kategori ? (
                      <p className="text-sm text-destructive">{errors.id_kategori.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tanggal">Tanggal</Label>
                      <Input id="tanggal" type="date" {...register("tanggal")} />
                      {errors.tanggal ? (
                        <p className="text-sm text-destructive">{errors.tanggal.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jumlah">Jumlah</Label>
                      <Input
                        id="jumlah"
                        type="number"
                        inputMode="numeric"
                        {...register("jumlah", { valueAsNumber: true })}
                      />
                      {errors.jumlah ? (
                        <p className="text-sm text-destructive">{errors.jumlah.message}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keterangan">Keterangan</Label>
                    <Textarea id="keterangan" rows={3} {...register("keterangan")} />
                    {errors.keterangan ? (
                      <p className="text-sm text-destructive">{errors.keterangan.message}</p>
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

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          value={jenis}
          onValueChange={(value) => {
            setJenis(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua jenis</SelectItem>
            {JENIS_KAS.map((value) => (
              <SelectItem key={value} value={value}>
                {JENIS_KAS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusVerifikasi}
          onValueChange={(value) => {
            setStatusVerifikasi(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status verifikasi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {STATUS_VERIFIKASI.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_VERIFIKASI_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dari}
          onChange={(event) => {
            setDari(event.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          value={sampai}
          onChange={(event) => {
            setSampai(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataState
        isLoading={kasQuery.isLoading}
        isError={kasQuery.isError}
        error={kasQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada transaksi kas"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="hidden lg:table-cell">Keterangan</TableHead>
                <TableHead>Status</TableHead>
                {canVerify ? <TableHead className="text-right">Aksi</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((transaksi) => (
                <TableRow key={transaksi.id_transaksi}>
                  <TableCell className="font-medium">{formatTanggal(transaksi.tanggal)}</TableCell>
                  <TableCell>{transaksi.nama_kategori}</TableCell>
                  <TableCell>
                    <Badge variant={transaksi.jenis === "Pemasukan" ? "success" : "destructive"}>
                      {JENIS_KAS_LABELS[transaksi.jenis]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      transaksi.jenis === "Pemasukan" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatRupiah(transaksi.jumlah)}
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate lg:table-cell">
                    {transaksi.keterangan}
                  </TableCell>
                  <TableCell>
                    <StatusVerifikasiBadge status={transaksi.status_verifikasi} />
                  </TableCell>
                  {canVerify ? (
                    <TableCell className="text-right">
                      {transaksi.status_verifikasi === "Menunggu_Verifikasi" ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={verifikasiMutation.isPending}
                            onClick={() =>
                              verifikasiMutation.mutate({
                                id: transaksi.id_transaksi,
                                status: "Terverifikasi",
                              })
                            }
                          >
                            Verifikasi
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={verifikasiMutation.isPending}
                            onClick={() =>
                              verifikasiMutation.mutate({
                                id: transaksi.id_transaksi,
                                status: "Ditolak",
                              })
                            }
                          >
                            Tolak
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </DataState>
    </div>
  );
}
