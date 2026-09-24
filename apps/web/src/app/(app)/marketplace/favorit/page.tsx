"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@smarthub/shared";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { ProductCard, type Produk } from "@/components/marketplace/product-card";

export default function FavoritPage() {
  const favoritQuery = useQuery({
    queryKey: queryKeys.marketplaceFavorit,
    queryFn: async () => (await apiFetch<Produk[]>("/marketplace/favorit")).data,
  });

  const items = favoritQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Produk Favorit"
        description="Barang marketplace yang Anda simpan."
      />

      <DataState
        isLoading={favoritQuery.isLoading}
        isError={favoritQuery.isError}
        error={favoritQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada produk favorit"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ProductCard key={item.id_produk} item={item} />
          ))}
        </div>
      </DataState>
    </div>
  );
}
