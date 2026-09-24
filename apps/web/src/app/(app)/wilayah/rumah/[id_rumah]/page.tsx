"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  queryKeys,
  STATUS_HUNIAN_LABELS,
  STATUS_MILIK_LABELS,
  type StatusHunian,
  type StatusMilik,
} from "@smarthub/shared";
import { apiFetch } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { StatusAktifBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface RumahDetail {
  id_rumah: number;
  nomor_rumah: string;
  blok: string;
  jalan_gang: string;
  status_kepemilikan: StatusMilik;
  status_hunian: StatusHunian;
  kartu_keluarga: {
    no_kk: string;
    id_rumah: number;
    tgl_dikeluarkan: string | null;
    warga: {
      nik: string;
      nama_lengkap: string;
      status_hubungan_keluarga: string;
      status_aktif: "Aktif" | "Meninggal" | "Pindah_Keluar";
    }[];
  }[];
}

export default function RumahDetailPage() {
  const params = useParams<{ id_rumah: string }>();
  const idRumah = Number(params.id_rumah);
  const { data: me } = useMe();
  const canManage = me?.role === "Ketua_RT" || me?.role === "Sekretaris";
  const queryClient = useQueryClient();

  const rumahQuery = useQuery({
    queryKey: queryKeys.rumahDetail(idRumah),
    queryFn: async () => (await apiFetch<RumahDetail>(`/wilayah/rumah/${idRumah}`)).data,
    enabled: Number.isFinite(idRumah),
  });

  const toggleHunian = useMutation({
    mutationFn: async (status_hunian: StatusHunian) =>
      apiFetch(`/wilayah/rumah/${idRumah}`, { method: "PATCH", body: { status_hunian } }),
    onSuccess: async () => {
      toast.success("Status hunian diperbarui");
      await queryClient.invalidateQueries({ queryKey: queryKeys.rumahDetail(idRumah) });
      await queryClient.invalidateQueries({ queryKey: ["rumah"] });
    },
    onError: () => toast.error("Gagal memperbarui status hunian"),
  });

  const rumah = rumahQuery.data;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={rumah ? `Rumah ${rumah.nomor_rumah}` : "Detail Rumah"}
        description={rumah ? `${rumah.blok} — ${rumah.jalan_gang}` : undefined}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/wilayah/rumah">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Link>
            </Button>
            {canManage && rumah ? (
              <Button
                disabled={toggleHunian.isPending}
                onClick={() =>
                  toggleHunian.mutate(rumah.status_hunian === "Dihuni" ? "Tidak_Dihuni" : "Dihuni")
                }
              >
                Tandai {rumah.status_hunian === "Dihuni" ? "Tidak Dihuni" : "Dihuni"}
              </Button>
            ) : null}
          </div>
        }
      />

      <DataState
        isLoading={rumahQuery.isLoading}
        isError={rumahQuery.isError}
        error={rumahQuery.error}
      >
        {rumah ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Rumah</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Status kepemilikan</p>
                  <p className="font-medium">{STATUS_MILIK_LABELS[rumah.status_kepemilikan]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status hunian</p>
                  <Badge variant={rumah.status_hunian === "Dihuni" ? "success" : "secondary"}>
                    {STATUS_HUNIAN_LABELS[rumah.status_hunian]}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Jumlah KK</p>
                  <p className="font-medium">{rumah.kartu_keluarga.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total anggota</p>
                  <p className="font-medium">
                    {rumah.kartu_keluarga.reduce((total, kk) => total + kk.warga.length, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {rumah.kartu_keluarga.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Belum ada Kartu Keluarga yang ditempelkan ke rumah ini.
                </CardContent>
              </Card>
            ) : (
              rumah.kartu_keluarga.map((kk) => (
                <Card key={kk.no_kk}>
                  <CardHeader>
                    <CardTitle className="text-base">KK {kk.no_kk}</CardTitle>
                    <CardDescription>
                      Dikeluarkan {kk.tgl_dikeluarkan ?? "-"} • {kk.warga.length} anggota
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {kk.warga.map((warga, index) => (
                      <div key={warga.nik}>
                        {index > 0 ? <Separator className="mb-3" /> : null}
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium">{warga.nama_lengkap}</p>
                            <p className="text-xs text-muted-foreground">
                              NIK {warga.nik} • {warga.status_hubungan_keluarga}
                            </p>
                          </div>
                          <StatusAktifBadge status={warga.status_aktif} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : null}
      </DataState>
    </div>
  );
}
