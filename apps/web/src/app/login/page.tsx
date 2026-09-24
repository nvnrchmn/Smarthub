"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { loginSchema, type LoginInput, type Role } from "@smarthub/shared";
import { ApiError } from "@/lib/api-client";
import { HOME_BY_ROLE } from "@/lib/auth";
import { TableSkeleton } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LoginResponse {
  pengguna: { role: Role };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [mfaDiperlukan, setMfaDiperlukan] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", kode_mfa: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
        credentials: "same-origin",
      });

      const payload = (await response.json().catch(() => null)) as
        | { status: string; message?: string; data?: LoginResponse }
        | null;

      if (!response.ok || payload?.status === "error" || !payload?.data) {
        throw new ApiError(response.status, payload?.message ?? "Login gagal", []);
      }

      const redirectTo = searchParams.get("redirect");
      const target =
        redirectTo && redirectTo.startsWith("/")
          ? redirectTo
          : HOME_BY_ROLE[payload.data.pengguna.role];

      router.replace(target);
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Login gagal, silakan coba lagi";
      if (/mfa/i.test(message)) setMfaDiperlukan(true);
      setFormError(message);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              SH
            </span>
            <span className="text-lg font-semibold">SmartHub</span>
          </div>
          <CardTitle>Masuk ke akun Anda</CardTitle>
          <CardDescription>
            Masuk memakai email, nomor HP, atau username yang diberikan pengurus RT.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formError ? (
              <Alert variant="destructive">
                <AlertTitle>Login gagal</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="identifier">Email, Nomor HP, atau Username</Label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="nama@smarthub.local, 0812xxxxxxx, atau budi_santoso"
                {...register("identifier")}
              />
              {errors.identifier ? (
                <p className="text-sm text-destructive">{errors.identifier.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : null}
            </div>

            {mfaDiperlukan ? (
              <div className="space-y-2">
                <Label htmlFor="kode_mfa">Kode MFA</Label>
                <Input
                  id="kode_mfa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="6 digit dari aplikasi authenticator"
                  {...register("kode_mfa")}
                />
                {errors.kode_mfa ? (
                  <p className="text-sm text-destructive">{errors.kode_mfa.message}</p>
                ) : null}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <LogIn className="h-4 w-4" />
              {isSubmitting ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
          <TableSkeleton rows={4} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
