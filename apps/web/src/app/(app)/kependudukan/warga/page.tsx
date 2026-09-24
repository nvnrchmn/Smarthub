"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import {
  createWargaSchema,
  HUBUNGAN_KELUARGA,
  HUBUNGAN_KELUARGA_LABELS,
  AGAMA,
  JENIS_KELAMIN,
  JENIS_KELAMIN_LABELS,
  queryKeys,
  STATUS_AKTIF,
  STATUS_AKTIF_LABELS,
  STATUS_PERKAWINAN,
  STATUS_TINGGAL,
  STATUS_TINGGAL_LABELS,
  type CreateWargaInput,
  type HubunganKeluarga,
  type JenisKelamin,
  type StatusAktif,
  type StatusTinggal,
} from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { StatusAktifBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface WargaItem {
  nik: string;
  nama_lengkap: string;
  no_kk: string;
  status_hubungan_keluarga: HubunganKeluarga;
  status_aktif: StatusAktif;
}

interface KkOption {
  no_kk: string;
  nomor_rumah: string;
}

export default function WargaListPage() {
  const { data: me } = useMe();
  const canManage = me?.role === "Ketua_RT" || me?.role === "Sekretaris";
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [nama, setNama] = useState("");
  const [noKk, setNoKk] = useState<string>("semua");
  const [statusAktif, setStatusAktif] = useState<string>("semua");
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryParams = {
    page,
    limit: 20,
    nama: nama || undefined,
    no_kk: noKk === "semua" ? undefined : noKk,
    status_aktif: statusAktif === "semua" ? undefined : statusAktif,
  };

  const wargaQuery = useQuery({
    queryKey: queryKeys.warga(queryParams),
    queryFn: async () => apiFetch<WargaItem[]>(`/kependudukan/warga${buildQuery(queryParams)}`),
  });

  const kkQuery = useQuery({
    queryKey: queryKeys.kk({ limit: 100 }),
    queryFn: async () =>
      (await apiFetch<KkOption[]>(`/kependudukan/kk${buildQuery({ limit: 100 })}`)).data,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateWargaInput>({
    resolver: zodResolver(createWargaSchema),
    defaultValues: {
      nik: "",
      no_kk: "",
      nama_lengkap: "",
      tempat_lahir: "",
      tanggal_lahir: "",
      jenis_kelamin: "Laki_Laki",
      pekerjaan: "",
      no_hp: undefined,
      status_hubungan_keluarga: "Kepala_Keluarga",
      status_tinggal: "Tetap",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateWargaInput) =>
      apiFetch("/kependudukan/warga", { method: "POST", body: payload }),
    onSuccess: async () => {
      toast.success("Data warga berhasil ditambahkan");
      setDialogOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["warga"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateWargaInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal menambahkan data warga");
      }
    },
  });

  const items = wargaQuery.data?.data ?? [];
  const meta = wargaQuery.data?.meta;
  const kkOptions = kkQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Data Warga"
        description="Biodata warga dan status kependudukannya."
        action={
          canManage ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Tambah Warga
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Warga</DialogTitle>
                  <DialogDescription>
                    Lengkapi biodata warga sesuai dokumen kependudukan.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={handleSubmit((values) =>
                    createMutation.mutate({
                      ...values,
                      no_hp: values.no_hp && values.no_hp.trim() ? values.no_hp : undefined,
                    }),
                  )}
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nik">NIK</Label>
                      <Input id="nik" inputMode="numeric" {...register("nik")} />
                      {errors.nik ? (
                        <p className="text-sm text-destructive">{errors.nik.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>Kartu Keluarga</Label>
                      <Controller
                        control={control}
                        name="no_kk"
                        render={({ field }) => (
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih KK" />
                            </SelectTrigger>
                            <SelectContent>
                              {kkOptions.map((kk) => (
                                <SelectItem key={kk.no_kk} value={kk.no_kk}>
                                  {kk.no_kk} — Rumah {kk.nomor_rumah}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.no_kk ? (
                        <p className="text-sm text-destructive">{errors.no_kk.message}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nama_lengkap">Nama lengkap</Label>
                    <Input id="nama_lengkap" {...register("nama_lengkap")} />
                    {errors.nama_lengkap ? (
                      <p className="text-sm text-destructive">{errors.nama_lengkap.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tempat_lahir">Tempat lahir</Label>
                      <Input id="tempat_lahir" {...register("tempat_lahir")} />
                      {errors.tempat_lahir ? (
                        <p className="text-sm text-destructive">{errors.tempat_lahir.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tanggal_lahir">Tanggal lahir</Label>
                      <Input id="tanggal_lahir" type="date" {...register("tanggal_lahir")} />
                      {errors.tanggal_lahir ? (
                        <p className="text-sm text-destructive">{errors.tanggal_lahir.message}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Jenis kelamin</Label>
                      <Controller
                        control={control}
                        name="jenis_kelamin"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {JENIS_KELAMIN.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {JENIS_KELAMIN_LABELS[value as JenisKelamin]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agama</Label>
                      <Controller
                        control={control}
                        name="agama"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih agama" />
                            </SelectTrigger>
                            <SelectContent>
                              {AGAMA.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.agama ? (
                        <p className="text-sm text-destructive">{errors.agama.message}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status perkawinan</Label>
                      <Controller
                        control={control}
                        name="status_perkawinan"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih status perkawinan" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_PERKAWINAN.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.status_perkawinan ? (
                        <p className="text-sm text-destructive">
                          {errors.status_perkawinan.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pekerjaan">Pekerjaan</Label>
                      <Input id="pekerjaan" {...register("pekerjaan")} />
                      {errors.pekerjaan ? (
                        <p className="text-sm text-destructive">{errors.pekerjaan.message}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="no_hp">Nomor HP (opsional)</Label>
                    <Input
                      id="no_hp"
                      inputMode="tel"
                      {...register("no_hp", {
                        setValueAs: (value) => (value === "" ? undefined : value),
                      })}
                    />
                    {errors.no_hp ? (
                      <p className="text-sm text-destructive">{errors.no_hp.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Hubungan keluarga</Label>
                      <Controller
                        control={control}
                        name="status_hubungan_keluarga"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HUBUNGAN_KELUARGA.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {HUBUNGAN_KELUARGA_LABELS[value as HubunganKeluarga]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status tinggal</Label>
                      <Controller
                        control={control}
                        name="status_tinggal"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_TINGGAL.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {STATUS_TINGGAL_LABELS[value as StatusTinggal]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
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
            placeholder="Cari nama warga..."
            value={nama}
            onChange={(event) => {
              setNama(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={noKk}
          onValueChange={(value) => {
            setNoKk(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-64">
            <SelectValue placeholder="Filter KK" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua KK</SelectItem>
            {kkOptions.map((kk) => (
              <SelectItem key={kk.no_kk} value={kk.no_kk}>
                {kk.no_kk} — Rumah {kk.nomor_rumah}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusAktif}
          onValueChange={(value) => {
            setStatusAktif(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {STATUS_AKTIF.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_AKTIF_LABELS[value as StatusAktif]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        isLoading={wargaQuery.isLoading}
        isError={wargaQuery.isError}
        error={wargaQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada data warga"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">NIK</TableHead>
                <TableHead className="hidden sm:table-cell">No. KK</TableHead>
                <TableHead className="hidden sm:table-cell">Hubungan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((warga) => (
                <TableRow key={warga.nik}>
                  <TableCell className="font-medium">{warga.nama_lengkap}</TableCell>
                  <TableCell className="hidden sm:table-cell">{warga.nik}</TableCell>
                  <TableCell className="hidden sm:table-cell">{warga.no_kk}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {HUBUNGAN_KELUARGA_LABELS[warga.status_hubungan_keluarga]}
                  </TableCell>
                  <TableCell>
                    <StatusAktifBadge status={warga.status_aktif} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/kependudukan/warga/${warga.nik}`}>Detail</Link>
                    </Button>
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
