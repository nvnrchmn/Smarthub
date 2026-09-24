"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { createKkSchema, formatTanggalSingkat, queryKeys, type CreateKkInput } from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
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

interface KkItem {
  no_kk: string;
  id_rumah: number;
  tgl_dikeluarkan: string | null;
  nomor_rumah: string;
  blok: string;
  jumlah_anggota: number;
}

interface RumahOption {
  id_rumah: number;
  nomor_rumah: string;
  blok: string;
}

export default function KkListPage() {
  const { data: me } = useMe();
  const canManage = me?.role === "Ketua_RT" || me?.role === "Sekretaris";
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [idRumah, setIdRumah] = useState<string>("semua");
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryParams = {
    page,
    limit: 20,
    id_rumah: idRumah === "semua" ? undefined : idRumah,
  };

  const kkQuery = useQuery({
    queryKey: queryKeys.kk(queryParams),
    queryFn: async () => apiFetch<KkItem[]>(`/kependudukan/kk${buildQuery(queryParams)}`),
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
  } = useForm<CreateKkInput>({
    resolver: zodResolver(createKkSchema),
    defaultValues: {
      no_kk: "",
      id_rumah: undefined,
      tgl_dikeluarkan: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateKkInput) =>
      apiFetch("/kependudukan/kk", { method: "POST", body: payload }),
    onSuccess: async () => {
      toast.success("Kartu Keluarga berhasil ditambahkan");
      setDialogOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["kk"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateKkInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal menambahkan Kartu Keluarga");
      }
    },
  });

  const items = kkQuery.data?.data ?? [];
  const meta = kkQuery.data?.meta;
  const rumahOptions = rumahQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kartu Keluarga"
        description="Daftar Kartu Keluarga beserta rumah dan jumlah anggotanya."
        action={
          canManage ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Tambah KK
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Kartu Keluarga</DialogTitle>
                  <DialogDescription>
                    Masukkan nomor KK 16 digit dan pilih rumah tempat KK ini terdaftar.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="no_kk">Nomor KK</Label>
                    <Input id="no_kk" inputMode="numeric" {...register("no_kk")} />
                    {errors.no_kk ? (
                      <p className="text-sm text-destructive">{errors.no_kk.message}</p>
                    ) : null}
                  </div>

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
                            {rumahOptions.map((rumah) => (
                              <SelectItem key={rumah.id_rumah} value={String(rumah.id_rumah)}>
                                {rumah.nomor_rumah} — Blok {rumah.blok}
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
        <Select
          value={idRumah}
          onValueChange={(value) => {
            setIdRumah(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-72">
            <SelectValue placeholder="Filter rumah" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua rumah</SelectItem>
            {rumahOptions.map((rumah) => (
              <SelectItem key={rumah.id_rumah} value={String(rumah.id_rumah)}>
                {rumah.nomor_rumah} — Blok {rumah.blok}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        isLoading={kkQuery.isLoading}
        isError={kkQuery.isError}
        error={kkQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada data Kartu Keluarga"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. KK</TableHead>
                <TableHead>Rumah</TableHead>
                <TableHead className="hidden sm:table-cell">Blok</TableHead>
                <TableHead className="hidden sm:table-cell">Tgl. Dikeluarkan</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((kk) => (
                <TableRow key={kk.no_kk}>
                  <TableCell className="font-medium">{kk.no_kk}</TableCell>
                  <TableCell>{kk.nomor_rumah}</TableCell>
                  <TableCell className="hidden sm:table-cell">{kk.blok}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatTanggalSingkat(kk.tgl_dikeluarkan)}
                  </TableCell>
                  <TableCell>{kk.jumlah_anggota}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/kependudukan/kk/${kk.no_kk}`}>
                        <Users className="h-4 w-4" /> Detail
                      </Link>
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
