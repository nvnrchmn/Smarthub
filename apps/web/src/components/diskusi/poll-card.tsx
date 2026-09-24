"use client";

import { BarChart3, Clock } from "lucide-react";
import { formatTanggalSingkat } from "@smarthub/shared";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PollItem } from "@/components/diskusi/types";

export const PollCard = ({
  poll,
  onVote,
  pending = false,
}: {
  poll: PollItem;
  onVote: (id_opsi: number) => void;
  pending?: boolean;
}) => {
  const showResults = poll.sudah_vote || poll.sudah_berakhir;

  return (
    <div className="mt-3 space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" /> Poll • {poll.total_suara} suara
        </span>
        {poll.berakhir_pada ? (
          <Badge variant={poll.sudah_berakhir ? "secondary" : "outline"}>
            <Clock className="mr-1 h-3 w-3" />
            {poll.sudah_berakhir ? "Ditutup" : `Sampai ${formatTanggalSingkat(poll.berakhir_pada)}`}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-2">
        {poll.opsi.map((opsi) => {
          const dipilih = poll.pilihan_saya === opsi.id_opsi;
          return (
            <button
              key={opsi.id_opsi}
              type="button"
              disabled={showResults || pending}
              onClick={() => onVote(opsi.id_opsi)}
              className={cn(
                "relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors",
                showResults
                  ? "cursor-default"
                  : "hover:border-primary hover:bg-primary/5 disabled:opacity-60",
                dipilih && "border-primary",
              )}
            >
              {showResults ? (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 -z-0 transition-all",
                    dipilih ? "bg-primary/20" : "bg-muted",
                  )}
                  style={{ width: `${opsi.persen}%` }}
                />
              ) : null}
              <span className="relative z-10 flex items-center justify-between gap-2">
                <span className={cn("truncate", dipilih && "font-medium")}>
                  {opsi.label}
                  {dipilih ? " •" : ""}
                </span>
                {showResults ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {opsi.persen}% ({opsi.jumlah_suara})
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {!showResults ? (
        <p className="text-xs text-muted-foreground">Pilih salah satu opsi. Suara tidak dapat diubah.</p>
      ) : null}
    </div>
  );
};
