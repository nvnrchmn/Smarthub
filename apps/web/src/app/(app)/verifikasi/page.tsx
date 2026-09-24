"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, ShieldCheck, Upload } from "lucide-react";
import { KYC_STATUS_LABELS, type KycStatus } from "@smarthub/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KycStatusData {
  status_kyc: KycStatus;
  entity_type: string;
  money_out_enabled?: boolean;
  kanal_qris_aktif?: boolean;
  kanal?: { qris: boolean; va: boolean };
  failure_reasons: { field?: string; message?: string }[] | null;
  submission: { id_kyc: number; status: string } | null;
}

const LANJUT = new Set<KycStatus>(["REGISTERED", "AWAITING_DOCS", "PENDING_VERIFICATION", "VERIFICATION_IN_PROGRESS", "AWAITING_RESUBMISSION"]);
const SELESAI = new Set<KycStatus>(["LIVE"]);

export default function VerifikasiPage() {
  const queryClient = useQueryClient();

  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [fileIds, setFileIds] = useState<{ ktp_depan?: string; ktp_belakang?: string; selfie?: string }>({});
  const [form, setForm] = useState({
    ktp_number: "",
    tanggal_lahir: "",
    jenis_kelamin: "MALE",
    alamat: "",
    kota: "",
    provinsi: "",
    kode_pos: "",
    nama_legal: "",
    deskripsi: "",
    consent: false,
    nama_penandatangan: "",
  });

  const statusQuery = useQuery({
    queryKey: ["kyc", "status"],
    queryFn: async () => (await apiFetch<KycStatusData>("/kyc")).data,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["kyc"] });
  };

  const mulai = useMutation({
    mutationFn: async () =>
      apiFetch("/kyc/initiate", { method: "POST", body: { legal_name: legalName, email } }),
    onSuccess: async () => {
      toast.success("Verifikasi dimulai");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Gagal memulai verifikasi"),
  });

  const unggah = async (jenis: "ktp_depan" | "ktp_belakang" | "selfie", file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/bff/kyc/dokumen", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { file_id: string }; message?: string }
        | null;
      if (!response.ok || !payload?.data?.file_id) {
        throw new Error(payload?.message ?? "Gagal mengunggah dokumen");
      }
      setFileIds((prev) => ({ ...prev, [jenis]: payload.data?.file_id }));
      toast.success("Dokumen terunggah");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah dokumen");
    }
  };

  const submit = useMutation({
    mutationFn: async () =>
      apiFetch("/kyc/submit", {
        method: "POST",
        body: {
          ktp_number: form.ktp_number,
          tanggal_lahir: form.tanggal_lahir,
          jenis_kelamin: form.jenis_kelamin,
          kewarganegaraan: "ID",
          alamat: { alamat: form.alamat, kota: form.kota, provinsi: form.provinsi, kode_pos: form.kode_pos },
          data_usaha: {
            nama_legal: form.nama_legal,
            deskripsi: form.deskripsi,
            sumber_dana: "REVENUE",
            rata_rata_transaksi_bulanan: "$0 - $50K",
          },
          files: {
            ktp_depan: fileIds.ktp_depan ?? "",
            ktp_belakang: fileIds.ktp_belakang ?? "",
            selfie: fileIds.selfie ?? "",
          },
          consent: form.consent,
          nama_penandatangan: form.nama_penandatangan,
          consent_version: "v1",
        },
      }),
    onSuccess: async () => {
      toast.success("Data verifikasi dikirim, menunggu peninjauan");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Gagal mengirim data"),
  });

  const status = statusQuery.data?.status_kyc ?? "BELUM";
  const siapKirim =
    Object.keys(fileIds).length === 3 &&
    form.ktp_number.length === 16 &&
    form.tanggal_lahir !== "" &&
    form.alamat !== "" &&
    form.kota !== "" &&
    form.provinsi !== "" &&
    form.kode_pos !== "" &&
    form.nama_legal.length >= 3 &&
    form.deskripsi.length >= 5 &&
    form.consent &&
    form.nama_penandatangan.length >= 3;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Verifikasi Identitas"
        description="Verifikasi akun pembayaran RT untuk menerima iuran digital dan mencairkan dana."
      />

      <DataState isLoading={statusQuery.isLoading} isError={statusQuery.isError} error={statusQuery.error}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Status
            </CardTitle>
            <CardDescription>Status terkini proses verifikasi akun pembayaran RT.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={SELESAI.has(status) ? "success" : "secondary"}>
              {KYC_STATUS_LABELS[status]}
            </Badge>
            {SELESAI.has(status) ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Kanal QRIS:</span>
                <Badge variant={statusQuery.data?.kanal_qris_aktif ? "success" : "secondary"}>
                  {statusQuery.data?.kanal_qris_aktif ? "Aktif" : "Belum aktif"}
                </Badge>
                {!statusQuery.data?.kanal_qris_aktif ? (
                  <span className="text-muted-foreground">
                    Aktivasi kanal pembayaran dilakukan oleh tim dukungan. Hubungi dukungan bila sudah
                    menunggu lebih dari 1×24 jam.
                  </span>
                ) : null}
              </div>
            ) : null}
            {statusQuery.data?.failure_reasons?.length ? (
              <ul className="list-disc pl-5 text-sm text-destructive">
                {statusQuery.data.failure_reasons.map((item, index) => (
                  <li key={index}>{item.message ?? JSON.stringify(item)}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        {status === "BELUM" || status === "DECLINED" ? (
          <Card>
            <CardHeader>
              <CardTitle>Mulai Verifikasi</CardTitle>
              <CardDescription>Masukkan nama dan email penanggung jawab akun pembayaran RT.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="legal_name">Nama Penanggung Jawab</Label>
                <Input id="legal_name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button
                disabled={legalName.length < 3 || !email.includes("@") || mulai.isPending}
                onClick={() => mulai.mutate()}
              >
                {mulai.isPending ? "Memproses..." : "Mulai Verifikasi"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {LANJUT.has(status) && statusQuery.data?.submission ? (
          <Card>
            <CardHeader>
              <CardTitle>Dokumen & Data</CardTitle>
              <CardDescription>Unggah dokumen dan lengkapi data. Berkas tidak disimpan di SmartHub.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  ["ktp_depan", "KTP Depan"],
                  ["ktp_belakang", "KTP Belakang"],
                  ["selfie", "Selfie"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label>{label}</Label>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void unggah(key, file);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {fileIds[key] ? "Terunggah" : "Belum diunggah"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ktp_number">NIK KTP (16 digit)</Label>
                  <Input
                    id="ktp_number"
                    inputMode="numeric"
                    maxLength={16}
                    value={form.ktp_number}
                    onChange={(e) => setForm({ ...form, ktp_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                  <Input
                    id="tanggal_lahir"
                    type="date"
                    value={form.tanggal_lahir}
                    onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                  <Input
                    id="jenis_kelamin"
                    value={form.jenis_kelamin}
                    onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}
                    placeholder="MALE / FEMALE / OTHER"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nama_legal">Nama Legal</Label>
                  <Input
                    id="nama_legal"
                    value={form.nama_legal}
                    onChange={(e) => setForm({ ...form, nama_legal: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="alamat">Alamat</Label>
                  <Input id="alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kota">Kota</Label>
                  <Input id="kota" value={form.kota} onChange={(e) => setForm({ ...form, kota: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provinsi">Provinsi</Label>
                  <Input
                    id="provinsi"
                    value={form.provinsi}
                    onChange={(e) => setForm({ ...form, provinsi: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kode_pos">Kode Pos</Label>
                  <Input
                    id="kode_pos"
                    value={form.kode_pos}
                    onChange={(e) => setForm({ ...form, kode_pos: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="deskripsi">Deskripsi Kegiatan</Label>
                  <Input
                    id="deskripsi"
                    value={form.deskripsi}
                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                    placeholder="mis. pengelolaan iuran keamanan & kebersihan RT"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  className="mt-1"
                />
                <span>
                  Saya menyetujui pemrosesan data pribadi dan dokumen untuk keperluan verifikasi akun pembayaran RT.
                </span>
              </label>

              <div className="space-y-2">
                <Label htmlFor="nama_penandatangan">Nama Penandatangan</Label>
                <Input
                  id="nama_penandatangan"
                  value={form.nama_penandatangan}
                  onChange={(e) => setForm({ ...form, nama_penandatangan: e.target.value })}
                />
              </div>

              <Button disabled={!siapKirim || submit.isPending} onClick={() => submit.mutate()}>
                <Upload className="h-4 w-4" />
                {submit.isPending ? "Mengirim..." : "Kirim Verifikasi"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {SELESAI.has(status) ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm">
              <BadgeCheck className="h-5 w-5 text-emerald-600" />
              Akun pembayaran RT sudah terverifikasi. Anda dapat menerima iuran dan mencairkan dana.
            </CardContent>
          </Card>
        ) : null}
      </DataState>
    </div>
  );
}
