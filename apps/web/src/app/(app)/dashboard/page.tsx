"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, ReceiptText, ShieldCheck, Users, Wallet } from "lucide-react";
import { formatRupiah, queryKeys, type StatusBayar } from "@smarthub/shared";
import { apiFetch } from "@/lib/api-client";
import { saldoValueClassName } from "@/lib/saldo";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Ringkasan {
  total_pemasukan_iuran: string;
  total_pemasukan_lain: string;
  total_pengeluaran: string;
  saldo_kas_saat_ini: string;
}

interface IuranItem {
  id_iuran: number;
  bulan: number;
  tahun: number;
  jumlah_tagihan: string;
  status_bayar: StatusBayar;
}

const PENGURUS = ["Ketua_RT", "Sekretaris", "Bendahara"] as const;

export default function DashboardPage() {
  const { data: me } = useMe();
  const role = me?.role;
  const isPengurus = role ? (PENGURUS as readonly string[]).includes(role) : false;
  const isWarga = role === "Warga";
  const canSeeKeamanan = role === "Keamanan" || role === "Ketua_RT" || role === "Sekretaris";

  const today = new Date().toISOString().slice(0, 10);

  const ringkasanQuery = useQuery({
    queryKey: queryKeys.kasRingkasan,
    queryFn: async () => (await apiFetch<Ringkasan>("/keuangan/kas/ringkasan")).data,
    enabled: isPengurus || isWarga,
  });

  const rumahQuery = useQuery({
    queryKey: queryKeys.rumah({ limit: 1 }),
    queryFn: async () => (await apiFetch<unknown[]>("/wilayah/rumah?limit=1")).meta,
    enabled: isPengurus,
  });

  const wargaQuery = useQuery({
    queryKey: queryKeys.warga({ limit: 1 }),
    queryFn: async () => (await apiFetch<unknown[]>("/kependudukan/warga?limit=1")).meta,
    enabled: isPengurus,
  });

  const tamuQuery = useQuery({
    queryKey: queryKeys.tamu({ tanggal: today, limit: 1 }),
    queryFn: async () => (await apiFetch<unknown[]>(`/keamanan/tamu?tanggal=${today}&limit=1`)).meta,
    enabled: canSeeKeamanan,
  });

  const tagihanQuery = useQuery({
    queryKey: queryKeys.iuranSaya,
    queryFn: async () => (await apiFetch<IuranItem[]>("/keuangan/iuran/saya")).data,
    enabled: isWarga,
  });

  const tagihanBelumBayar = (tagihanQuery.data ?? []).filter(
    (item) => item.status_bayar !== "Lunas",
  );
  const totalTunggakan = tagihanBelumBayar.reduce(
    (total, item) => total + Number(item.jumlah_tagihan),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Halo, ${me?.nama_lengkap ?? "Warga"}`}
        description="Ringkasan kondisi lingkungan berdasarkan data terbaru."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(isPengurus || isWarga) && (
          <StatCard
            label="Saldo Kas RT"
            value={formatRupiah(ringkasanQuery.data?.saldo_kas_saat_ini)}
            icon={Wallet}
            loading={ringkasanQuery.isLoading}
            hint="Transparan untuk seluruh warga"
            valueClassName={saldoValueClassName(ringkasanQuery.data?.saldo_kas_saat_ini)}
          />
        )}
        {isPengurus ? (
          <>
            <StatCard
              label="Total Rumah"
              value={String(rumahQuery.data?.total ?? 0)}
              icon={Building2}
              loading={rumahQuery.isLoading}
            />
            <StatCard
              label="Total Warga"
              value={String(wargaQuery.data?.total ?? 0)}
              icon={Users}
              loading={wargaQuery.isLoading}
            />
          </>
        ) : null}
        {canSeeKeamanan ? (
          <StatCard
            label="Tamu Hari Ini"
            value={String(tamuQuery.data?.total ?? 0)}
            icon={ShieldCheck}
            loading={tamuQuery.isLoading}
          />
        ) : null}
        {isWarga ? (
          <StatCard
            label="Tagihan Belum Lunas"
            value={String(tagihanBelumBayar.length)}
            hint={`Total ${formatRupiah(totalTunggakan)}`}
            icon={ReceiptText}
            loading={tagihanQuery.isLoading}
          />
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>Pintasan ke pekerjaan yang sering dilakukan.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {role === "Keamanan" ? (
              <Button asChild>
                <Link href="/keamanan/tamu">Catat Tamu Masuk</Link>
              </Button>
            ) : null}
            {role === "Warga" ? (
              <Button asChild>
                <Link href="/warga/tagihan">Bayar Iuran</Link>
              </Button>
            ) : null}
            {isPengurus ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/kependudukan/warga">Kelola Warga</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/keuangan/iuran">Kelola Iuran</Link>
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Kas</CardTitle>
            <CardDescription>Akumulasi seluruh transaksi terverifikasi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Iuran lunas</span>
              <span className="font-medium">
                {formatRupiah(ringkasanQuery.data?.total_pemasukan_iuran)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pemasukan lain</span>
              <span className="font-medium">
                {formatRupiah(ringkasanQuery.data?.total_pemasukan_lain)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pengeluaran</span>
              <span className="font-medium">
                {formatRupiah(ringkasanQuery.data?.total_pengeluaran)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
