"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  BULAN_LABELS,
  STATUS_BAYAR,
  STATUS_BAYAR_LABELS,
  formatPeriode,
  formatRupiah,
  formatTanggalWaktu,
  generateIuranSchema,
  queryKeys,
  type GenerateIuranInput,
  type StatusBayar,
} from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { StatusBayarBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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

interface IuranItem {
  id_iuran: number;
  id_rumah: number;
  nomor_rumah: string;
  blok: string;
  id_kategori: number;
  nama_kategori: string;
  bulan: number;
  tahun: number;
  jumlah_tagihan: string;
  status_bayar: StatusBayar;
  tgl_bayar: string | null;
  bukti_transfer: string | null;
  diverifikasi_oleh: number | null;
  diverifikasi_pada: string | null;
}

interface KategoriItem {
  id_kategori: number;
  nama_kategori: string;
  jenis: "Pemasukan" | "Pengeluaran";
}

interface GenerateResult {
  jumlah_rumah_tertagih: number;
  bulan: number;
  tahun: number;
}

export default function IuranListPage() {
  const { data: me } = useMe();
  const canGenerate = me?.role === "Bendahara" || me?.role === "Ketua_RT";
  const canVerify = me?.role === "Bendahara";

  const now = new Date();
  const currentBulan = now.getMonth() + 1;
  const currentTahun = now.getFullYear();

  const [page, setPage] = useState(1);
  const [bulan, setBulan] = useState<string>("semua");
  const [tahun, setTahun] = useState("");
  const [statusBayar, setStatusBayar] = useState<string>("semua");
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const queryParams = {
    page,
    limit: 20,
    bulan: bulan === "semua" ? undefined : bulan,
    tahun: tahun || undefined,
    status_bayar: statusBayar === "semua" ? undefined : statusBayar,
  };

  const iuranQuery = useQuery({
    queryKey: queryKeys.iuran(queryParams),
    queryFn: async () => apiFetch<IuranItem[]>(`/keuangan/iuran${buildQuery(queryParams)}`),
  });

  const kategoriQuery = useQuery({
    queryKey: queryKeys.kategori({ limit: 100, jenis: "Pemasukan" }),
    queryFn: async () =>
      (
        await apiFetch<KategoriItem[]>(
          `/keuangan/kategori${buildQuery({ limit: 100, jenis: "Pemasukan" })}`,
        )
      ).data,
    enabled: canGenerate,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<GenerateIuranInput>({
    resolver: zodResolver(generateIuranSchema),
    defaultValues: { bulan: currentBulan, tahun: currentTahun },
  });

  const generateMutation = useMutation({
    mutationFn: async (payload: GenerateIuranInput) =>
      apiFetch<GenerateResult>("/keuangan/iuran/generate", { method: "POST", body: payload }),
    onSuccess: async (result) => {
      toast.success(`Tagihan diterbitkan untuk ${result.data.jumlah_rumah_tertagih} rumah`);
      setDialogOpen(false);
      reset({ bulan: currentBulan, tahun: currentTahun });
      await queryClient.invalidateQueries({ queryKey: ["iuran"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof GenerateIuranInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal menerbitkan tagihan");
      }
    },
  });

  const verifikasiMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "Lunas" | "Belum_Bayar" }) =>
      apiFetch(`/keuangan/iuran/${id}/verifikasi`, {
        method: "PATCH",
        body: { status_bayar: status },
      }),
    onSuccess: async () => {
      toast.success("Status iuran diperbarui");
      await queryClient.invalidateQueries({ queryKey: ["iuran"] });
    },
    onError: () => toast.error("Gagal memperbarui status iuran"),
  });

  const batalMutation = useMutation({
    mutationFn: async (id: number) =>
      apiFetch(`/keuangan/iuran/${id}/batal`, { method: "PATCH" }),
    onSuccess: async () => {
      toast.success("Iuran berhasil dibatalkan");
      await queryClient.invalidateQueries({ queryKey: ["iuran"] });
    },
    onError: () => toast.error("Gagal membatalkan iuran"),
  });

  const kategoriPemasukan = kategoriQuery.data ?? [];
  const items = iuranQuery.data?.data ?? [];
  const meta = iuranQuery.data?.meta;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Iuran Warga"
        description="Tagihan iuran bulanan beserta status pembayarannya."
        action={
          canGenerate ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Terbitkan Tagihan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Terbitkan Tagihan Iuran</DialogTitle>
                  <DialogDescription>
                    Tagihan akan dibuat untuk seluruh rumah yang terdaftar.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={handleSubmit((values) => generateMutation.mutate(values))}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Controller
                      control={control}
                      name="id_kategori"
                      render={({ field }) => (
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori pemasukan" />
                          </SelectTrigger>
                          <SelectContent>
                            {kategoriPemasukan.map((kategori) => (
                              <SelectItem
                                key={kategori.id_kategori}
                                value={String(kategori.id_kategori)}
                              >
                                {kategori.nama_kategori}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.id_kategori ? (
                      <p className="text-sm text-destructive">{errors.id_kategori.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Bulan</Label>
                      <Controller
                        control={control}
                        name="bulan"
                        render={({ field }) => (
                          <Select
                            value={field.value ? String(field.value) : ""}
                            onValueChange={(value) => field.onChange(Number(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih bulan" />
                            </SelectTrigger>
                            <SelectContent>
                              {BULAN_LABELS.map((label, index) => (
                                <SelectItem key={label} value={String(index + 1)}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.bulan ? (
                        <p className="text-sm text-destructive">{errors.bulan.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tahun">Tahun</Label>
                      <Input
                        id="tahun"
                        type="number"
                        inputMode="numeric"
                        {...register("tahun", { valueAsNumber: true })}
                      />
                      {errors.tahun ? (
                        <p className="text-sm text-destructive">{errors.tahun.message}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jumlah_tagihan">Nominal tagihan</Label>
                    <Input
                      id="jumlah_tagihan"
                      type="number"
                      inputMode="numeric"
                      {...register("jumlah_tagihan", { valueAsNumber: true })}
                    />
                    {errors.jumlah_tagihan ? (
                      <p className="text-sm text-destructive">{errors.jumlah_tagihan.message}</p>
                    ) : null}
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={generateMutation.isPending}>
                      {generateMutation.isPending ? "Memproses..." : "Terbitkan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Select
          value={bulan}
          onValueChange={(value) => {
            setBulan(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bulan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua bulan</SelectItem>
            {BULAN_LABELS.map((label, index) => (
              <SelectItem key={label} value={String(index + 1)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          inputMode="numeric"
          placeholder="Tahun"
          value={tahun}
          onChange={(event) => {
            setTahun(event.target.value);
            setPage(1);
          }}
        />

        <Select
          value={statusBayar}
          onValueChange={(value) => {
            setStatusBayar(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status bayar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {STATUS_BAYAR.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_BAYAR_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        isLoading={iuranQuery.isLoading}
        isError={iuranQuery.isError}
        error={iuranQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada tagihan iuran"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rumah</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="hidden sm:table-cell">Kategori</TableHead>
                <TableHead>Tagihan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Bukti</TableHead>
                {canVerify ? <TableHead className="text-right">Aksi</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((iuran) => (
                <TableRow key={iuran.id_iuran}>
                  <TableCell className="font-medium">
                    {iuran.nomor_rumah}
                    <span className="hidden text-muted-foreground sm:inline"> ({iuran.blok})</span>
                  </TableCell>
                  <TableCell>{formatPeriode(iuran.bulan, iuran.tahun)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{iuran.nama_kategori}</TableCell>
                  <TableCell>{formatRupiah(iuran.jumlah_tagihan)}</TableCell>
                  <TableCell>
                    <StatusBayarBadge status={iuran.status_bayar} />
                    {iuran.diverifikasi_pada ? (
                      <p className="mt-1 hidden text-xs text-muted-foreground lg:block">
                        {formatTanggalWaktu(iuran.diverifikasi_pada)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {iuran.bukti_transfer ? (
                      <a
                        href={iuran.bukti_transfer}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        Lihat bukti
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {canVerify ? (
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {iuran.status_bayar === "Menunggu_Konfirmasi" ? (
                          <>
                            <Button
                              size="sm"
                              disabled={verifikasiMutation.isPending}
                              onClick={() =>
                                verifikasiMutation.mutate({ id: iuran.id_iuran, status: "Lunas" })
                              }
                            >
                              Verifikasi Lunas
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={verifikasiMutation.isPending}
                              onClick={() =>
                                verifikasiMutation.mutate({
                                  id: iuran.id_iuran,
                                  status: "Belum_Bayar",
                                })
                              }
                            >
                              Tolak
                            </Button>
                          </>
                        ) : null}
                        {iuran.status_bayar !== "Lunas" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={batalMutation.isPending}
                            onClick={() => batalMutation.mutate(iuran.id_iuran)}
                          >
                            Batal
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
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
