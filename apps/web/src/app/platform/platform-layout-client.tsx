"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { platformFetch } from "@/lib/platform-api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PlatformMe {
  id_akun_platform: number;
  nama: string;
  email: string;
  role: string;
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["platform", "me"],
    queryFn: async () => (await platformFetch<PlatformMe>("/me")).data,
    retry: false,
  });

  const logout = async () => {
    await fetch("/api/platform/auth/logout", { method: "POST" });
    queryClient.clear();
    router.replace("/platform/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-semibold">Konsol Platform SmartHub</span>
            </div>
            <nav className="hidden items-center gap-3 text-sm sm:flex">
              <Link href="/platform" className="text-muted-foreground hover:text-foreground">
                Dasbor
              </Link>
              <Link href="/platform/paket" className="text-muted-foreground hover:text-foreground">
                Paket
              </Link>
              <Link href="/platform/metrik" className="text-muted-foreground hover:text-foreground">
                Metrik
              </Link>
              <Link
                href="/platform/rekonsiliasi"
                className="text-muted-foreground hover:text-foreground"
              >
                Rekonsiliasi
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {meQuery.data ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {meQuery.data.nama}
                </span>
                <Badge variant="secondary">{meQuery.data.role}</Badge>
              </>
            ) : null}
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
