"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImagePlus, ListPlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { queryKeys } from "@smarthub/shared";
import { cn } from "@/lib/utils";
import { ApiError, apiFetch, apiUpload, buildQuery } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const MAKS_OPSI = 6;

interface MentionKandidat {
  id_pengguna: number;
  username: string | null;
  nama_lengkap: string | null;
  role: string;
}

const tokenMention = (value: string, caret: number): string | null => {
  const sebelum = value.slice(0, caret);
  const hasil = /@([a-z0-9_]*)$/i.exec(sebelum);
  return hasil ? (hasil[1] ?? "") : null;
};

export const PostComposer = ({
  idInduk,
  onSuccess,
  placeholder = "Apa yang ingin Anda sampaikan ke warga?",
  autoFocus = false,
}: {
  idInduk?: number;
  onSuccess?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) => {
  const [isi, setIsi] = useState("");
  const [lampiran, setLampiran] = useState<string[]>([]);
  const [opsiPoll, setOpsiPoll] = useState<string[]>([]);
  const [mengunggah, setMengunggah] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionDebounced, setMentionDebounced] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mentionQuery === null) {
      setMentionDebounced("");
      return;
    }
    const timer = setTimeout(() => setMentionDebounced(mentionQuery), 250);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const mentionAktif = mentionQuery !== null;

  const kandidatQuery = useQuery({
    queryKey: queryKeys.diskusiMention(mentionDebounced),
    queryFn: async () =>
      (
        await apiFetch<MentionKandidat[]>(
          `/diskusi/mention${buildQuery({ q: mentionDebounced || undefined, limit: 8 })}`,
        )
      ).data,
    enabled: mentionAktif,
    staleTime: 15_000,
  });

  const ubahIsi = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nilai = event.target.value;
    setIsi(nilai);
    setMentionQuery(tokenMention(nilai, event.target.selectionStart ?? nilai.length));
  };

  const kandidat = kandidatQuery.data ?? [];

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionDebounced, mentionAktif]);

  const tombolMention = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionAktif || kandidat.length === 0) return false;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMentionIndex((sebelum) => (sebelum + 1) % kandidat.length);
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setMentionIndex((sebelum) => (sebelum - 1 + kandidat.length) % kandidat.length);
      return true;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const terpilih = kandidat[mentionIndex];
      if (terpilih) pilihMention(terpilih.username ?? "");
      return true;
    }

    if (event.key === "Escape") {
      setMentionQuery(null);
      return true;
    }

    return false;
  };

  const pilihMention = (username: string) => {
    const el = textareaRef.current;
    if (!el || !username) return;

    const caret = el.selectionStart ?? isi.length;
    const sebelum = isi.slice(0, caret);
    const posisi = sebelum.lastIndexOf("@");
    if (posisi < 0) return;

    const baru = `${sebelum.slice(0, posisi)}@${username} ${isi.slice(caret)}`;
    setIsi(baru);
    setMentionQuery(null);

    window.requestAnimationFrame(() => {
      const pos = posisi + username.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const kirimMutation = useMutation({
    mutationFn: async () => {
      const pollAktif = opsiPoll.map((label) => label.trim()).filter(Boolean);
      if (opsiPoll.length > 0 && pollAktif.length < 2) {
        throw new ApiError(422, "Poll minimal 2 opsi yang terisi", []);
      }

      return apiFetch("/diskusi/postingan", {
        method: "POST",
        body: {
          isi: isi.trim(),
          ...(idInduk !== undefined ? { id_induk: idInduk } : {}),
          ...(lampiran.length > 0 ? { lampiran } : {}),
          ...(pollAktif.length >= 2 ? { poll: { opsi: pollAktif } } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success(idInduk ? "Balasan terkirim" : "Postingan terkirim");
      setIsi("");
      setLampiran([]);
      setOpsiPoll([]);
      onSuccess?.();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const first = error.errors[0];
        toast.error(first ? `${first.field}: ${first.message}` : error.message);
        return;
      }
      toast.error("Gagal mengirim postingan");
    },
  });

  const unggah = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const sisa = 4 - lampiran.length;
    if (sisa <= 0) {
      toast.error("Maksimal 4 lampiran");
      return;
    }

    setMengunggah(true);
    try {
      const hasil: string[] = [];
      for (const file of Array.from(files).slice(0, sisa)) {
        hasil.push(await apiUpload(file));
      }
      setLampiran((prev) => [...prev, ...hasil]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengunggah lampiran");
    } finally {
      setMengunggah(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const bisaKirim = isi.trim().length > 0 && !kirimMutation.isPending && !mengunggah;

  return (
    <div className="rounded-lg border bg-card p-4">
      <Popover
        open={mentionAktif}
        onOpenChange={(open) => {
          if (!open) setMentionQuery(null);
        }}
      >
        <PopoverAnchor asChild>
          <div>
            <Textarea
              ref={textareaRef}
              value={isi}
              autoFocus={autoFocus}
              placeholder={placeholder}
              rows={3}
              maxLength={2000}
              onChange={ubahIsi}
              onKeyDown={tombolMention}
              onBlur={() => window.setTimeout(() => setMentionQuery(null), 250)}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-[320px] p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {kandidatQuery.isLoading ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">Mencari warga...</div>
              ) : kandidat.length === 0 ? (
                <CommandEmpty>Tidak ada warga yang cocok</CommandEmpty>
              ) : (
                kandidat.map((orang, index) => (
                  <CommandItem
                    key={orang.id_pengguna}
                    value={orang.username ?? String(orang.id_pengguna)}
                    onSelect={() => pilihMention(orang.username ?? "")}
                    onMouseEnter={() => setMentionIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    className={cn(index === mentionIndex && "bg-accent text-accent-foreground")}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{orang.nama_lengkap ?? "Tanpa nama"}</span>
                      <span className="text-xs text-muted-foreground">@{orang.username}</span>
                    </span>
                  </CommandItem>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="mt-1 text-xs text-muted-foreground">
        Tulis <span className="font-medium">@username</span> untuk menyebut warga; gunakan{" "}
        <span className="font-medium">↑/↓</span> lalu <span className="font-medium">Enter</span> untuk
        memilih. Sebutan mengirim notifikasi ke yang disebut.
      </p>

      {lampiran.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {lampiran.map((url) => (
            <span key={url} className="relative">
              <img src={url} alt="Lampiran" className="h-16 w-16 rounded-md border object-cover" />
              <button
                type="button"
                aria-label="Hapus lampiran"
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                onClick={() => setLampiran((prev) => prev.filter((item) => item !== url))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {opsiPoll.length > 0 ? (
        <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Opsi poll</p>
          {opsiPoll.map((opsi, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={opsi}
                maxLength={80}
                placeholder={`Opsi ${index + 1}`}
                onChange={(event) =>
                  setOpsiPoll((prev) =>
                    prev.map((item, i) => (i === index ? event.target.value : item)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Hapus opsi"
                onClick={() => setOpsiPoll((prev) => prev.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(event) => void unggah(event.target.files)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mengunggah || lampiran.length >= 4}
            onClick={() => fileRef.current?.click()}
          >
            {mengunggah ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            Lampiran
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={opsiPoll.length >= MAKS_OPSI}
            onClick={() => setOpsiPoll((prev) => [...prev, ""])}
          >
            <ListPlus className="h-4 w-4" /> Poll
          </Button>
        </div>

        <Button
          type="button"
          disabled={!bisaKirim}
          onClick={() => kirimMutation.mutate()}
        >
          {kirimMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {idInduk ? "Balas" : "Kirim"}
        </Button>
      </div>
    </div>
  );
};
