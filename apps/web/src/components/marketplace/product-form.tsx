"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  KONDISI_PRODUK,
  KONDISI_PRODUK_LABELS,
  createProdukSchema,
  queryKeys,
  type CreateProdukInput,
} from "@smarthub/shared";
import { ApiError, apiFetch, apiUpload } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Kategori, Produk } from "@/components/marketplace/product-card";

const MAKS_FOTO = 5;

export const ProductForm = ({
  open,
  onOpenChange,
  produk,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produk?: Produk;
  onSaved?: () => void;
}) => {
  const queryClient = useQueryClient();
  const [foto, setFoto] = useState<string[]>([]);
  const [mengunggah, setMengunggah] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateProdukInput>({
    resolver: zodResolver(createProdukSchema),
    defaultValues: {
      judul: "",
      deskripsi: "",
      harga: 0,
      kondisi: "Baru",
      satuan: "pcs",
      bisa_nego: false,
      tampilkan_kontak: true,
      id_kategori_produk: undefined,
    },
  });

  const kategoriQuery = useQuery({
    queryKey: queryKeys.marketplaceKategori(),
    queryFn: async () => (await apiFetch<Kategori[]>("/marketplace/kategori")).data,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      judul: produk?.judul ?? "",
      deskripsi: produk?.deskripsi ?? "",
      harga: produk ? Number(produk.harga) : 0,
      kondisi: produk?.kondisi ?? "Baru",
      satuan: produk?.satuan ?? "pcs",
      bisa_nego: produk?.bisa_nego ?? false,
      tampilkan_kontak: produk?.penjual.tampilkan_kontak ?? true,
      id_kategori_produk: produk?.id_kategori_produk ?? undefined,
    });
    setFoto(produk?.foto ?? []);
    if (fileRef.current) fileRef.current.value = "";
  }, [open, produk, reset]);

  const simpanMutation = useMutation({
    mutationFn: async (values: CreateProdukInput) => {
      const body = {
        judul: values.judul,
        deskripsi: values.deskripsi,
        harga: values.harga,
        kondisi: values.kondisi,
        satuan: values.satuan,
        bisa_nego: values.bisa_nego,
        tampilkan_kontak: values.tampilkan_kontak,
        ...(values.id_kategori_produk ? { id_kategori_produk: values.id_kategori_produk } : {}),
        foto,
      };

      if (produk) {
        return apiFetch(`/marketplace/produk/${produk.id_produk}`, { method: "PATCH", body });
      }
      return apiFetch("/marketplace/produk", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(produk ? "Produk berhasil diperbarui" : "Produk berhasil dipasang");
      void queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      onSaved?.();
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateProdukInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal menyimpan produk");
      }
    },
  });

  const unggah = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const sisa = MAKS_FOTO - foto.length;
    if (sisa <= 0) {
      toast.error(`Maksimal ${MAKS_FOTO} foto`);
      return;
    }

    setMengunggah(true);
    try {
      const hasil: string[] = [];
      for (const file of Array.from(files).slice(0, sisa)) {
        hasil.push(await apiUpload(file));
      }
      setFoto((prev) => [...prev, ...hasil]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengunggah foto");
    } finally {
      setMengunggah(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const kategori = kategoriQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{produk ? "Ubah Produk" : "Pasang Produk"}</DialogTitle>
          <DialogDescription>
            {produk
              ? "Perbarui informasi produk yang Anda jual."
              : "Lengkapi informasi barang yang ingin Anda jual."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => simpanMutation.mutate(values))}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="judul">Judul</Label>
            <Input id="judul" {...register("judul")} />
            {errors.judul ? (
              <p className="text-sm text-destructive">{errors.judul.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deskripsi">Deskripsi</Label>
            <Textarea id="deskripsi" rows={4} maxLength={2000} {...register("deskripsi")} />
            {errors.deskripsi ? (
              <p className="text-sm text-destructive">{errors.deskripsi.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="harga">Harga</Label>
              <Input
                id="harga"
                type="number"
                min={0}
                step="any"
                {...register("harga", { valueAsNumber: true })}
              />
              {errors.harga ? (
                <p className="text-sm text-destructive">{errors.harga.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="satuan">Satuan</Label>
              <Input id="satuan" placeholder="pcs" {...register("satuan")} />
              {errors.satuan ? (
                <p className="text-sm text-destructive">{errors.satuan.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kondisi</Label>
              <Controller
                control={control}
                name="kondisi"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KONDISI_PRODUK.map((value) => (
                        <SelectItem key={value} value={value}>
                          {KONDISI_PRODUK_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.kondisi ? (
                <p className="text-sm text-destructive">{errors.kondisi.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Controller
                control={control}
                name="id_kategori_produk"
                render={({ field }) => (
                  <Select
                    value={field.value === undefined ? "none" : String(field.value)}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? undefined : Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tanpa kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa kategori</SelectItem>
                      {kategori.map((item) => (
                        <SelectItem
                          key={item.id_kategori_produk}
                          value={String(item.id_kategori_produk)}
                        >
                          {item.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.id_kategori_produk ? (
                <p className="text-sm text-destructive">{errors.id_kategori_produk.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foto produk (maksimal {MAKS_FOTO})</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void unggah(event.target.files)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={mengunggah || foto.length >= MAKS_FOTO}
                onClick={() => fileRef.current?.click()}
              >
                {mengunggah ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Unggah foto
              </Button>

              {foto.map((url) => (
                <span key={url} className="relative">
                  <img
                    src={url}
                    alt="Foto produk"
                    className="h-16 w-16 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Hapus foto"
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    onClick={() => setFoto((prev) => prev.filter((item) => item !== url))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {!mengunggah && foto.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada foto diunggah.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="bisa_nego"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...register("bisa_nego")}
              />
              <Label htmlFor="bisa_nego">Bisa nego</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tampilkan_kontak"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...register("tampilkan_kontak")}
              />
              <Label htmlFor="tampilkan_kontak">Tampilkan kontak WhatsApp</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={simpanMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={simpanMutation.isPending || mengunggah}>
              {simpanMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
