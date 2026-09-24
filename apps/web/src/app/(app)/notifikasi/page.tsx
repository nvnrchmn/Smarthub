"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, CheckCheck, MessageSquare, Reply } from "lucide-react";
import {
  formatTanggalWaktu,
  queryKeys,
  TIPE_NOTIFIKASI_LABELS,
  type TipeNotifikasi,
} from "@smarthub/shared";
import { apiFetch, buildQuery } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NotifikasiItem {
  id_notifikasi: number;
  tipe: TipeNotifikasi;
  id_referensi: number | null;
  pesan: string;
  dibaca: boolean;
  dibaca_pada: string | null;
  createdAt: string;
}

export default function NotifikasiPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const listKey = queryKeys.notifikasi({ page, limit: 20 });

  const notifikasiQuery = useQuery({
    queryKey: listKey,
    queryFn: async () =>
      apiFetch<NotifikasiItem[]>(`/notifikasi${buildQuery({ page, limit: 20 })}`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifikasi"] });
  };

  const bacaSatu = useMutation({
    mutationFn: (id_notifikasi: number) =>
      apiFetch(`/notifikasi/${id_notifikasi}/baca`, { method: "PATCH" }),
    onSuccess: invalidate,
    onError: () => toast.error("Gagal menandai notifikasi"),
  });

  const bacaSemua = useMutation({
    mutationFn: () => apiFetch("/notifikasi/baca-semua", { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Semua notifikasi ditandai sudah dibaca");
      invalidate();
    },
    onError: () => toast.error("Gagal menandai semua notifikasi"),
  });

  const items = notifikasiQuery.data?.data ?? [];
  const meta = notifikasiQuery.data?.meta;
  const adaBelumDibaca = items.some((item) => !item.dibaca);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifikasi"
        description="Sebutan dan balasan pada Diskusi Warga."
        action={
          adaBelumDibaca ? (
            <Button
              variant="outline"
              disabled={bacaSemua.isPending}
              onClick={() => bacaSemua.mutate()}
            >
              <CheckCheck className="h-4 w-4" /> Tandai semua dibaca
            </Button>
          ) : null
        }
      />

      <DataState
        isLoading={notifikasiQuery.isLoading}
        isError={notifikasiQuery.isError}
        error={notifikasiQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada notifikasi"
      >
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.tipe === "Balasan" ? Reply : MessageSquare;
            return (
              <div
                key={item.id_notifikasi}
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-card p-4",
                  !item.dibaca && "border-primary/40 bg-primary/5",
                )}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.tipe === "Mention" ? "default" : "secondary"}>
                      {TIPE_NOTIFIKASI_LABELS[item.tipe]}
                    </Badge>
                    {!item.dibaca ? <Badge variant="warning">Baru</Badge> : null}
                    <span className="text-xs text-muted-foreground">
                      {formatTanggalWaktu(item.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm">{item.pesan}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.id_referensi !== null ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/diskusi/${item.id_referensi}`}>
                          <Bell className="h-4 w-4" /> Buka diskusi
                        </Link>
                      </Button>
                    ) : null}
                    {!item.dibaca ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={bacaSatu.isPending}
                        onClick={() => bacaSatu.mutate(item.id_notifikasi)}
                      >
                        Tandai dibaca
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Pagination meta={meta} onPageChange={setPage} />
      </DataState>
    </div>
  );
}
