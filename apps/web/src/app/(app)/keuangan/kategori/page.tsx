"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import {
  JENIS_KAS,
  JENIS_KAS_LABELS,
  createKategoriSchema,
  queryKeys,
  updateKategoriSchema,
  type CreateKategoriInput,
  type JenisKas,
  type UpdateKategoriInput,
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

interface KategoriItem {
  id_kategori: number;
  nama_kategori: string;
  jenis: JenisKas;
}

export default function KategoriListPage() {
  const { data: me } = useMe();
  const canManage = me?.role === "Bendahara" || me?.role === "Ketua_RT";

  const [page, setPage] = useState(1);
  const [jenis, setJenis] = useState<string>("semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KategoriItem | null>(null);

  const queryClient = useQueryClient();

  const queryParams = {
    page,
    limit: 20,
    jenis: jenis === "semua" ? undefined : jenis,
  };

  const kategoriQuery = useQuery({
    queryKey: queryKeys.kategori(queryParams),
    queryFn: async () => apiFetch<KategoriItem[]>(`/keuangan/kategori${buildQuery(queryParams)}`),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateKategoriInput>({
    resolver: zodResolver(createKategoriSchema),
    defaultValues: { nama_kategori: "", jenis: "Pemasukan" },
  });

  const editForm = useForm<UpdateKategoriInput>({
    resolver: zodResolver(updateKategoriSchema),
    defaultValues: { nama_kategori: "", jenis: "Pemasukan" },
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({ nama_kategori: editing.nama_kategori, jenis: editing.jenis });
    }
  }, [editing, editForm]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateKategoriInput) =>
      apiFetch("/keuangan/kategori", { method: "POST", body: payload }),
    onSuccess: async () => {
      toast.success("Kategori berhasil ditambahkan");
      setDialogOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["kategori-keuangan"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateKategoriInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal menambahkan kategori");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: UpdateKategoriInput }) =>
      apiFetch(`/keuangan/kategori/${id}`, { method: "PATCH", body: values }),
    onSuccess: async () => {
      toast.success("Kategori berhasil diperbarui");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["kategori-keuangan"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          editForm.setError(field as keyof UpdateKategoriInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal memperbarui kategori");
      }
    },
  });

  const items = kategoriQuery.data?.data ?? [];
  const meta = kategoriQuery.data?.meta;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kategori Keuangan"
        description="Kelompok pemasukan dan pengeluaran kas RT."
        action={
          canManage ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Tambah Kategori
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Kategori</DialogTitle>
                  <DialogDescription>
                    Tentukan nama dan jenis kategori untuk pencatatan kas.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="nama_kategori">Nama kategori</Label>
                    <Input id="nama_kategori" {...register("nama_kategori")} />
                    {errors.nama_kategori ? (
                      <p className="text-sm text-destructive">{errors.nama_kategori.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Jenis</Label>
                    <Controller
                      control={control}
                      name="jenis"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JENIS_KAS.map((value) => (
                              <SelectItem key={value} value={value}>
                                {JENIS_KAS_LABELS[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.jenis ? (
                      <p className="text-sm text-destructive">{errors.jenis.message}</p>
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
          value={jenis}
          onValueChange={(value) => {
            setJenis(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Jenis kategori" />
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
      </div>

      <DataState
        isLoading={kategoriQuery.isLoading}
        isError={kategoriQuery.isError}
        error={kategoriQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada kategori keuangan"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kategori</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((kategori) => (
                <TableRow key={kategori.id_kategori}>
                  <TableCell className="font-medium">{kategori.nama_kategori}</TableCell>
                  <TableCell>
                    <Badge variant={kategori.jenis === "Pemasukan" ? "success" : "destructive"}>
                      {JENIS_KAS_LABELS[kategori.jenis]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <Button variant="outline" size="sm" onClick={() => setEditing(kategori)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </DataState>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Kategori</DialogTitle>
            <DialogDescription>Perbarui nama atau jenis kategori keuangan.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={editForm.handleSubmit((values) => {
              if (editing) updateMutation.mutate({ id: editing.id_kategori, values });
            })}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="edit_nama_kategori">Nama kategori</Label>
              <Input id="edit_nama_kategori" {...editForm.register("nama_kategori")} />
              {editForm.formState.errors.nama_kategori ? (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.nama_kategori.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Jenis</Label>
              <Controller
                control={editForm.control}
                name="jenis"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_KAS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {JENIS_KAS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {editForm.formState.errors.jenis ? (
                <p className="text-sm text-destructive">{editForm.formState.errors.jenis.message}</p>
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
    </div>
  );
}
