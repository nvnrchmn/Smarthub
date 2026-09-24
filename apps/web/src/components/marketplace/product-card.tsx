"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Heart, MoreHorizontal, ShoppingBag, Trash2 } from "lucide-react";
import {
  KONDISI_PRODUK_LABELS,
  STATUS_PRODUK_LABELS,
  formatRupiah,
  type AlasanLaporan,
  type KondisiProduk,
  type Role,
  type StatusLaporan,
  type StatusProduk,
} from "@smarthub/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ProdukPenjual {
  id_pengguna: number;
  nama_lengkap: string | null;
  role: Role;
  tampilkan_kontak: boolean;
  kontak_wa: string | null;
}

export interface Produk {
  id_produk: number;
  judul: string;
  deskripsi: string;
  harga: string;
  kondisi: KondisiProduk;
  satuan: string;
  bisa_nego: boolean;
  status: StatusProduk;
  jumlah_dilihat: number;
  createdAt: string;
  updatedAt: string;
  id_kategori_produk: number | null;
  nama_kategori: string | null;
  penjual: ProdukPenjual;
  foto: string[];
  difavoritkan: boolean;
  bisa_diedit: boolean;
  bisa_dihapus: boolean;
  bisa_dimoderasi: boolean;
  jumlah_laporan_baru: number | null;
}

export interface Kategori {
  id_kategori_produk: number;
  nama: string;
  slug: string;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Laporan {
  id_laporan: number;
  id_produk: number;
  judul_produk: string;
  status_produk: StatusProduk;
  alasan: AlasanLaporan;
  keterangan: string | null;
  status: StatusLaporan;
  createdAt: string;
  ditangani_oleh: number | null;
  ditangani_pada: string | null;
  pelapor: { id_pengguna: number; nama_lengkap: string | null; role: Role };
}

interface FavoritVariables {
  id_produk: number;
  difavoritkan: boolean;
}

const isProduk = (value: unknown): value is Produk =>
  typeof value === "object" &&
  value !== null &&
  "id_produk" in value &&
  "difavoritkan" in value;

const patchCacheProduk = (
  old: unknown,
  id_produk: number,
  difavoritkan: boolean,
): unknown => {
  const update = (produk: Produk): Produk =>
    produk.id_produk === id_produk ? { ...produk, difavoritkan } : produk;

  if (Array.isArray(old)) {
    return old.map((entry) => (isProduk(entry) ? update(entry) : entry));
  }

  if (old && typeof old === "object") {
    const container = old as { data?: unknown };
    if (Array.isArray(container.data)) {
      return {
        ...(old as Record<string, unknown>),
        data: container.data.map((entry) => (isProduk(entry) ? update(entry) : entry)),
      };
    }
    if (isProduk(old)) return update(old);
  }

  return old;
};

export const ProductCard = ({
  item,
  onToggleFavorit,
  onHapus,
  onModerasi,
  kompak = false,
}: {
  item: Produk;
  onToggleFavorit?: (id_produk: number) => void;
  onHapus?: (id_produk: number) => void;
  onModerasi?: (id_produk: number, status: "Aktif" | "Disembunyikan") => void;
  kompak?: boolean;
}) => {
  const queryClient = useQueryClient();

  const favoritMutation = useMutation({
    mutationFn: ({ id_produk, difavoritkan }: FavoritVariables) =>
      apiFetch(`/marketplace/produk/${id_produk}/favorit`, {
        method: difavoritkan ? "POST" : "DELETE",
      }),
    onMutate: async ({ id_produk, difavoritkan }) => {
      await queryClient.cancelQueries({ queryKey: ["marketplace"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["marketplace"] });

      snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, patchCacheProduk(data, id_produk, difavoritkan));
      });

      return { snapshots };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui favorit");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["marketplace"] }),
  });

  const adaMenu = Boolean(onHapus ?? onModerasi);
  const disembunyikan = item.status === "Disembunyikan";

  const favoritKlik = () => {
    if (onToggleFavorit) {
      onToggleFavorit(item.id_produk);
      return;
    }
    favoritMutation.mutate({ id_produk: item.id_produk, difavoritkan: !item.difavoritkan });
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="relative">
        <Link href={`/marketplace/produk/${item.id_produk}`}>
          <div className="aspect-square w-full overflow-hidden bg-muted">
            {item.foto[0] ? (
              <img src={item.foto[0]} alt={item.judul} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="h-8 w-8" />
              </div>
            )}
          </div>
        </Link>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={item.difavoritkan ? "Hapus dari favorit" : "Tambah ke favorit"}
          className="absolute right-2 top-2 h-8 w-8 rounded-full"
          disabled={!onToggleFavorit && favoritMutation.isPending}
          onClick={favoritKlik}
        >
          <Heart className={cn("h-4 w-4", item.difavoritkan && "fill-current text-destructive")} />
        </Button>

        {item.status !== "Aktif" ? (
          <Badge variant="warning" className="absolute left-2 top-2">
            {STATUS_PRODUK_LABELS[item.status]}
          </Badge>
        ) : null}
      </div>

      <div className={cn("flex flex-1 flex-col gap-2", kompak ? "p-3" : "p-4")}>
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/marketplace/produk/${item.id_produk}`}
            className="block min-w-0 flex-1 truncate font-medium hover:underline"
          >
            {item.judul}
          </Link>

          {adaMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Aksi produk"
                  className="h-8 w-8 shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {item.bisa_dimoderasi && onModerasi ? (
                  <DropdownMenuItem
                    onSelect={() =>
                      onModerasi(item.id_produk, disembunyikan ? "Aktif" : "Disembunyikan")
                    }
                  >
                    {disembunyikan ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                    {disembunyikan ? "Tampilkan kembali" : "Sembunyikan"}
                  </DropdownMenuItem>
                ) : null}
                {item.bisa_dihapus && onHapus ? (
                  <>
                    {item.bisa_dimoderasi && onModerasi ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => onHapus(item.id_produk)}
                    >
                      <Trash2 className="h-4 w-4" /> Hapus
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <p className="font-semibold">
          {formatRupiah(item.harga)}
          <span className="text-xs font-normal text-muted-foreground">/{item.satuan}</span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{KONDISI_PRODUK_LABELS[item.kondisi]}</Badge>
          {item.bisa_nego ? (
            <Badge variant="outline" className="text-[10px]">
              Bisa nego
            </Badge>
          ) : null}
        </div>

        {!kompak ? (
          <p className="mt-auto truncate text-xs text-muted-foreground">
            {item.penjual.nama_lengkap ?? "Warga"}
            {item.nama_kategori ? ` • ${item.nama_kategori}` : ""}
          </p>
        ) : null}
      </div>
    </article>
  );
};
