"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import {
  ALASAN_LAPORAN_LABELS,
  STATUS_LAPORAN,
  STATUS_LAPORAN_LABELS,
  formatTanggalWaktu,
  queryKeys,
} from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState, EmptyState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Laporan } from "@/components/marketplace/product-card";

export default function LaporanProdukPage() {
  const { data: me } = useMe();
  const canManage = me?.role === "Ketua_RT" || me?.role === "Sekretaris";
  const queryClient = useQueryClient();

  const [status, setStatus] = useState("semua");
  const [page, setPage] = useState(1);

  const queryParams = {
    status: status === "semua" ? undefined : status,
    page,
    limit: 20,
  };

  const laporanQuery = useQuery({
    queryKey: queryKeys.marketplaceLaporan(queryParams),
    queryFn: async () => apiFetch<Laporan[]>(`/marketplace/laporan${buildQuery(queryParams)}`),
    enabled: canManage,
  });

  const tanganiMutation = useMutation({
    mutationFn: ({ id, status: next }: { id: number; status: "Ditangani" | "Ditolak" }) =>
      apiFetch(`/marketplace/laporan/${id}`, { method: "PATCH", body: { status: next } }),
    onSuccess: (_result, variables) => {
      toast.success(
        variables.status === "Ditangani" ? "Laporan ditandai ditangani" : "Laporan ditolak",
      );
      void queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui laporan"),
  });

  const items = laporanQuery.data?.data ?? [];
  const meta = laporanQuery.data?.meta;

  if (me && !canManage) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Laporan Produk"
          description="Laporan pelanggaran pada produk marketplace."
        />
        <EmptyState message="Halaman ini hanya dapat diakses oleh Ketua RT dan Sekretaris." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Laporan Produk"
        description="Tinjau laporan pelanggaran pada produk marketplace."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Status laporan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {STATUS_LAPORAN.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LAPORAN_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        isLoading={laporanQuery.isLoading}
        isError={laporanQuery.isError}
        error={laporanQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada laporan"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead className="hidden sm:table-cell">Pelapor</TableHead>
                <TableHead className="hidden md:table-cell">Keterangan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((laporan) => (
                <TableRow key={laporan.id_laporan}>
                  <TableCell>
                    <span className="font-medium">{laporan.judul_produk}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatTanggalWaktu(laporan.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>{ALASAN_LAPORAN_LABELS[laporan.alasan]}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {laporan.pelapor.nama_lengkap ?? "Warga"}
                  </TableCell>
                  <TableCell className="hidden max-w-xs md:table-cell">
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {laporan.keterangan ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        laporan.status === "Baru"
                          ? "warning"
                          : laporan.status === "Ditangani"
                            ? "success"
                            : "secondary"
                      }
                    >
                      {STATUS_LAPORAN_LABELS[laporan.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {laporan.status === "Baru" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={tanganiMutation.isPending}
                          onClick={() =>
                            tanganiMutation.mutate({
                              id: laporan.id_laporan,
                              status: "Ditangani",
                            })
                          }
                        >
                          <Check className="h-4 w-4" /> Tandai Ditangani
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={tanganiMutation.isPending}
                          onClick={() =>
                            tanganiMutation.mutate({ id: laporan.id_laporan, status: "Ditolak" })
                          }
                        >
                          <X className="h-4 w-4" /> Tolak
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {laporan.ditangani_pada
                          ? formatTanggalWaktu(laporan.ditangani_pada)
                          : "-"}
                      </span>
                    )}
                  </TableCell>
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
