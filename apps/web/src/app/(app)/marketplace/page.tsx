"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import {
  KONDISI_PRODUK,
  KONDISI_PRODUK_LABELS,
  URUTAN_PRODUK,
  queryKeys,
  type UrutanProduk,
} from "@smarthub/shared";
import { apiFetch, buildQuery } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard, type Kategori, type Produk } from "@/components/marketplace/product-card";

const LIMIT = 12;

const URUTAN_PRODUK_LABELS: Record<UrutanProduk, string> = {
  terbaru: "Terbaru",
  termurah: "Termurah",
  termahal: "Termahal",
};

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kategori, setKategori] = useState("semua");
  const [kondisi, setKondisi] = useState("semua");
  const [urut, setUrut] = useState<UrutanProduk>("terbaru");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const kategoriQuery = useQuery({
    queryKey: queryKeys.marketplaceKategori(),
    queryFn: async () => (await apiFetch<Kategori[]>("/marketplace/kategori")).data,
  });

  const queryParams = {
    q: debouncedSearch || undefined,
    id_kategori_produk: kategori === "semua" ? undefined : Number(kategori),
    kondisi: kondisi === "semua" ? undefined : kondisi,
    urut,
    page,
    limit: LIMIT,
  };

  const produkQuery = useQuery({
    queryKey: queryKeys.marketplaceProduk(queryParams),
    queryFn: async () => apiFetch<Produk[]>(`/marketplace/produk${buildQuery(queryParams)}`),
  });

  const items = produkQuery.data?.data ?? [];
  const meta = produkQuery.data?.meta;
  const kategoriList = kategoriQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Marketplace"
        description="Jual beli barang antar warga lingkungan RT."
        action={
          <Button asChild>
            <Link href="/marketplace/jual">
              <Plus className="h-4 w-4" /> Jual Barang
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari barang..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={kategori}
          onValueChange={(value) => {
            setKategori(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua kategori</SelectItem>
            {kategoriList.map((item) => (
              <SelectItem key={item.id_kategori_produk} value={String(item.id_kategori_produk)}>
                {item.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={kondisi}
          onValueChange={(value) => {
            setKondisi(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Kondisi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua kondisi</SelectItem>
            {KONDISI_PRODUK.map((value) => (
              <SelectItem key={value} value={value}>
                {KONDISI_PRODUK_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={urut}
          onValueChange={(value) => {
            setUrut(value as UrutanProduk);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            {URUTAN_PRODUK.map((value) => (
              <SelectItem key={value} value={value}>
                {URUTAN_PRODUK_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        isLoading={produkQuery.isLoading}
        isError={produkQuery.isError}
        error={produkQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada produk yang cocok"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ProductCard key={item.id_produk} item={item} />
          ))}
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </DataState>
    </div>
  );
}
