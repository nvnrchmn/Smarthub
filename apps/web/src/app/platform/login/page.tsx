"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kodeMfa, setKodeMfa] = useState("");
  const [mfaDiperlukan, setMfaDiperlukan] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/platform/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(kodeMfa ? { kode_mfa: kodeMfa } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        const message = payload?.message ?? "Login platform gagal";
        if (/mfa|kode mfa/i.test(message)) setMfaDiperlukan(true);
        throw new Error(message);
      }

      toast.success("Login platform berhasil");
      router.replace("/platform");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login platform gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Konsol Platform</CardTitle>
          </div>
          <CardDescription>Masuk sebagai Superadmin SmartHub.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {mfaDiperlukan ? (
              <div className="space-y-2">
                <Label htmlFor="kode_mfa">Kode MFA</Label>
                <Input
                  id="kode_mfa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={kodeMfa}
                  onChange={(event) => setKodeMfa(event.target.value)}
                  placeholder="6 digit dari aplikasi authenticator"
                  required
                />
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
