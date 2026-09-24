"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} className="h-12 w-full" />
    ))}
  </div>
);

export const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
    <Inbox className="h-8 w-8 text-muted-foreground" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

export const ErrorState = ({ error }: { error: unknown }) => {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Terjadi kesalahan";

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Gagal memuat data</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

export const DataState = ({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyMessage = "Belum ada data",
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) => {
  if (isLoading) return <TableSkeleton />;
  if (isError) return <ErrorState error={error} />;
  if (isEmpty) return <EmptyState message={emptyMessage} />;
  return <>{children}</>;
};
