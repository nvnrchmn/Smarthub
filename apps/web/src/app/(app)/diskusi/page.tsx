"use client";

import { useEffect, useRef } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery, type ApiResult } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/diskusi/post-card";
import { PostComposer } from "@/components/diskusi/post-composer";
import type { DiskusiItem } from "@/components/diskusi/types";

type FeedData = InfiniteData<ApiResult<DiskusiItem[]>>;

const LIMIT = 10;

export default function DiskusiFeedPage() {
  const queryClient = useQueryClient();
  const feedKey = queryKeys.diskusiFeed({ limit: LIMIT });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const feedQuery = useInfiniteQuery({
    queryKey: feedKey,
    queryFn: async ({ pageParam }) =>
      apiFetch<DiskusiItem[]>(
        `/diskusi/postingan${buildQuery({ limit: LIMIT, cursor: pageParam ?? undefined })}`,
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => {
      const meta = last.meta;
      if (meta && "has_more" in meta && meta.has_more && meta.next_cursor) {
        return meta.next_cursor;
      }
      return undefined;
    },
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feedQuery;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const likeMutation = useMutation({
    mutationFn: (id_postingan: number) =>
      apiFetch(`/diskusi/postingan/${id_postingan}/reaksi`, { method: "POST" }),
    onMutate: async (id_postingan) => {
      await queryClient.cancelQueries({ queryKey: feedKey });
      const previous = queryClient.getQueryData<FeedData>(feedKey);

      queryClient.setQueryData<FeedData>(feedKey, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((item) =>
                  item.id_postingan === id_postingan
                    ? {
                        ...item,
                        disukai_saya: !item.disukai_saya,
                        jumlah_suka: item.jumlah_suka + (item.disukai_saya ? -1 : 1),
                      }
                    : item,
                ),
              })),
            }
          : old,
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(feedKey, context.previous);
      }
      toast.error("Gagal memperbarui suka");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["diskusi"] }),
  });

  const voteMutation = useMutation({
    mutationFn: ({ id_poll, id_opsi }: { id_poll: number; id_opsi: number }) =>
      apiFetch(`/diskusi/poll/${id_poll}/suara`, { method: "POST", body: { id_opsi } }),
    onSuccess: () => {
      toast.success("Suara Anda tercatat");
      void queryClient.invalidateQueries({ queryKey: ["diskusi"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memberikan suara"),
  });

  const moderasiMutation = useMutation({
    mutationFn: ({
      id_postingan,
      status,
    }: {
      id_postingan: number;
      status: "Aktif" | "Disembunyikan";
    }) =>
      apiFetch(`/diskusi/postingan/${id_postingan}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: (_result, variables) => {
      toast.success(
        variables.status === "Disembunyikan" ? "Postingan disembunyikan" : "Postingan ditampilkan",
      );
      void queryClient.invalidateQueries({ queryKey: ["diskusi"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memoderasi postingan"),
  });

  const hapusMutation = useMutation({
    mutationFn: (id_postingan: number) =>
      apiFetch(`/diskusi/postingan/${id_postingan}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Postingan dihapus");
      void queryClient.invalidateQueries({ queryKey: ["diskusi"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal menghapus postingan"),
  });

  const konfirmasiHapus = (id_postingan: number) => {
    if (window.confirm("Hapus postingan ini? Tindakan ini tidak dapat dibatalkan.")) {
      hapusMutation.mutate(id_postingan);
    }
  };

  const items = feedQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const likePending = likeMutation.isPending;
  const votePending = voteMutation.isPending;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Diskusi Warga"
        description="Ruang berbagi informasi, pengumuman, dan musyawarah lingkungan RT."
      />

      <PostComposer
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["diskusi"] });
        }}
      />

      <div className="mt-4">
        <DataState
          isLoading={feedQuery.isLoading}
          isError={feedQuery.isError}
          error={feedQuery.error}
          isEmpty={items.length === 0}
          emptyMessage="Belum ada diskusi. Jadilah yang pertama memulai."
        >
          <div className="space-y-3">
            {items.map((item) => (
              <PostCard
                key={item.id_postingan}
                item={item}
                likePending={likePending}
                votePending={votePending}
                onToggleLike={(id) => likeMutation.mutate(id)}
                onVote={(id_poll, id_opsi) => voteMutation.mutate({ id_poll, id_opsi })}
                onDelete={konfirmasiHapus}
                onModerate={(id_postingan, status) =>
                  moderasiMutation.mutate({ id_postingan, status })
                }
              />
            ))}
          </div>

          <div ref={sentinelRef} className="h-4" />

          {isFetchingNextPage ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Memuat diskusi lain...</p>
          ) : null}

          {!hasNextPage && items.length > 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Semua diskusi sudah ditampilkan
            </p>
          ) : null}

          {hasNextPage && !isFetchingNextPage ? (
            <div className="py-4 text-center">
              <Button variant="outline" size="sm" onClick={() => void fetchNextPage()}>
                Muat lebih banyak
              </Button>
            </div>
          ) : null}
        </DataState>
      </div>
    </div>
  );
}
