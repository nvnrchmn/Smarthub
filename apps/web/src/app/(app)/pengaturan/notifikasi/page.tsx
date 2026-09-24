"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Preferensi {
  whatsapp: boolean;
  email: boolean;
  pengingat_iuran: boolean;
}

export default function PreferensiNotifikasiPage() {
  const [preferensi, setPreferensi] = useState<Preferensi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    let aktif = true;
    setLoading(true);
    apiFetch<Preferensi>("/notifikasi/preferensi")
      .then((hasil) => {
        if (aktif) setPreferensi(hasil.data);
      })
      .catch((err) => {
        if (aktif) setError(err);
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  const simpan = async () => {
    if (!preferensi) return;
    setMenyimpan(true);
    try {
      const hasil = await apiFetch<Preferensi>("/notifikasi/preferensi", {
        method: "PATCH",
        body: preferensi,
      });
      setPreferensi(hasil.data);
      toast.success("Preferensi notifikasi disimpan");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan preferensi");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Preferensi Notifikasi"
        description="Atur kanal notifikasi yang ingin Anda terima."
      />

      <DataState isLoading={loading} isError={Boolean(error)} error={error} isEmpty={!preferensi}>
        {preferensi ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5" /> Kanal Notifikasi
              </CardTitle>
              <CardDescription>
                Notifikasi dalam aplikasi selalu aktif. Kanal lain dapat dimatikan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>
                  <span className="font-medium">WhatsApp</span>
                  <p className="text-muted-foreground">Kirim notifikasi ke nomor HP terdaftar.</p>
                </span>
                <input
                  type="checkbox"
                  checked={preferensi.whatsapp}
                  onChange={(event) => setPreferensi({ ...preferensi, whatsapp: event.target.checked })}
                />
              </label>

              <label className="flex items-center justify-between gap-4 text-sm">
                <span>
                  <span className="font-medium">Email</span>
                  <p className="text-muted-foreground">Kirim notifikasi ke email akun.</p>
                </span>
                <input
                  type="checkbox"
                  checked={preferensi.email}
                  onChange={(event) => setPreferensi({ ...preferensi, email: event.target.checked })}
                />
              </label>

              <label className="flex items-center justify-between gap-4 text-sm">
                <span>
                  <span className="font-medium">Pengingat iuran</span>
                  <p className="text-muted-foreground">Pengingat otomatis H-7 dan H-1 jatuh tempo.</p>
                </span>
                <input
                  type="checkbox"
                  checked={preferensi.pengingat_iuran}
                  onChange={(event) =>
                    setPreferensi({ ...preferensi, pengingat_iuran: event.target.checked })
                  }
                />
              </label>

              <Button disabled={menyimpan} onClick={() => void simpan()}>
                {menyimpan ? "Menyimpan..." : "Simpan preferensi"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </DataState>
    </div>
  );
}
