"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, FileSignature, Palette, Save } from "lucide-react";
import {
  queryKeys,
  updatePengaturanTenantSchema,
  updateTenantProfilSchema,
  type UpdatePengaturanTenantInput,
  type UpdateTenantProfilInput,
} from "@smarthub/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfilTenant {
  id_tenant: number;
  nama: string;
  slug: string;
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  kontak_email: string;
  kontak_hp: string | null;
  jumlah_rumah: number | null;
}

interface PengaturanTenant {
  tahun_buku_mulai: number;
  zona_waktu: string;
  nominal_iuran_default: number | null;
  jatuh_tempo_iuran_tanggal: number | null;
  denda_persen: number | null;
  prefix_nomor: string | null;
  notifikasi: { pengingat_iuran: boolean; jam_kirim: string; kanal_default: "Email" | "WhatsApp" };
  dokumen: {
    nama_ttd: string | null;
    jabatan_ttd: string | null;
    kop: string | null;
    footer: string | null;
  };
  branding: { logo_url: string | null; warna_aksen: string | null };
}

const emptyProfil: UpdateTenantProfilInput = {
  nama: "",
  provinsi: "",
  kabupaten: "",
  kecamatan: "",
  kontak_email: "",
  kontak_hp: "",
  jumlah_rumah: null,
};

const emptyPengaturan: UpdatePengaturanTenantInput = {
  tahun_buku_mulai: 1,
  zona_waktu: "Asia/Jakarta",
  nominal_iuran_default: null,
  jatuh_tempo_iuran_tanggal: null,
  denda_persen: null,
  prefix_nomor: "",
  notifikasi: { pengingat_iuran: true, jam_kirim: "08:00", kanal_default: "WhatsApp" },
  dokumen: { nama_ttd: "", jabatan_ttd: "Ketua RT", kop: "", footer: "" },
  branding: { logo_url: "", warna_aksen: "" },
};

