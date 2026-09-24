"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Pencil, UserCog } from "lucide-react";
import {
  formatTanggal,
  AGAMA,
  HUBUNGAN_KELUARGA,
  HUBUNGAN_KELUARGA_LABELS,
  JENIS_KELAMIN,
  JENIS_KELAMIN_LABELS,
  queryKeys,
  STATUS_AKTIF,
  STATUS_AKTIF_LABELS,
  STATUS_PERKAWINAN,
  STATUS_TINGGAL,
  STATUS_TINGGAL_LABELS,
  toDateInputValue,
  updateWargaSchema,
  updateWargaStatusSchema,
  type Agama,
  type HubunganKeluarga,
  type JenisKelamin,
  type StatusAktif,
  type StatusPerkawinan,
  type StatusTinggal,
  type UpdateWargaInput,
  type UpdateWargaStatusInput,
} from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { StatusAktifBadge } from "@/components/status-badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WargaDetail {
  nik: string;
  no_kk: string;
  nama_lengkap: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: JenisKelamin;
  agama: Agama;
  status_perkawinan: StatusPerkawinan;
  pekerjaan: string;
  no_hp: string | null;
  status_hubungan_keluarga: HubunganKeluarga;
  status_tinggal: StatusTinggal;
  status_aktif: StatusAktif;
}

interface KkOption {
  no_kk: string;
  nomor_rumah: string;
}

