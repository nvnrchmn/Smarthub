"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";
import { queryKeys } from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PostCard } from "@/components/diskusi/post-card";
import { PostComposer } from "@/components/diskusi/post-composer";
import type { DiskusiItem } from "@/components/diskusi/types";

export default function DiskusiDetailPage() {
  const params = useParams<{ id_postingan: string }>();
  const idPostingan = Number(params.id_postingan);
  const queryClient = useQueryClient();

  const [modeEdit, setModeEdit] = useState(false);
  const [isiEdit, setIsiEdit] = useState("");

  const detailKey = queryKeys.diskusiDetail(idPostingan);
  const balasanKey = queryKeys.diskusiBalasan(idPostingan);

  const detailQuery = useQuery({
    queryKey: detailKey,
    queryFn: async () => (await apiFetch<DiskusiItem>(`/diskusi/postingan/${idPostingan}`)).data,
    enabled: Number.isFinite(idPostingan),
  });

  const balasanQuery = useQuery({
    queryKey: balasanKey,
    queryFn: async () =>
      (
        await apiFetch<DiskusiItem[]>(
          `/diskusi/postingan${buildQuery({ id_induk: idPostingan, limit: 50 })}`,
        )
      ).data,
    enabled: Number.isFinite(idPostingan),
  });

  const invalidateSemua = () => {
    void queryClient.invalidateQueries({ queryKey: ["diskusi"] });
  };

  const likeMutation = useMutation({
    mutationFn: (id_postingan: number) =>
      apiFetch(`/diskusi/postingan/${id_postingan}/reaksi`, { method: "POST" }),
    onMutate: async (id_postingan) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<DiskusiItem>(detailKey);
      if (previous && previous.id_postingan === id_postingan) {
        queryClient.setQueryData<DiskusiItem>(detailKey, {
          ...previous,
          disukai_saya: !previous.disukai_saya,
          jumlah_suka: previous.jumlah_suka + (previous.disukai_saya ? -1 : 1),
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
      toast.error("Gagal memperbarui suka");
    },
    onSettled: invalidateSemua,
  });

  const voteMutation = useMutation({
    mutationFn: ({ id_poll, id_opsi }: { id_poll: number; id_opsi: number }) =>
      apiFetch(`/diskusi/poll/${id_poll}/suara`, { method: "POST", body: { id_opsi } }),
    onSuccess: () => {
      toast.success("Suara Anda tercatat");
      invalidateSemua();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memberikan suara"),
  });

  const editMutation = useMutation({
    mutationFn: (isi: string) =>
      apiFetch(`/diskusi/postingan/${idPostingan}`, { method: "PATCH", body: { isi } }),
    onSuccess: () => {
      toast.success("Postingan diperbarui");
      setModeEdit(false);
      invalidateSemua();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memperbarui postingan"),
  });

  const hapusMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/diskusi/postingan/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Postingan dihapus");
      invalidateSemua();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal menghapus postingan"),
  });

  const moderasiMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "Aktif" | "Disembunyikan" }) =>
      apiFetch(`/diskusi/postingan/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      toast.success("Status postingan diperbarui");
      invalidateSemua();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Gagal memoderasi postingan"),
  });

  const postingan = detailQuery.data;
  const balasan = balasanQuery.data ?? [];

  const mulaiEdit = () => {
    if (!postingan) return;
    setIsiEdit(postingan.isi);
    setModeEdit(true);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Detail Diskusi"
        description="Postingan dan balasan warga."
        action={
          <Button variant="outline" asChild>
            <Link href="/diskusi">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Link>
          </Button>
        }
      />

      <DataState
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        error={detailQuery.error}
      >
        {postingan ? (
          <div className="space-y-4">
            {modeEdit ? (
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <Textarea
                  value={isiEdit}
                  rows={4}
                  maxLength={2000}
                  onChange={(event) => setIsiEdit(event.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setModeEdit(false)}>
                    Batal
                  </Button>
                  <Button
                    disabled={editMutation.isPending || isiEdit.trim().length === 0}
                    onClick={() => editMutation.mutate(isiEdit.trim())}
                  >
                    {editMutation.isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </div>
            ) : (
              <PostCard
                item={postingan}
                likePending={likeMutation.isPending}
                votePending={voteMutation.isPending}
                onToggleLike={(id) => likeMutation.mutate(id)}
                onVote={(id_poll, id_opsi) => voteMutation.mutate({ id_poll, id_opsi })}
                onDelete={(id) => {
                  if (window.confirm("Hapus postingan ini?")) hapusMutation.mutate(id);
                }}
                onModerate={(id, status) => moderasiMutation.mutate({ id, status })}
              />
            )}

            {postingan.bisa_diedit && !modeEdit ? (
              <Button variant="outline" size="sm" onClick={mulaiEdit}>
                <Pencil className="h-4 w-4" /> Ubah isi postingan
              </Button>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                Balasan ({postingan.jumlah_balasan})
              </h2>

              <PostComposer
                idInduk={postingan.id_postingan}
                placeholder="Tulis balasan..."
                onSuccess={invalidateSemua}
              />

              <DataState
                isLoading={balasanQuery.isLoading}
                isError={balasanQuery.isError}
                error={balasanQuery.error}
                isEmpty={balasan.length === 0}
                emptyMessage="Belum ada balasan"
              >
                <div className="space-y-3">
                  {balasan.map((item) => (
                    <PostCard
                      key={item.id_postingan}
                      item={item}
                      kompak
                      likePending={likeMutation.isPending}
                      onToggleLike={(id) => likeMutation.mutate(id)}
                      onDelete={(id) => {
                        if (window.confirm("Hapus balasan ini?")) hapusMutation.mutate(id);
                      }}
                      onModerate={(id, status) => moderasiMutation.mutate({ id, status })}
                    />
                  ))}
                </div>
              </DataState>
            </section>
          </div>
        ) : null}
      </DataState>
    </div>
  );
}
