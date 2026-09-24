"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import {
  createKategoriProdukSchema,
  queryKeys,
  updateKategoriProdukSchema,
  type CreateKategoriProdukInput,
  type UpdateKategoriProdukInput,
} from "@smarthub/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState, EmptyState } from "@/components/data-state";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Kategori } from "@/components/marketplace/product-card";

const slugToUndefined = (value: string) => (value.trim() === "" ? undefined : value.trim());

export default function KategoriProdukPage() {
  const { data: me } = useMe();
  const canManage = me?.role === "Ketua_RT" || me?.role === "Sekretaris";
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Kategori | null>(null);

  const kategoriQuery = useQuery({
    queryKey: queryKeys.marketplaceKategori(),
    queryFn: async () => (await apiFetch<Kategori[]>("/marketplace/kategori")).data,
  });

  const createForm = useForm<CreateKategoriProdukInput>({
    resolver: zodResolver(createKategoriProdukSchema),
    defaultValues: { nama: "", slug: undefined, aktif: true },
  });

  const editForm = useForm<UpdateKategoriProdukInput>({
    resolver: zodResolver(updateKategoriProdukSchema),
    defaultValues: { nama: "", slug: undefined, aktif: true },
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({ nama: editing.nama, slug: editing.slug, aktif: editing.aktif });
    }
  }, [editing, editForm]);

  const createMutation = useMutation({
    mutationFn: (values: CreateKategoriProdukInput) =>
      apiFetch("/marketplace/kategori", { method: "POST", body: values }),
    onSuccess: () => {
      toast.success("Kategori ditambahkan");
      setDialogOpen(false);
      createForm.reset();
      void queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          createForm.setError(field as keyof CreateKategoriProdukInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal menambahkan kategori");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: UpdateKategoriProdukInput }) =>
      apiFetch(`/marketplace/kategori/${id}`, { method: "PATCH", body: values }),
    onSuccess: () => {
      toast.success("Kategori diperbarui");
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          editForm.setError(field as keyof UpdateKategoriProdukInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal memperbarui kategori");
      }
    },
  });

  const items = kategoriQuery.data ?? [];

  if (me && !canManage) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Kategori Produk"
          description="Kelompok barang pada marketplace."
        />
        <EmptyState message="Halaman ini hanya dapat diakses oleh Ketua RT dan Sekretaris." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kategori Produk"
        description="Kelompok barang pada marketplace."
        action={
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) createForm.reset();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Tambah Kategori
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Kategori</DialogTitle>
                <DialogDescription>
                  Buat kategori baru untuk mengelompokkan produk marketplace.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="nama_kategori">Nama kategori</Label>
                  <Input id="nama_kategori" {...createForm.register("nama")} />
                  {createForm.formState.errors.nama ? (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.nama.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug_kategori">Slug (opsional)</Label>
                  <Input
                    id="slug_kategori"
                    placeholder="otomatis dari nama"
                    {...createForm.register("slug", { setValueAs: slugToUndefined })}
                  />
                  {createForm.formState.errors.slug ? (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.slug.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="aktif_kategori"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    {...createForm.register("aktif")}
                  />
                  <Label htmlFor="aktif_kategori">Aktif</Label>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataState
        isLoading={kategoriQuery.isLoading}
        isError={kategoriQuery.isError}
        error={kategoriQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada kategori produk"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((kategori) => (
                <TableRow key={kategori.id_kategori_produk}>
                  <TableCell className="font-medium">{kategori.nama}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {kategori.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant={kategori.aktif ? "success" : "secondary"}>
                      {kategori.aktif ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditing(kategori)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
            <DialogDescription>Perbarui nama, slug, atau status kategori.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={editForm.handleSubmit((values) => {
              if (editing) updateMutation.mutate({ id: editing.id_kategori_produk, values });
            })}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="edit_nama_kategori">Nama kategori</Label>
              <Input id="edit_nama_kategori" {...editForm.register("nama")} />
              {editForm.formState.errors.nama ? (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.nama.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_slug_kategori">Slug</Label>
              <Input
                id="edit_slug_kategori"
                {...editForm.register("slug", { setValueAs: slugToUndefined })}
              />
              {editForm.formState.errors.slug ? (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.slug.message}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="edit_aktif_kategori"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...editForm.register("aktif")}
              />
              <Label htmlFor="edit_aktif_kategori">Aktif</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={() => setEditing(null)}
              >
                Batal
              </Button>
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
