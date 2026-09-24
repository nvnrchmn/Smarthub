"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@smarthub/shared";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type FormValues = Omit<ResetPasswordInput, "token">;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(resetPasswordSchema.omit({ token: true })),
    defaultValues: { password_baru: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password_baru: values.password_baru }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { status: string; message?: string }
        | null;

      if (!response.ok || payload?.status === "error") {
        throw new ApiError(response.status, payload?.message ?? "Gagal mereset password", []);
      }

      setSuccess(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Gagal mereset password");
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tautan tidak valid</CardTitle>
          <CardDescription>
            Tautan reset password tidak lengkap. Minta pengurus RT mengirim ulang tautan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Kembali ke halaman masuk</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <KeyRound className="h-4 w-4" />
        </span>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Buat password baru untuk akun SmartHub Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <Alert variant="success">
              <AlertTitle>Password berhasil direset</AlertTitle>
              <AlertDescription>Silakan masuk kembali menggunakan password baru Anda.</AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link href="/login">Ke halaman masuk</Link>
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formError ? (
              <Alert variant="destructive">
                <AlertTitle>Gagal</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="password_baru">Password baru</Label>
              <Input
                id="password_baru"
                type="password"
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                {...register("password_baru")}
              />
              {errors.password_baru ? (
                <p className="text-sm text-destructive">{errors.password_baru.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan password baru"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
