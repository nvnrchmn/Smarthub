"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah, queryKeys, type JenisKas } from "@smarthub/shared";
import { apiFetch } from "@/lib/api-client";
import { saldoValueClassName } from "@/lib/saldo";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Ringkasan {
  total_pemasukan_iuran: string;
  total_pemasukan_lain: string;
  total_pengeluaran: string;
  saldo_kas_saat_ini: string;
}

interface KasItem {
  id_transaksi: number;
  id_kategori: number;
  nama_kategori: string;
  jenis: JenisKas;
  jumlah: string;
}

interface ChartRow {
  nama_kategori: string;
  pemasukan: number;
  pengeluaran: number;
}

export default function RingkasanKeuanganPage() {
  const ringkasanQuery = useQuery({
    queryKey: queryKeys.kasRingkasan,
    queryFn: async () => (await apiFetch<Ringkasan>("/keuangan/kas/ringkasan")).data,
  });

  const kasQuery = useQuery({
    queryKey: queryKeys.kas({ limit: 100 }),
    queryFn: async () => (await apiFetch<KasItem[]>("/keuangan/kas?limit=100")).data,
  });

  const chartData = useMemo<ChartRow[]>(() => {
    const map = new Map<string, ChartRow>();
    for (const transaksi of kasQuery.data ?? []) {
      const key = transaksi.nama_kategori || `Kategori ${transaksi.id_kategori}`;
      const row = map.get(key) ?? { nama_kategori: key, pemasukan: 0, pengeluaran: 0 };
      if (transaksi.jenis === "Pemasukan") {
        row.pemasukan += Number(transaksi.jumlah);
      } else {
        row.pengeluaran += Number(transaksi.jumlah);
      }
      map.set(key, row);
    }
    return Array.from(map.values());
  }, [kasQuery.data]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Ringkasan Keuangan"
        description="Rekapitulasi arus kas RT berdasarkan data buku kas terbaru."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pemasukan Iuran"
          value={formatRupiah(ringkasanQuery.data?.total_pemasukan_iuran)}
          icon={TrendingUp}
          loading={ringkasanQuery.isLoading}
        />
        <StatCard
          label="Pemasukan Lain"
          value={formatRupiah(ringkasanQuery.data?.total_pemasukan_lain)}
          icon={Wallet}
          loading={ringkasanQuery.isLoading}
        />
        <StatCard
          label="Total Pengeluaran"
          value={formatRupiah(ringkasanQuery.data?.total_pengeluaran)}
          icon={TrendingDown}
          loading={ringkasanQuery.isLoading}
        />
        <StatCard
          label="Saldo Kas Saat Ini"
          value={formatRupiah(ringkasanQuery.data?.saldo_kas_saat_ini)}
          icon={PiggyBank}
          loading={ringkasanQuery.isLoading}
          hint="Transparan untuk seluruh warga"
          valueClassName={saldoValueClassName(ringkasanQuery.data?.saldo_kas_saat_ini)}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Arus Kas per Kategori</CardTitle>
          <CardDescription>
            Perbandingan nilai pemasukan dan pengeluaran pada 100 transaksi terakhir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataState
            isLoading={kasQuery.isLoading}
            isError={kasQuery.isError}
            error={kasQuery.error}
            isEmpty={chartData.length === 0}
            emptyMessage="Belum ada transaksi kas untuk ditampilkan"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="nama_kategori"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                <Bar
                  dataKey="pemasukan"
                  name="Pemasukan"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="pengeluaran"
                  name="Pengeluaran"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </DataState>
        </CardContent>
      </Card>
    </div>
  );
}
