"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TableSkeleton } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  const akhiriImpersonasi = async () => {
    await fetch("/api/platform/end-impersonation", { method: "POST" });
    router.replace("/platform");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen">
      {data.impersonasi ? (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-warning/40 bg-warning/15 px-4 py-2 text-sm">
          <Eye className="h-4 w-4" />
          <span>Mode impersonasi aktif — hanya baca (read-only). Aksi tulis diblokir.</span>
          <Button size="sm" variant="outline" onClick={akhiriImpersonasi}>
            Akhiri Impersonasi
          </Button>
        </div>
      ) : null}
      <AppShell me={data}>{children}</AppShell>
    </div>
  );
}
