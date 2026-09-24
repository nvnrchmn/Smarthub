"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { apiFetch, buildQuery } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface WargaKandidat {
  nik: string;
  nama_lengkap: string;
  no_kk: string;
  nomor_rumah: string;
  blok: string;
}

export const WargaNikCombobox = ({
  value,
  onChange,
  disabled = false,
  invalid = false,
}: {
  value: string;
  onChange: (nik: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const kandidatQuery = useQuery({
    queryKey: ["warga", "kandidat-akun", debounced],
    queryFn: async () =>
      (
        await apiFetch<WargaKandidat[]>(
          `/auth/akun/kandidat${buildQuery({ q: debounced || undefined, limit: 20 })}`,
        )
      ).data,
    enabled: open,
    staleTime: 10_000,
  });

  const kandidat = kandidatQuery.data ?? [];
  const selected = kandidat.find((item) => item.nik === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            "h-auto min-h-10 w-full justify-between py-2 font-normal",
            invalid && "border-destructive",
          )}
        >
          <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
            {selected
              ? `${selected.nama_lengkap} — ${selected.nik}`
              : value || "Cari & pilih NIK warga"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cari nama atau NIK..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {kandidatQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat data warga...
              </div>
            ) : kandidatQuery.isError ? (
              <div className="px-3 py-6 text-center text-sm text-destructive">
                Gagal memuat data warga.
              </div>
            ) : kandidat.length === 0 ? (
              <CommandEmpty>
                {debounced
                  ? "Warga tidak ditemukan atau sudah memiliki akun."
                  : "Semua warga sudah memiliki akun."}
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Warga belum memiliki akun">
                {kandidat.map((item) => (
                  <CommandItem
                    key={item.nik}
                    value={item.nik}
                    onSelect={() => {
                      onChange(item.nik);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === item.nik ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{item.nama_lengkap}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        NIK {item.nik} • Rumah {item.nomor_rumah} (Blok {item.blok})
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
