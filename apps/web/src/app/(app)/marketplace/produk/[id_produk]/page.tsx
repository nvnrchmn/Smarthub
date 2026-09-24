"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  Pencil,
  ShieldAlert,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  KONDISI_PRODUK_LABELS,
  ROLE_LABELS,
  STATUS_PRODUK_LABELS,
  formatRupiah,
  formatTanggalWaktu,
  queryKeys,
} from "@smarthub/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductForm } from "@/components/marketplace/product-form";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import type { Produk } from "@/components/marketplace/product-card";

export default function ProdukDetailPage() {
  const params = useParams<{ id_produk: string }>();
  const idProduk = Number(params.id_produk);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fotoAktif, setFotoAktif] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [laporOpen, setLaporOpen] = useState(false);

  const detailKey = queryKeys.marketplaceProdukDetail(idProduk);

  const detailQuery = useQuery({
    queryKey: detailKey,
    queryFn: async () => (await apiFetch<Produk>(`/marketplace/produk/${idProduk}`)).data,
    enabled: Number.isFinite(idProduk),
  });

  const produk = detailQuery.data;

  useEffect(() => {
    setFotoAktif(0);
  }, [produk?.id_produk]);

  const favoritMutation = useMutation({
    mutationFn: (difavoritkan: boolean) =>
      apiFetch(`/marketplace/produk/${idProduk}/favorit`, {
        method: difavoritkan ? "POST" : "DELETE",
      }),
    onMutate: async (difavoritkan) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<Produk>(detailKey);
      if (previous) {
        queryClient.setQueryData<Produk>(detailKey, { ...previous, difavoritkan });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui favorit");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["marketplace"] }),
  });

  const hapusMutation = useMutation({
    mutationFn: (id_produk: number) =>
      apiFetch(`/marketplace/produk/${id_produk}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Produk dihapus");
      void queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      router.push("/marketplace");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal menghapus produk"),
  });

  const moderasiMutation = useMutation({
    mutationFn: (status: "Aktif" | "Disembunyikan") =>
      apiFetch(`/marketplace/produk/${idProduk}/status`, { method: "PATCH", body: { status } }),
    onSuccess: (_result, status) => {
      toast.success(status === "Disembunyikan" ? "Produk disembunyikan" : "Produk ditampilkan");
      void queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memoderasi produk"),
  });

  const konfirmasiHapus = () => {
    if (
      window.confirm("Hapus produk ini? Tindakan ini tidak dapat dibatalkan.")
    ) {
      hapusMutation.mutate(idProduk);
    }
  };

  const fotoUtama = produk ? produk.foto[fotoAktif] ?? produk.foto[0] ?? null : null;
  const kontakWa = produk?.penjual.kontak_wa ?? null;
  const disembunyikan = produk?.status === "Disembunyikan";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Detail Produk"
        description="Informasi lengkap barang marketplace."
        action={
          <Button variant="outline" asChild>
            <Link href="/marketplace">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Link>
          </Button>
        }
      />

      <DataState
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        error={detailQuery.error}
      >
        {produk ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border bg-muted">
                {fotoUtama ? (
                  <img
                    src={fotoUtama}
                    alt={produk.judul}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center text-muted-foreground">
                    <ShoppingBag className="h-12 w-12" />
                  </div>
                )}
              </div>

              {produk.foto.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {produk.foto.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      aria-label={`Lihat foto ${index + 1}`}
                      onClick={() => setFotoAktif(index)}
                      className={cn(
                        "h-16 w-16 overflow-hidden rounded-md border",
                        index === fotoAktif && "ring-2 ring-primary",
                      )}
                    >
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{KONDISI_PRODUK_LABELS[produk.kondisi]}</Badge>
                  <Badge variant="outline">Satuan: {produk.satuan}</Badge>
                  {produk.bisa_nego ? <Badge variant="outline">Bisa nego</Badge> : null}
                  {produk.nama_kategori ? (
                    <Badge variant="outline">{produk.nama_kategori}</Badge>
                  ) : null}
                  {produk.status !== "Aktif" ? (
                    <Badge variant="warning">{STATUS_PRODUK_LABELS[produk.status]}</Badge>
                  ) : null}
                </div>

                <h2 className="text-xl font-semibold">{produk.judul}</h2>
                <p className="text-2xl font-bold">
                  {formatRupiah(produk.harga)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{produk.satuan}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Dilihat {produk.jumlah_dilihat} kali • {formatTanggalWaktu(produk.createdAt)}
                </p>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={favoritMutation.isPending}
                  onClick={() => favoritMutation.mutate(!produk.difavoritkan)}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      produk.difavoritkan && "fill-current text-destructive",
                    )}
                  />
                  {produk.difavoritkan ? "Hapus dari favorit" : "Favoritkan"}
                </Button>

                {kontakWa ? (
                  <Button variant="outline" onClick={() => window.open(kontakWa, "_blank")}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                ) : null}

                {produk.bisa_diedit ? (
                  <Button variant="outline" onClick={() => setFormOpen(true)}>
                    <Pencil className="h-4 w-4" /> Ubah
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setLaporOpen(true)}>
                    <ShieldAlert className="h-4 w-4" /> Laporkan
                  </Button>
                )}

                {produk.bisa_dimoderasi ? (
                  <Button
                    variant="outline"
                    disabled={moderasiMutation.isPending}
                    onClick={() =>
                      moderasiMutation.mutate(disembunyikan ? "Aktif" : "Disembunyikan")
                    }
                  >
                    {disembunyikan ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                    {disembunyikan ? "Tampilkan" : "Sembunyikan"}
                  </Button>
                ) : null}

                {produk.bisa_dihapus ? (
                  <Button
                    variant="destructive"
                    disabled={hapusMutation.isPending}
                    onClick={konfirmasiHapus}
                  >
                    <Trash2 className="h-4 w-4" /> Hapus
                  </Button>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Deskripsi</h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {produk.deskripsi}
                </p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">Penjual</h3>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {(produk.penjual.nama_lengkap ?? "Warga").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {produk.penjual.nama_lengkap ?? "Warga"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[produk.penjual.role]}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <ProductForm
              open={formOpen}
              onOpenChange={setFormOpen}
              produk={produk}
              onSaved={() => void queryClient.invalidateQueries({ queryKey: ["marketplace"] })}
            />

            <ReportDialog
              open={laporOpen}
              onOpenChange={setLaporOpen}
              id_produk={produk.id_produk}
              judul={produk.judul}
            />
          </div>
        ) : null}
      </DataState>
    </div>
  );
}