export default function PengaturanTenantPage() {
  const { data: me } = useMe();
  const bisaUbahProfil = me?.role === "Ketua_RT" || me?.role === "Sekretaris";
  const queryClient = useQueryClient();

  const profilQuery = useQuery({
    queryKey: queryKeys.tenantProfil,
    queryFn: async () => apiFetch<ProfilTenant>("/tenant/profil"),
  });

  const pengaturanQuery = useQuery({
    queryKey: queryKeys.tenantPengaturan,
    queryFn: async () => apiFetch<PengaturanTenant>("/tenant/pengaturan"),
  });

  const profil = profilQuery.data?.data ?? null;
  const pengaturan = pengaturanQuery.data?.data ?? null;

  const profilForm = useForm<UpdateTenantProfilInput>({
    resolver: zodResolver(updateTenantProfilSchema),
    defaultValues: emptyProfil,
  });

  const pengaturanForm = useForm<UpdatePengaturanTenantInput>({
    resolver: zodResolver(updatePengaturanTenantSchema),
    defaultValues: emptyPengaturan,
  });

  useEffect(() => {
    if (profil) {
      profilForm.reset({
        nama: profil.nama,
        provinsi: profil.provinsi,
        kabupaten: profil.kabupaten,
        kecamatan: profil.kecamatan,
        kontak_email: profil.kontak_email,
        kontak_hp: profil.kontak_hp ?? "",
        jumlah_rumah: profil.jumlah_rumah ?? null,
      });
    }
  }, [profil, profilForm]);

  useEffect(() => {
    if (pengaturan) {
      pengaturanForm.reset({
        tahun_buku_mulai: pengaturan.tahun_buku_mulai,
        zona_waktu: pengaturan.zona_waktu,
        nominal_iuran_default: pengaturan.nominal_iuran_default,
        jatuh_tempo_iuran_tanggal: pengaturan.jatuh_tempo_iuran_tanggal,
        denda_persen: pengaturan.denda_persen,
        prefix_nomor: pengaturan.prefix_nomor ?? "",
        notifikasi: pengaturan.notifikasi,
        dokumen: pengaturan.dokumen,
        branding: pengaturan.branding,
      });
    }
  }, [pengaturan, pengaturanForm]);

  const simpanProfil = useMutation({
    mutationFn: async (values: UpdateTenantProfilInput) =>
      apiFetch("/tenant/profil", { method: "PATCH", body: values }),
    onSuccess: async () => {
      toast.success("Identitas RT diperbarui");
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenantProfil });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui identitas");
    },
  });

  const simpanPengaturan = useMutation({
    mutationFn: async (values: UpdatePengaturanTenantInput) =>
      apiFetch("/tenant/pengaturan", { method: "PATCH", body: values }),
    onSuccess: async () => {
      toast.success("Pengaturan RT disimpan");
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenantPengaturan });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan pengaturan");
    },
  });

  const {
    register: registerProfil,
    handleSubmit: submitProfil,
    formState: { errors: eProfil },
  } = profilForm;
  const {
    register: registerPengaturan,
    handleSubmit: submitPengaturan,
    control,
    formState: { errors: ePengaturan },
  } = pengaturanForm;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Pengaturan RT"
        description="Identitas dan preferensi operasional tenant (RT) Anda."
      />

      <DataState
        isLoading={profilQuery.isLoading || pengaturanQuery.isLoading}
        isError={profilQuery.isError || pengaturanQuery.isError}
        error={profilQuery.error ?? pengaturanQuery.error}
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Identitas RT
              </CardTitle>
              <CardDescription>
                Nama, wilayah, dan kontak RT. Tampil di header dan dokumen yang dicetak.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={submitProfil((values) => simpanProfil.mutate(values))}
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="nama">Nama RT</Label>
                    <Input id="nama" disabled={!bisaUbahProfil} {...registerProfil("nama")} />
                    {eProfil.nama ? (
                      <p className="text-sm text-destructive">{eProfil.nama.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provinsi">Provinsi</Label>
                    <Input
                      id="provinsi"
                      disabled={!bisaUbahProfil}
                      {...registerProfil("provinsi")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kabupaten">Kabupaten/Kota</Label>
                    <Input
                      id="kabupaten"
                      disabled={!bisaUbahProfil}
                      {...registerProfil("kabupaten")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kecamatan">Kecamatan</Label>
                    <Input
                      id="kecamatan"
                      disabled={!bisaUbahProfil}
                      {...registerProfil("kecamatan")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jumlah_rumah">Jumlah rumah (perkiraan)</Label>
                    <Input
                      id="jumlah_rumah"
                      type="number"
                      disabled={!bisaUbahProfil}
                      {...registerProfil("jumlah_rumah")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kontak_email">Email kontak</Label>
                    <Input
                      id="kontak_email"
                      type="email"
                      disabled={!bisaUbahProfil}
                      {...registerProfil("kontak_email")}
                    />
                    {eProfil.kontak_email ? (
                      <p className="text-sm text-destructive">{eProfil.kontak_email.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kontak_hp">No. HP kontak</Label>
                    <Input
                      id="kontak_hp"
                      disabled={!bisaUbahProfil}
                      {...registerProfil("kontak_hp")}
                    />
                  </div>
                </div>
                {bisaUbahProfil ? (
                  <Button type="submit" disabled={simpanProfil.isPending}>
                    <Save className="h-4 w-4" />
                    {simpanProfil.isPending ? "Menyimpan..." : "Simpan identitas"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Hanya Ketua RT atau Sekretaris yang dapat mengubah identitas.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operasional & Keuangan</CardTitle>
              <CardDescription>
                Tahun buku, zona waktu, dan default iuran. Dipakai saat menerbitkan tagihan baru.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={submitPengaturan((values) => simpanPengaturan.mutate(values))}
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tahun_buku_mulai">Bulan awal tahun buku (1–12)</Label>
                    <Input
                      id="tahun_buku_mulai"
                      type="number"
                      min={1}
                      max={12}
                      {...registerPengaturan("tahun_buku_mulai")}
                    />
                    {ePengaturan.tahun_buku_mulai ? (
                      <p className="text-sm text-destructive">
                        {ePengaturan.tahun_buku_mulai.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zona_waktu">Zona waktu</Label>
                    <Input
                      id="zona_waktu"
                      placeholder="Asia/Jakarta"
                      {...registerPengaturan("zona_waktu")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nominal_iuran_default">Nominal iuran default (Rp)</Label>
                    <Input
                      id="nominal_iuran_default"
                      type="number"
                      min={0}
                      {...registerPengaturan("nominal_iuran_default")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jatuh_tempo_iuran_tanggal">Tanggal jatuh tempo (1–28)</Label>
                    <Input
                      id="jatuh_tempo_iuran_tanggal"
                      type="number"
                      min={1}
                      max={28}
                      {...registerPengaturan("jatuh_tempo_iuran_tanggal")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="denda_persen">Denda keterlambatan (%)</Label>
                    <Input
                      id="denda_persen"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      {...registerPengaturan("denda_persen")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prefix_nomor">Prefix nomor surat/kuitansi</Label>
                    <Input
                      id="prefix_nomor"
                      placeholder="mis. RT05"
                      {...registerPengaturan("prefix_nomor")}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="jam_kirim">Jam kirim pengingat (HH:MM)</Label>
                    <Input
                      id="jam_kirim"
                      placeholder="08:00"
                      {...registerPengaturan("notifikasi.jam_kirim")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kanal default</Label>
                    <Controller
                      control={control}
                      name="notifikasi.kanal_default"
                      render={({ field }) => (
                        <Select value={field.value ?? "WhatsApp"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kanal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <input
                      id="pengingat_iuran"
                      type="checkbox"
                      className="h-4 w-4"
                      {...registerPengaturan("notifikasi.pengingat_iuran")}
                    />
                    <Label htmlFor="pengingat_iuran">Aktifkan pengingat iuran</Label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nama_ttd">Nama penanda tangan</Label>
                    <Input id="nama_ttd" {...registerPengaturan("dokumen.nama_ttd")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jabatan_ttd">Jabatan penanda tangan</Label>
                    <Input id="jabatan_ttd" {...registerPengaturan("dokumen.jabatan_ttd")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">URL logo RT (opsional)</Label>
                    <Input id="logo_url" {...registerPengaturan("branding.logo_url")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warna_aksen">Warna aksen sekunder (heks, mis. #0ea5e9)</Label>
                    <Input
                      id="warna_aksen"
                      placeholder="#0ea5e9"
                      {...registerPengaturan("branding.warna_aksen")}
                    />
                    {ePengaturan.branding?.warna_aksen ? (
                      <p className="text-sm text-destructive">
                        {ePengaturan.branding.warna_aksen.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <Button type="submit" disabled={simpanPengaturan.isPending}>
                  <Save className="h-4 w-4" />
                  {simpanPengaturan.isPending ? "Menyimpan..." : "Simpan pengaturan"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            <FileSignature className="h-4 w-4" />
            <Palette className="h-4 w-4" />
            <span>
              Dokumen &amp; branding dipakai untuk kop laporan dan tanda tangan pada cetakan nanti.
            </span>
          </div>
        </div>
      </DataState>
    </div>
  );
}
