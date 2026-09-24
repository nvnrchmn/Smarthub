"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { queryKeys } from "@smarthub/shared";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export const NotificationBell = () => {
  const router = useRouter();

  const jumlahQuery = useQuery({
    queryKey: queryKeys.notifikasiJumlah,
    queryFn: async () =>
      (await apiFetch<{ belum_dibaca: number }>("/notifikasi/jumlah")).data,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const jumlah = jumlahQuery.data?.belum_dibaca ?? 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={jumlah > 0 ? `Notifikasi (${jumlah} belum dibaca)` : "Notifikasi"}
      onClick={() => router.push("/notifikasi")}
    >
      <Bell className="h-5 w-5" />
      {jumlah > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          {jumlah > 9 ? "9+" : jumlah}
        </span>
      ) : null}
    </Button>
  );
};
