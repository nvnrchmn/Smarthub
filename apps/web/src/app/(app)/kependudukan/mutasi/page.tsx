"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Plus, Search, X } from "lucide-react";
import {
  createMutasiSchema,
  formatTanggalSingkat,
  JENIS_MUTASI,
  JENIS_MUTASI_LABELS,
  queryKeys,
  STATUS_VERIFIKASI,
  STATUS_VERIFIKASI_LABELS,
  type CreateMutasiInput,
  type JenisMutasi,
  type StatusVerifikasi,
} from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { StatusVerifikasiBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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

interface MutasiItem {
  id_mutasi: number;
  nik: string;
  nama_lengkap: string;
  jenis_mutasi: JenisMutasi;
  tanggal_peristiwa: string;
  tanggal_lapor: string;
  keterangan: string;
  berkas_pendukung: string | null;
  status_verifikasi: StatusVerifikasi;
  diverifikasi_oleh: string | null;
  diverifikasi_pada: string | null;
}

interface VerifikasiPayload {
  id_mutasi: number;
  status_verifikasi: "Terverifikasi" | "Ditolak";
}

export default function MutasiListPage() {
  const { data: me } = useMe();
  const isSekretaris = me?.role === "Sekretaris";
  const isKetuaRt = me?.role === "Ketua_RT";
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [jenis, setJenis] = useState<string>("semua");
  const [status, setStatus] = useState<string>("semua");
  const [nik, setNik] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryParams = {
    page,
    limit: 20,
    jenis_mutasi: jenis === "semua" ? undefined : jenis,
    status_verifikasi: status === "semua" ? undefined : status,
    nik: nik || undefined,
  };

  const mutasiQuery = useQuery({
    queryKey: queryKeys.mutasi(queryParams),
    queryFn: async () => apiFetch<MutasiItem[]>(`/kependudukan/mutasi${buildQuery(queryParams)}`),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateMutasiInput>({
    resolver: zodResolver(createMutasiSchema),
    defaultValues: {
      nik: "",
      jenis_mutasi: "Datang",
      tanggal_peristiwa: "",
      keterangan: "",
      berkas_pendukung: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateMutasiInput) =>
      apiFetch("/kependudukan/mutasi", { method: "POST", body: payload }),
    onSuccess: async () => {
      toast.success("Peristiwa mutasi berhasil dicatat");
      setDialogOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: queryKeys.mutasi(queryParams) });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateMutasiInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal mencatat peristiwa mutasi");
      }
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (payload: VerifikasiPayload) =>
      apiFetch(`/kependudukan/mutasi/${payload.id_mutasi}/verifikasi`, {
        method: "PATCH",
        body: { status_verifikasi: payload.status_verifikasi },
      }),
    onSuccess: async () => {
      toast.success("Verifikasi mutasi tersimpan");
      await queryClient.invalidateQueries({ queryKey: queryKeys.mutasi(queryParams) });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Gagal memverifikasi mutasi");
      }
    },
  });

  const items = mutasiQuery.data?.data ?? [];
  const meta = mutasiQuery.data?.meta;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Mutasi Kependudukan"
        description="Pencatatan dan verifikasi peristiwa mutasi warga."
        action={
          isSekretaris ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Catat Mutasi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Catat Mutasi</DialogTitle>
                  <DialogDescription>
                    Catat peristiwa kelahiran, kedatangan, kematian, atau kepindahan warga.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={handleSubmit((values) =>
                    createMutation.mutate({
                      ...values,
                      berkas_pendukung:
                        values.berkas_pendukung && values.berkas_pendukung.trim()
                          ? values.berkas_pendukung
                          : undefined,
                    }),
                  )}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="nik">NIK warga</Label>
                    <Input id="nik" inputMode="numeric" {...register("nik")} />
                    {errors.nik ? (
                      <p className="text-sm text-destructive">{errors.nik.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Jenis mutasi</Label>
                      <Controller
                        control={control}
                        name="jenis_mutasi"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {JENIS_MUTASI.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {JENIS_MUTASI_LABELS[value as JenisMutasi]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tanggal_peristiwa">Tanggal peristiwa</Label>
                      <Input id="tanggal_peristiwa" type="date" {...register("tanggal_peristiwa")} />
                      {errors.tanggal_peristiwa ? (
                        <p className="text-sm text-destructive">
                          {errors.tanggal_peristiwa.message}
                        </p>
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

                  <div className="space-y-2">
                    <Label htmlFor="berkas_pendukung">Berkas pendukung (URL, opsional)</Label>
                    <Input
                      id="berkas_pendukung"
                      placeholder="https://..."
                      {...register("berkas_pendukung", {
                        setValueAs: (value) => (value === "" ? undefined : value),
                      })}
                    />
                    {errors.berkas_pendukung ? (
                      <p className="text-sm text-destructive">
                        {errors.berkas_pendukung.message}
                      </p>
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari NIK..."
            value={nik}
            onChange={(event) => {
              setNik(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={jenis}
          onValueChange={(value) => {
            setJenis(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Jenis mutasi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua jenis</SelectItem>
            {JENIS_MUTASI.map((value) => (
              <SelectItem key={value} value={value}>
                {JENIS_MUTASI_LABELS[value as JenisMutasi]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Status verifikasi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {STATUS_VERIFIKASI.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_VERIFIKASI_LABELS[value as StatusVerifikasi]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        isLoading={mutasiQuery.isLoading}
        isError={mutasiQuery.isError}
        error={mutasiQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada catatan mutasi"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warga</TableHead>
                <TableHead className="hidden sm:table-cell">Jenis</TableHead>
                <TableHead className="hidden sm:table-cell">Tgl. Peristiwa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((mutasi) => (
                <TableRow key={mutasi.id_mutasi}>
                  <TableCell>
                    <p className="font-medium">{mutasi.nama_lengkap}</p>
                    <p className="text-xs text-muted-foreground">NIK {mutasi.nik}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {JENIS_MUTASI_LABELS[mutasi.jenis_mutasi]}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatTanggalSingkat(mutasi.tanggal_peristiwa)}
                  </TableCell>
                  <TableCell>
                    <StatusVerifikasiBadge status={mutasi.status_verifikasi} />
                  </TableCell>
                  <TableCell className="text-right">
                    {isKetuaRt && mutasi.status_verifikasi === "Menunggu_Verifikasi" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={verifyMutation.isPending}
                          onClick={() =>
                            verifyMutation.mutate({
                              id_mutasi: mutasi.id_mutasi,
                              status_verifikasi: "Terverifikasi",
                            })
                          }
                        >
                          <Check className="h-4 w-4" /> Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={verifyMutation.isPending}
                          onClick={() =>
                            verifyMutation.mutate({
                              id_mutasi: mutasi.id_mutasi,
                              status_verifikasi: "Ditolak",
                            })
                          }
                        >
                          <X className="h-4 w-4" /> Tolak
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {mutasi.diverifikasi_oleh ?? "-"}
                      </span>
                    )}
                  </TableCell>
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