export default function WargaDetailPage() {
  const params = useParams<{ nik: string }>();
  const nik = params.nik;
  const { data: me } = useMe();
  const canManage = me?.role === "Ketua_RT" || me?.role === "Sekretaris";
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const wargaQuery = useQuery({
    queryKey: queryKeys.wargaDetail(nik),
    queryFn: async () => (await apiFetch<WargaDetail>(`/kependudukan/warga/${nik}`)).data,
    enabled: Boolean(nik),
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
  } = useForm<UpdateWargaInput>({
    resolver: zodResolver(updateWargaSchema),
    defaultValues: {},
  });

  const statusForm = useForm<UpdateWargaStatusInput>({
    resolver: zodResolver(updateWargaStatusSchema),
    defaultValues: { status_aktif: "Aktif" },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateWargaInput) =>
      apiFetch(`/kependudukan/warga/${nik}`, { method: "PATCH", body: payload }),
    onSuccess: async () => {
      toast.success("Biodata warga diperbarui");
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.wargaDetail(nik) });
      await queryClient.invalidateQueries({ queryKey: ["warga"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof UpdateWargaInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal memperbarui biodata warga");
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: UpdateWargaStatusInput) =>
      apiFetch(`/kependudukan/warga/${nik}/status`, { method: "PATCH", body: payload }),
    onSuccess: async () => {
      toast.success("Status warga diperbarui");
      setStatusOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.wargaDetail(nik) });
      await queryClient.invalidateQueries({ queryKey: ["warga"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Gagal memperbarui status warga");
      }
    },
  });

  const warga = wargaQuery.data;
  const kkOptions = kkQuery.data ?? [];

  const openEdit = (open: boolean) => {
    setEditOpen(open);
    if (open && warga) {
      reset({
        no_kk: warga.no_kk,
        nama_lengkap: warga.nama_lengkap,
        tempat_lahir: warga.tempat_lahir,
        tanggal_lahir: toDateInputValue(warga.tanggal_lahir),
        jenis_kelamin: warga.jenis_kelamin,
        agama: warga.agama,
        status_perkawinan: warga.status_perkawinan,
        pekerjaan: warga.pekerjaan,
        no_hp: warga.no_hp ?? undefined,
        status_hubungan_keluarga: warga.status_hubungan_keluarga,
        status_tinggal: warga.status_tinggal,
      });
    }
  };

  const openStatus = (open: boolean) => {
    setStatusOpen(open);
    if (open && warga) {
      statusForm.reset({ status_aktif: warga.status_aktif });
    }
  };

  const konfirmasiStatus = statusForm.handleSubmit((values) => statusMutation.mutate(values));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={warga ? warga.nama_lengkap : "Detail Warga"}
        description={warga ? `NIK ${warga.nik}` : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/kependudukan/warga">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Link>
            </Button>
            {canManage && warga ? (
              <>
                <Dialog open={editOpen} onOpenChange={openEdit}>
                  <DialogTrigger asChild>
                    <Button>
                      <Pencil className="h-4 w-4" /> Ubah Biodata
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ubah Biodata Warga</DialogTitle>
                      <DialogDescription>
                        Perbarui data kependudukan warga sesuai dokumen terbaru.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      className="space-y-4"
                      onSubmit={handleSubmit((values) =>
                        updateMutation.mutate({
                          ...values,
                          no_hp: values.no_hp && values.no_hp.trim() ? values.no_hp : undefined,
                        }),
                      )}
                      noValidate
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Kartu Keluarga</Label>
                          <Controller
                            control={control}
                            name="no_kk"
                            render={({ field }) => (
                              <Select
                                value={field.value || undefined}
                                onValueChange={field.onChange}
                              >
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
                        <div className="space-y-2">
                          <Label htmlFor="nama_lengkap">Nama lengkap</Label>
                          <Input id="nama_lengkap" {...register("nama_lengkap")} />
                          {errors.nama_lengkap ? (
                            <p className="text-sm text-destructive">
                              {errors.nama_lengkap.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="tempat_lahir">Tempat lahir</Label>
                          <Input id="tempat_lahir" {...register("tempat_lahir")} />
                          {errors.tempat_lahir ? (
                            <p className="text-sm text-destructive">
                              {errors.tempat_lahir.message}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tanggal_lahir">Tanggal lahir</Label>
                          <Input id="tanggal_lahir" type="date" {...register("tanggal_lahir")} />
                          {errors.tanggal_lahir ? (
                            <p className="text-sm text-destructive">
                              {errors.tanggal_lahir.message}
                            </p>
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
                        <Button type="submit" disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={statusOpen} onOpenChange={openStatus}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <UserCog className="h-4 w-4" /> Ubah Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ubah Status Warga</DialogTitle>
                      <DialogDescription>
                        Perubahan status akan memengaruhi keanggotaan dan penomoran warga. Tindakan
                        ini tidak dapat dibatalkan.
                      </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={konfirmasiStatus} noValidate>
                      <div className="space-y-2">
                        <Label>Status warga</Label>
                        <Controller
                          control={statusForm.control}
                          name="status_aktif"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_AKTIF.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {STATUS_AKTIF_LABELS[value as StatusAktif]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStatusOpen(false)}
                        >
                          Batal
                        </Button>
                        <Button type="submit" variant="destructive" disabled={statusMutation.isPending}>
                          {statusMutation.isPending ? "Menyimpan..." : "Konfirmasi Ubah Status"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}
          </div>
        }
      />

      <DataState isLoading={wargaQuery.isLoading} isError={wargaQuery.isError} error={wargaQuery.error}>
        {warga ? (
          <Card>
            <CardHeader>
              <CardTitle>Biodata Warga</CardTitle>
              <CardDescription>
                Data kependudukan dan status tinggal warga.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">NIK</p>
                <p className="font-medium">{warga.nik}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nomor KK</p>
                <p className="font-medium">
                  <Link className="underline" href={`/kependudukan/kk/${warga.no_kk}`}>
                    {warga.no_kk}
                  </Link>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Nama lengkap</p>
                <p className="font-medium">{warga.nama_lengkap}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jenis kelamin</p>
                <p className="font-medium">{JENIS_KELAMIN_LABELS[warga.jenis_kelamin]}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tempat / tanggal lahir</p>
                <p className="font-medium">
                  {warga.tempat_lahir}, {formatTanggal(warga.tanggal_lahir)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Agama</p>
                <p className="font-medium">{warga.agama}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status perkawinan</p>
                <p className="font-medium">{warga.status_perkawinan}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pekerjaan</p>
                <p className="font-medium">{warga.pekerjaan}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nomor HP</p>
                <p className="font-medium">{warga.no_hp ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Hubungan keluarga</p>
                <p className="font-medium">
                  {HUBUNGAN_KELUARGA_LABELS[warga.status_hubungan_keluarga]}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status tinggal</p>
                <p className="font-medium">{STATUS_TINGGAL_LABELS[warga.status_tinggal]}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status warga</p>
                <StatusAktifBadge status={warga.status_aktif} />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DataState>
    </div>
  );
}
