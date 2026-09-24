"use client";

import { useQuery } from "@tanstack/react-query";
import { formatRupiah, formatTanggalWaktu } from "@smarthub/shared";
import { platformFetch } from "@/lib/platform-api-client";
import { DataState } from "@/components/data-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Rekonsiliasi {
  status: string;
  total_pembayaran_paid: number;
  total_nilai_paid: string;
  ledger_qris: number;
  jumlah_selisih: number;
  selisih: {
    id_pembayaran_iuran: number;
    id_tenant: number;
    jumlah: string;
    paid_at: string | null;
  }[];
}

export default function PlatformRekonsiliasiPage() {
  const query = useQuery({
    queryKey: ["platform", "rekonsiliasi"],
    queryFn: async () => (await platformFetch<Rekonsiliasi>("/rekonsiliasi")).data,
  });

  const data = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rekonsiliasi</h1>
        <p className="text-sm text-muted-foreground">
          Perbandingan pembayaran QRIS berstatus PAID dengan ledger internal.
        </p>
      </div>

      <DataState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={!data}>
        {data ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ringkasan</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <Badge variant={data.status === "seimbang" ? "success" : "destructive"}>
                    {data.status === "seimbang" ? "Seimbang" : "Ada Selisih"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Pembayaran PAID: </span>
                  {data.total_pembayaran_paid} ({formatRupiah(data.total_nilai_paid)})
                </div>
                <div>
                  <span className="text-muted-foreground">Entri ledger QRIS: </span>
                  {data.ledger_qris}
                </div>
                <div>
                  <span className="text-muted-foreground">Selisih: </span>
                  {data.jumlah_selisih}
                </div>
              </CardContent>
            </Card>

            {data.selisih.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pembayaran tanpa ledger</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID Pembayaran</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Dibayar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.selisih.map((item) => (
                        <TableRow key={item.id_pembayaran_iuran}>
                          <TableCell>{item.id_pembayaran_iuran}</TableCell>
                          <TableCell>{item.id_tenant}</TableCell>
                          <TableCell>{formatRupiah(item.jumlah)}</TableCell>
                          <TableCell>{formatTanggalWaktu(item.paid_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </DataState>
    </div>
  );
}
