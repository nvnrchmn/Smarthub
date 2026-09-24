"use client";

import { useQuery } from "@tanstack/react-query";
import { formatRupiah } from "@smarthub/shared";
import { platformFetch } from "@/lib/platform-api-client";
import { DataState } from "@/components/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Metrik {
  mrr: string;
  langganan_aktif: number;
  churn_tenant: number;
  tenant_per_bulan: { bulan: string; jumlah: number }[];
  tenant_per_status: { status: string; jumlah: number }[];
  pembayaran_qris: {
    jumlah_transaksi: number;
    total_pembayaran: string;
    total_fee_platform: string;
    total_net_ke_rt: string;
  };
}

export default function PlatformMetrikPage() {
  const query = useQuery({
    queryKey: ["platform", "metrik"],
    queryFn: async () => (await platformFetch<Metrik>("/metrik")).data,
  });

  const metrik = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metrik Bisnis</h1>
        <p className="text-sm text-muted-foreground">MRR, pertumbuhan tenant, dan pembayaran QRIS.</p>
      </div>

      <DataState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={!metrik}>
        {metrik ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">MRR</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatRupiah(metrik.mrr)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Langganan Aktif</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{metrik.langganan_aktif}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Pembayaran QRIS</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {formatRupiah(metrik.pembayaran_qris.total_pembayaran)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Fee Platform</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {formatRupiah(metrik.pembayaran_qris.total_fee_platform)}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pertumbuhan Tenant per Bulan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulan</TableHead>
                      <TableHead>Tenant Baru</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrik.tenant_per_bulan.map((item) => (
                      <TableRow key={item.bulan}>
                        <TableCell>{item.bulan}</TableCell>
                        <TableCell>{item.jumlah}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tenant per Status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-sm">
                {metrik.tenant_per_status.map((item) => (
                  <span key={item.status} className="rounded-md border px-3 py-1">
                    {item.status}: <strong>{item.jumlah}</strong>
                  </span>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}
      </DataState>
    </div>
  );
}
