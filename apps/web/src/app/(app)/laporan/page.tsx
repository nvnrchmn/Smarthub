"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileJson } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const unduhBlob = (konten: BlobPart, tipe: string, nama: string): void => {
  const blob = new Blob([konten], { type: tipe });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = nama;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function LaporanPage() {
  const [sibuk, setSibuk] = useState<string | null>(null);

  const unduhCsv = async (jenis: "kas" | "iuran" | "warga") => {
    setSibuk(jenis);
    try {
      const response = await fetch(`/api/bff/ekspor/${jenis}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Gagal mengunduh laporan");
      const teks = await response.text();
      unduhBlob(teks, "text/csv", `${jenis}-${Date.now()}.csv`);
      toast.success(`Laporan ${jenis} diunduh`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh laporan");
    } finally {
      setSibuk(null);
    }
  };

  const unduhDataTenant = async () => {
    setSibuk("ekspor");
    try {
      const hasil = await apiFetch<Record<string, unknown>>("/kepatuhan/ekspor");
      unduhBlob(JSON.stringify(hasil.data, null, 2), "application/json", `data-tenant-${Date.now()}.json`);
      toast.success("Data tenant diunduh");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh data tenant");
    } finally {
      setSibuk(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Laporan & Ekspor" description="Unduh laporan keuangan, kependudukan, dan data tenant." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Laporan CSV
          </CardTitle>
          <CardDescription>Format CSV dapat dibuka dengan Excel atau Google Sheets.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={sibuk !== null} onClick={() => void unduhCsv("kas")}>
            <Download className="h-4 w-4" /> Kas
          </Button>
          <Button variant="outline" disabled={sibuk !== null} onClick={() => void unduhCsv("iuran")}>
            <Download className="h-4 w-4" /> Iuran
          </Button>
          <Button variant="outline" disabled={sibuk !== null} onClick={() => void unduhCsv("warga")}>
            <Download className="h-4 w-4" /> Warga
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" /> Ekspor Data Tenant
          </CardTitle>
          <CardDescription>
            Salinan lengkap data tenant (JSON) untuk keperluan hak subjek data & portabilitas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled={sibuk !== null} onClick={() => void unduhDataTenant()}>
            <Download className="h-4 w-4" /> Unduh data tenant (JSON)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
