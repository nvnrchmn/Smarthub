"use client";

import { useQuery } from "@tanstack/react-query";
import { Home, IdCard, Users } from "lucide-react";
import {
  HUBUNGAN_KELUARGA_LABELS,
  queryKeys,
  type HubunganKeluarga,
  type StatusAktif,
} from "@smarthub/shared";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { StatCard } from "@/components/stat-card";
import { StatusAktifBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface AnggotaKeluarga {
  nik: string;
  nama_lengkap: string;
  no_kk: string;
  status_hubungan_keluarga: string;
  status_aktif: StatusAktif;
}

interface KeluargaSaya {
  no_kk: string;
  id_rumah: number;
  anggota_keluarga: AnggotaKeluarga[];
}

export default function KeluargaSayaPage() {
  const keluargaQuery = useQuery({
    queryKey: queryKeys.kkSaya,
    queryFn: async () => (await apiFetch<KeluargaSaya>("/kependudukan/kk/saya")).data,
  });

  const keluarga = keluargaQuery.data;
  const anggota = keluarga?.anggota_keluarga ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Keluarga Saya"
        description="Data Kartu Keluarga dan anggota keluarga yang terdaftar."
      />

      <DataState
        isLoading={keluargaQuery.isLoading}
        isError={keluargaQuery.isError}
        error={keluargaQuery.error}
      >
        {keluarga ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Nomor Kartu Keluarga" value={keluarga.no_kk} icon={IdCard} />
              <StatCard label="ID Rumah" value={String(keluarga.id_rumah)} icon={Home} />
              <StatCard
                label="Jumlah Anggota"
                value={String(anggota.length)}
                hint="Terdaftar pada kartu keluarga"
                icon={Users}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Anggota Keluarga</CardTitle>
                <CardDescription>
                  Daftar anggota yang terdaftar pada kartu keluarga ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {anggota.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada anggota keluarga yang terdaftar.
                  </p>
                ) : (
                  anggota.map((item, index) => (
                    <div key={item.nik}>
                      {index > 0 ? <Separator className="mb-3" /> : null}
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{item.nama_lengkap}</p>
                          <p className="text-xs text-muted-foreground">
                            NIK {item.nik} •{" "}
                            {HUBUNGAN_KELUARGA_LABELS[item.status_hubungan_keluarga as HubunganKeluarga] ??
                              item.status_hubungan_keluarga}
                          </p>
                        </div>
                        <StatusAktifBadge status={item.status_aktif} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DataState>
    </div>
  );
}
