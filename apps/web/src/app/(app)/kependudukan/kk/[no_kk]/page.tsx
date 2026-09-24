"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  formatTanggal,
  HUBUNGAN_KELUARGA_LABELS,
  queryKeys,
  toDateInputValue,
  updateKkSchema,
  type HubunganKeluarga,
  type StatusAktif,
  type UpdateKkInput,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AnggotaKeluarga {
  nik: string;
  nama_lengkap: string;
  no_kk: string;
  status_hubungan_keluarga: HubunganKeluarga;
  status_aktif: StatusAktif;
}

interface KkDetail {
  no_kk: string;
  id_rumah: number;
  tgl_dikeluarkan: string | null;
  anggota_keluarga: AnggotaKeluarga[];
}

interface RumahOption {
  id_rumah: number;
  nomor_rumah: string;
  blok: string;
}

export default function KkDetailPage() {
  const params = useParams<{ no_kk: string }>();
  const noKk = params.no_kk;
  const { data: me } = useMe();
  const canManage = me?.role === "Ketua_RT" || me?.role === "Sekretaris";
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);

  const kkQuery = useQuery({
    queryKey: queryKeys.kkDetail(noKk),
    queryFn: async () => (await apiFetch<KkDetail>(`/kependudukan/kk/${noKk}`)).data,
    enabled: Boolean(noKk),
  });

  const rumahQuery = useQuery({
    queryKey: queryKeys.rumah({ limit: 100 }),
    queryFn: async () =>
      (await apiFetch<RumahOption[]>(`/wilayah/rumah${buildQuery({ limit: 100 })}`)).data,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateKkInput>({
    resolver: zodResolver(updateKkSchema),
    defaultValues: {
      id_rumah: undefined,
      tgl_dikeluarkan: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateKkInput) =>
      apiFetch(`/kependudukan/kk/${noKk}`, { method: "PATCH", body: payload }),
    onSuccess: async () => {
      toast.success("Data Kartu Keluarga diperbarui");
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.kkDetail(noKk) });
      await queryClient.invalidateQueries({ queryKey: ["kk"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof UpdateKkInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal memperbarui Kartu Keluarga");
      }
    },
  });

  const kk = kkQuery.data;
  const rumahOptions = rumahQuery.data ?? [];
  const rumah = rumahOptions.find((item) => item.id_rumah === kk?.id_rumah);
  const anggota = kk?.anggota_keluarga ?? [];

  const openEdit = (open: boolean) => {
    setDialogOpen(open);
    if (open && kk) {
      reset({
        id_rumah: kk.id_rumah,
        tgl_dikeluarkan: toDateInputValue(kk.tgl_dikeluarkan),
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={kk ? `KK ${kk.no_kk}` : "Detail Kartu Keluarga"}
        description={kk ? `${anggota.length} anggota keluarga terdaftar` : undefined}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/kependudukan/kk">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Link>
            </Button>
            {canManage && kk ? (
              <Dialog open={dialogOpen} onOpenChange={openEdit}>
                <DialogTrigger asChild>
                  <Button>
                    <Pencil className="h-4 w-4" /> Ubah Data KK
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ubah Data Kartu Keluarga</DialogTitle>
                    <DialogDescription>
                      Perbarui rumah atau tanggal dikeluarkannya Kartu Keluarga.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    className="space-y-4"
                    onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
                    noValidate
                  >
                    <div className="space-y-2">
                      <Label>Rumah</Label>
                      <Controller
                        control={control}
                        name="id_rumah"
                        render={({ field }) => (
                          <Select
                            value={field.value ? String(field.value) : undefined}
                            onValueChange={(value) => field.onChange(Number(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih rumah" />
                            </SelectTrigger>
                            <SelectContent>
                              {rumahOptions.map((option) => (
                                <SelectItem key={option.id_rumah} value={String(option.id_rumah)}>
                                  {option.nomor_rumah} — Blok {option.blok}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.id_rumah ? (
                        <p className="text-sm text-destructive">{errors.id_rumah.message}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tgl_dikeluarkan">Tanggal dikeluarkan</Label>
                      <Input id="tgl_dikeluarkan" type="date" {...register("tgl_dikeluarkan")} />
                      {errors.tgl_dikeluarkan ? (
                        <p className="text-sm text-destructive">{errors.tgl_dikeluarkan.message}</p>
                      ) : null}
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        }
      />

      <DataState isLoading={kkQuery.isLoading} isError={kkQuery.isError} error={kkQuery.error}>
        {kk ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Kartu Keluarga</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Nomor KK</p>
                  <p className="font-medium">{kk.no_kk}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rumah</p>
                  <p className="font-medium">
                    {rumah ? `${rumah.nomor_rumah} — Blok ${rumah.blok}` : `#${kk.id_rumah}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal dikeluarkan</p>
                  <p className="font-medium">{formatTanggal(kk.tgl_dikeluarkan)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anggota Keluarga</CardTitle>
                <CardDescription>
                  Daftar anggota yang terdaftar pada Kartu Keluarga ini.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {anggota.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada anggota keluarga.</p>
                ) : (
                  <div className="rounded-lg border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead className="hidden sm:table-cell">NIK</TableHead>
                          <TableHead>Hubungan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {anggota.map((member) => (
                          <TableRow key={member.nik}>
                            <TableCell className="font-medium">{member.nama_lengkap}</TableCell>
                            <TableCell className="hidden sm:table-cell">{member.nik}</TableCell>
                            <TableCell>
                              {HUBUNGAN_KELUARGA_LABELS[member.status_hubungan_keluarga]}
                            </TableCell>
                            <TableCell>
                              <StatusAktifBadge status={member.status_aktif} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/kependudukan/warga/${member.nik}`}>Detail</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DataState>
    </div>
  );
}
