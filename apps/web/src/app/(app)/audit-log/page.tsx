"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatTanggalWaktu } from "@smarthub/shared";
import { apiFetch, buildQuery } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AuditItem {
  id_audit: number;
  aktor_email: string | null;
  aksi: string;
  entitas: string;
  id_entitas: string | null;
  detail: Record<string, unknown> | null;
  dibuat_pada: string | null;
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const params = { page, limit: 20 };

  const query = useQuery({
    queryKey: ["audit-log", params],
    queryFn: async () => apiFetch<AuditItem[]>(`/audit-log${buildQuery(params)}`),
  });

  const items = query.data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Audit Log"
        description="Riwayat aksi tulis yang dilakukan pengurus pada tenant ini."
      />

      <DataState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada aktivitas tercatat"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Entitas</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id_audit}>
                  <TableCell className="whitespace-nowrap">{formatTanggalWaktu(item.dibuat_pada)}</TableCell>
                  <TableCell className="font-medium">{item.aksi}</TableCell>
                  <TableCell>
                    {item.entitas}
                    {item.id_entitas ? ` #${item.id_entitas}` : ""}
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs">
                    {item.detail ? JSON.stringify(item.detail) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </DataState>
    </div>
  );
}
