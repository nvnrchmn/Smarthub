"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Plus, Search } from "lucide-react";
import {
  createRumahSchema,
  queryKeys,
  STATUS_HUNIAN,
  STATUS_HUNIAN_LABELS,
  STATUS_MILIK,
  STATUS_MILIK_LABELS,
  type CreateRumahInput,
  type StatusHunian,
  type StatusMilik,
} from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface RumahItem {
  id_rumah: number;
  nomor_rumah: string;
  blok: string;
  jalan_gang: string;
  status_kepemilikan: StatusMilik;
  status_hunian: StatusHunian;
}

export default function RumahListPage() {
  const { data: me } = useMe();
  const canManage = me?.role === "Ketua_RT" || me?.role === "Sekretaris";

  const [page, setPage] = useState(1);
  const [blok, setBlok] = useState("");
  const [statusHunian, setStatusHunian] = useState<string>("semua");
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const queryParams = {
    page,
    limit: 20,
    blok: blok || undefined,
    status_hunian: statusHunian === "semua" ? undefined : statusHunian,
  };

  const rumahQuery = useQuery({
    queryKey: queryKeys.rumah(queryParams),
    queryFn: async () =>
      apiFetch<RumahItem[]>(`/wilayah/rumah${buildQuery(queryParams)}`),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateRumahInput>({
    resolver: zodResolver(createRumahSchema),
    defaultValues: {
      nomor_rumah: "",
      blok: "",
      jalan_gang: "",
      status_kepemilikan: "Milik_Sendiri",
      status_hunian: "Dihuni",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateRumahInput) =>
      apiFetch("/wilayah/rumah", { method: "POST", body: payload }),
    onSuccess: async () => {
      toast.success("Rumah berhasil ditambahkan");
      setDialogOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["rumah"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateRumahInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal menambahkan rumah");
      }
    },
  });

  const items = rumahQuery.data?.data ?? [];
  const meta = rumahQuery.data?.meta;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Data Rumah"
        description="Inventaris rumah dan status hunian di lingkungan RT."
        action={
          canManage ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Tambah Rumah
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Rumah</DialogTitle>
                  <DialogDescription>
                    Isi data inventaris rumah sesuai kondisi lapangan.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nomor_rumah">Nomor rumah</Label>
                      <Input id="nomor_rumah" {...register("nomor_rumah")} />
                      {errors.nomor_rumah ? (
                        <p className="text-sm text-destructive">{errors.nomor_rumah.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="blok">Blok</Label>
                      <Input id="blok" {...register("blok")} />
                      {errors.blok ? (
                        <p className="text-sm text-destructive">{errors.blok.message}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jalan_gang">Jalan / Gang</Label>
                    <Input id="jalan_gang" {...register("jalan_gang")} />
                    {errors.jalan_gang ? (
                      <p className="text-sm text-destructive">{errors.jalan_gang.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status kepemilikan</Label>
                      <Controller
                        control={control}
                        name="status_kepemilikan"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_MILIK.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {STATUS_MILIK_LABELS[value]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status hunian</Label>
                      <Controller
                        control={control}
                        name="status_hunian"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_HUNIAN.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {STATUS_HUNIAN_LABELS[value]}
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
            placeholder="Cari blok..."
            value={blok}
            onChange={(event) => {
              setBlok(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={statusHunian}
          onValueChange={(value) => {
            setStatusHunian(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Status hunian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {STATUS_HUNIAN.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_HUNIAN_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        isLoading={rumahQuery.isLoading}
        isError={rumahQuery.isError}
        error={rumahQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada data rumah"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor</TableHead>
                <TableHead>Blok</TableHead>
                <TableHead className="hidden sm:table-cell">Jalan / Gang</TableHead>
                <TableHead>Kepemilikan</TableHead>
                <TableHead>Hunian</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((rumah) => (
                <TableRow key={rumah.id_rumah}>
                  <TableCell className="font-medium">{rumah.nomor_rumah}</TableCell>
                  <TableCell>{rumah.blok}</TableCell>
                  <TableCell className="hidden sm:table-cell">{rumah.jalan_gang}</TableCell>
                  <TableCell>{STATUS_MILIK_LABELS[rumah.status_kepemilikan]}</TableCell>
                  <TableCell>
                    <Badge variant={rumah.status_hunian === "Dihuni" ? "success" : "secondary"}>
                      {STATUS_HUNIAN_LABELS[rumah.status_hunian]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/wilayah/rumah/${rumah.id_rumah}`}>
                        <Building2 className="h-4 w-4" /> Detail
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
