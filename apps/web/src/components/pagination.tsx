"use client";

import type { ResponseMeta } from "@smarthub/shared";
import { Button } from "@/components/ui/button";

export const Pagination = ({
  meta,
  onPageChange,
}: {
  meta?: ResponseMeta;
  onPageChange: (page: number) => void;
}) => {
  if (!meta || !("page" in meta)) return null;

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Menampilkan halaman {meta.page} dari {totalPages} ({meta.total} data)
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
};
