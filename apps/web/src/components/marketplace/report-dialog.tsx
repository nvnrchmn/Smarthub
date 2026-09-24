"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ALASAN_LAPORAN,
  ALASAN_LAPORAN_LABELS,
  createLaporanSchema,
  type CreateLaporanInput,
} from "@smarthub/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
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

export const ReportDialog = ({
  open,
  onOpenChange,
  id_produk,
  judul,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id_produk: number;
  judul?: string;
}) => {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateLaporanInput>({
    resolver: zodResolver(createLaporanSchema),
    defaultValues: { id_produk, alasan: "Spam", keterangan: "" },
  });

  useEffect(() => {
    if (open) reset({ id_produk, alasan: "Spam", keterangan: "" });
  }, [open, id_produk, reset]);

  const kirimMutation = useMutation({
    mutationFn: async (values: CreateLaporanInput) =>
      apiFetch("/marketplace/laporan", {
        method: "POST",
        body: {
          id_produk: values.id_produk,
          alasan: values.alasan,
          ...(values.keterangan?.trim() ? { keterangan: values.keterangan.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Laporan terkirim. Terima kasih.");
      void queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateLaporanInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal mengirim laporan");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Laporkan Produk</DialogTitle>
          <DialogDescription>
            {judul
              ? `Laporkan "${judul}" jika melanggar aturan marketplace.`
              : "Laporkan produk yang melanggar aturan marketplace."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => kirimMutation.mutate(values))}
          noValidate
        >
          <input type="hidden" {...register("id_produk")} />

          <div className="space-y-2">
            <Label>Alasan</Label>
            <Controller
              control={control}
              name="alasan"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALASAN_LAPORAN.map((value) => (
                      <SelectItem key={value} value={value}>
                        {ALASAN_LAPORAN_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.alasan ? (
              <p className="text-sm text-destructive">{errors.alasan.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="keterangan">Keterangan (opsional)</Label>
            <Textarea
              id="keterangan"
              rows={3}
              maxLength={500}
              placeholder="Jelaskan alasan laporan Anda..."
              {...register("keterangan")}
            />
            {errors.keterangan ? (
              <p className="text-sm text-destructive">{errors.keterangan.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={kirimMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={kirimMutation.isPending}>
              {kirimMutation.isPending ? "Mengirim..." : "Kirim Laporan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
