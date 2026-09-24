"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { queryKeys } from "@smarthub/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { ProductCard, type Produk } from "@/components/marketplace/product-card";
import { ProductForm } from "@/components/marketplace/product-form";

export default function JualPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Produk | null>(null);

  const produkQuery = useQuery({
    queryKey: queryKeys.marketplaceProdukSaya,
    queryFn: async () => (await apiFetch<Produk[]>("/marketplace/produk-saya")).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["marketplace"] });

  const hapusMutation = useMutation({
    mutationFn: (id_produk: number) =>
      apiFetch(`/marketplace/produk/${id_produk}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Produk dihapus");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal menghapus produk"),
  });

  const moderasiMutation = useMutation({
    mutationFn: ({
      id_produk,
      status,
    }: {
      id_produk: number;
      status: "Aktif" | "Disembunyikan";
    }) =>
      apiFetch(`/marketplace/produk/${id_produk}/status`, { method: "PATCH", body: { status } }),
    onSuccess: (_result, variables) => {
      toast.success(
        variables.status === "Disembunyikan" ? "Produk disembunyikan" : "Produk ditampilkan",
      );
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memoderasi produk"),
  });

  const items = produkQuery.data ?? [];

  const bukaTambah = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const bukaEdit = (produk: Produk) => {
    setEditing(produk);
    setFormOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Produk Saya"
        description="Kelola barang yang Anda jual di marketplace."
        action={
          <Button onClick={bukaTambah}>
            <Plus className="h-4 w-4" /> Pasang Produk
          </Button>
        }
      />

      <DataState
        isLoading={produkQuery.isLoading}
        isError={produkQuery.isError}
        error={produkQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Anda belum memasang produk"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id_produk} className="flex flex-col gap-2">
              <ProductCard
                item={item}
                onHapus={(id) => {
                  if (window.confirm("Hapus produk ini? Tindakan ini tidak dapat dibatalkan.")) {
                    hapusMutation.mutate(id);
                  }
                }}
                onModerasi={(id, status) => moderasiMutation.mutate({ id_produk: id, status })}
              />
              {item.bisa_diedit ? (
                <Button variant="outline" size="sm" onClick={() => bukaEdit(item)}>
                  <Pencil className="h-4 w-4" /> Ubah produk
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </DataState>

      <ProductForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        produk={editing ?? undefined}
        onSaved={() => void invalidate()}
      />
    </div>
  );
}
