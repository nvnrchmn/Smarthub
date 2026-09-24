"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LogOut, KeyRound, ShieldCheck } from "lucide-react";
import {
  ROLE_LABELS,
  changePasswordSchema,
  queryKeys,
  type ChangePasswordInput,
} from "@smarthub/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ProfilPage() {
  const { data: me, isLoading, isError, error } = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpauth, setMfaOtpauth] = useState<string | null>(null);
  const [mfaKode, setMfaKode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  const jalankanMfa = async (aksi: () => Promise<unknown>, pesan: string) => {
    setMfaBusy(true);
    try {
      await aksi();
      toast.success(pesan);
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
    } catch (mfaError) {
      toast.error(mfaError instanceof ApiError ? mfaError.message : "Aksi MFA gagal");
    } finally {
      setMfaBusy(false);
    }
  };

  const mulaiMfa = () =>
    jalankanMfa(async () => {
      const hasil = await apiFetch<{ secret: string; otpauth_url: string }>("/auth/mfa/setup", {
        method: "POST",
      });
      setMfaSecret(hasil.data.secret);
      setMfaOtpauth(hasil.data.otpauth_url);
    }, "Masukkan secret ke aplikasi authenticator");

  const aktifkanMfa = () =>
    jalankanMfa(async () => {
      await apiFetch("/auth/mfa/activate", { method: "POST", body: { kode: mfaKode } });
      setMfaSecret(null);
      setMfaOtpauth(null);
      setMfaKode("");
    }, "MFA diaktifkan");

  const nonaktifkanMfa = () =>
    jalankanMfa(async () => {
      await apiFetch("/auth/mfa/disable", { method: "POST", body: { kode: mfaKode } });
      setMfaKode("");
    }, "MFA dinonaktifkan");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password_lama: "", password_baru: "" },
  });

  useEffect(() => {
    if (me) document.title = `Profil - SmartHub`;
  }, [me]);

  const onSubmit = async (values: ChangePasswordInput) => {
    setSubmitting(true);
    try {
      await apiFetch("/auth/password", { method: "PATCH", body: values });
      toast.success("Password berhasil diubah");
      reset();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        Object.entries(submitError.fieldErrors).forEach(([field, message]) => {
          if (field === "password_lama" || field === "password_baru") {
            setError(field, { message });
          }
        });
        toast.error(submitError.message);
      } else {
        toast.error("Gagal mengubah password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profil Saya" description="Kelola data akun dan password Anda." />

      <DataState isLoading={isLoading} isError={isError} error={error}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Akun</CardTitle>
              <CardDescription>Data ini terhubung dengan identitas kependudukan Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Nama lengkap</p>
                  <p className="font-medium">{me?.nama_lengkap ?? "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NIK</p>
                  <p className="font-medium">{me?.nik}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{me?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{me ? ROLE_LABELS[me.role] : "-"}</p>
                </div>
              </div>
              <Separator />
              <Button variant="outline" onClick={() => void logout()}>
                <LogOut className="h-4 w-4" /> Keluar dari akun
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ubah Password</CardTitle>
              <CardDescription>Minimal 8 karakter. Gunakan kombinasi yang sulit ditebak.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="password_lama">Password lama</Label>
                  <Input id="password_lama" type="password" {...register("password_lama")} />
                  {errors.password_lama ? (
                    <p className="text-sm text-destructive">{errors.password_lama.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_baru">Password baru</Label>
                  <Input id="password_baru" type="password" {...register("password_baru")} />
                  {errors.password_baru ? (
                    <p className="text-sm text-destructive">{errors.password_baru.message}</p>
                  ) : null}
                </div>
                <Button type="submit" disabled={submitting}>
                  <KeyRound className="h-4 w-4" />
                  {submitting ? "Menyimpan..." : "Simpan password baru"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Autentikasi Dua Faktor (MFA)</CardTitle>
              <CardDescription>
                Lindungi akun dengan kode 6 digit dari aplikasi authenticator. Status:{" "}
                {me?.mfa_aktif ? "Aktif" : "Belum aktif"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!me?.mfa_aktif && !mfaSecret ? (
                <Button variant="outline" disabled={mfaBusy} onClick={() => void mulaiMfa()}>
                  <ShieldCheck className="h-4 w-4" /> Aktifkan MFA
                </Button>
              ) : null}

              {!me?.mfa_aktif && mfaSecret ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Secret</Label>
                    <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">{mfaSecret}</pre>
                    {mfaOtpauth ? (
                      <p className="break-all text-xs text-muted-foreground">{mfaOtpauth}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mfa-kode">Kode 6 digit</Label>
                    <Input
                      id="mfa-kode"
                      inputMode="numeric"
                      maxLength={6}
                      value={mfaKode}
                      onChange={(event) => setMfaKode(event.target.value)}
                    />
                  </div>
                  <Button
                    disabled={mfaKode.length !== 6 || mfaBusy}
                    onClick={() => void aktifkanMfa()}
                  >
                    {mfaBusy ? "Memproses..." : "Konfirmasi & Aktifkan"}
                  </Button>
                </div>
              ) : null}

              {me?.mfa_aktif ? (
                <div className="space-y-2">
                  <Label htmlFor="mfa-nonaktif">Kode 6 digit untuk menonaktifkan</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mfa-nonaktif"
                      inputMode="numeric"
                      maxLength={6}
                      value={mfaKode}
                      onChange={(event) => setMfaKode(event.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={mfaKode.length !== 6 || mfaBusy}
                      onClick={() => void nonaktifkanMfa()}
                    >
                      Nonaktifkan
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </DataState>
    </div>
  );
}
