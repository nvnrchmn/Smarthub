"use client";

import Link from "next/link";
import { EyeOff, Heart, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ROLE_LABELS, formatTanggalWaktu } from "@smarthub/shared";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PollCard } from "@/components/diskusi/poll-card";
import type { DiskusiItem } from "@/components/diskusi/types";

const renderIsi = (item: DiskusiItem) => {
  if (item.mention.length === 0) return item.isi;

  const dikenal = new Map(item.mention.map((orang) => [orang.username.toLowerCase(), orang]));
  const bagian = item.isi.split(/(@[a-z0-9_]{3,30})/gi);

  return bagian.map((teks, index) => {
    if (!teks.startsWith("@")) {
      return <span key={index}>{teks}</span>;
    }

    const orang = dikenal.get(teks.slice(1).toLowerCase());
    if (!orang) {
      return <span key={index}>{teks}</span>;
    }

    return (
      <span
        key={index}
        title={orang.nama_lengkap ?? orang.username}
        className="rounded bg-primary/10 px-1 font-medium text-primary"
      >
        {teks}
      </span>
    );
  });
};

export const PostCard = ({
  item,
  onToggleLike,
  onVote,
  onDelete,
  onModerate,
  likePending = false,
  votePending = false,
  kompak = false,
}: {
  item: DiskusiItem;
  onToggleLike?: (id_postingan: number) => void;
  onVote?: (id_poll: number, id_opsi: number) => void;
  onDelete?: (id_postingan: number) => void;
  onModerate?: (id_postingan: number, status: "Aktif" | "Disembunyikan") => void;
  likePending?: boolean;
  votePending?: boolean;
  kompak?: boolean;
}) => {
  const namaPenulis = item.penulis.nama_lengkap ?? "Pengguna SmartHub";
  const inisial = namaPenulis.charAt(0).toUpperCase();
  const adaMenu = Boolean(onDelete ?? onModerate);

  return (
    <article className="rounded-lg border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {inisial}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{namaPenulis}</span>
              <Badge variant="outline" className="text-[10px]">
                {ROLE_LABELS[item.penulis.role]}
              </Badge>
              {item.status !== "Aktif" ? (
                <Badge variant="warning" className="text-[10px]">
                  {item.status}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{formatTanggalWaktu(item.createdAt)}</p>
          </div>
        </div>

        {adaMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Aksi postingan">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {item.bisa_diedit ? (
                <DropdownMenuItem asChild>
                  <Link href={`/diskusi/${item.id_postingan}`}>
                    <Pencil className="h-4 w-4" /> Buka & ubah
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {item.bisa_dimoderasi && onModerate ? (
                <>
                  {item.bisa_diedit ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    onSelect={() =>
                      onModerate(
                        item.id_postingan,
                        item.status === "Aktif" ? "Disembunyikan" : "Aktif",
                      )
                    }
                  >
                    <EyeOff className="h-4 w-4" />
                    {item.status === "Aktif" ? "Sembunyikan" : "Tampilkan kembali"}
                  </DropdownMenuItem>
                </>
              ) : null}
              {item.bisa_dihapus && onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => onDelete(item.id_postingan)}
                  >
                    <Trash2 className="h-4 w-4" /> Hapus
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
        {renderIsi(item)}
      </p>

      {item.lampiran.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {item.lampiran.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-md border"
            >
              <img src={url} alt="Lampiran diskusi" className="h-32 w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}

      {item.poll && onVote ? (
        <PollCard
          poll={item.poll}
          pending={votePending}
          onVote={(id_opsi) => onVote(item.poll!.id_poll, id_opsi)}
        />
      ) : item.poll ? (
        <PollCard poll={item.poll} onVote={() => undefined} />
      ) : null}

      <footer className="mt-3 flex items-center gap-1 border-t pt-3">
        {onToggleLike ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={likePending}
            onClick={() => onToggleLike(item.id_postingan)}
            className={cn(item.disukai_saya && "text-destructive")}
          >
            <Heart className={cn("h-4 w-4", item.disukai_saya && "fill-current")} />
            {item.jumlah_suka}
          </Button>
        ) : (
          <span className="flex items-center gap-1 px-3 text-sm text-muted-foreground">
            <Heart className={cn("h-4 w-4", item.disukai_saya && "fill-current text-destructive")} />
            {item.jumlah_suka}
          </span>
        )}

        {kompak ? (
          <span className="flex items-center gap-1 px-3 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" /> {item.jumlah_balasan}
          </span>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/diskusi/${item.id_postingan}`}>
              <MessageCircle className="h-4 w-4" /> {item.jumlah_balasan}
            </Link>
          </Button>
        )}
      </footer>
    </article>
  );
};
