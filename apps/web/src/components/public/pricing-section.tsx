"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { springSnappy } from "@/lib/motion";
import {
  PAKET,
  TRIAL_HARI,
  batasRumahLabel,
  formatRupiah,
  FEE_TRANSAKSI_FLAT,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Periode = "bulanan" | "tahunan";

const PERIODE_LABEL: Record<Periode, string> = { bulanan: "Bulanan", tahunan: "Tahunan" };

export const PricingSection = () => {
  const [periode, setPeriode] = useState<Periode>("bulanan");
  const reduce = useReducedMotion();

  return (
    <section
      id="paket"
      className="scroll-mt-20 border-y border-border/60 bg-muted/20 py-16 lg:py-24"
    >
      <div className="container space-y-10" data-reveal>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <Badge variant="secondary">Paket &amp; Harga</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pilih paket sesuai ukuran RT Anda
          </h2>
          <p className="text-muted-foreground">
            Semua paket mendapat{" "}
            <strong className="text-foreground">trial {TRIAL_HARI} hari</strong> dengan fitur Pro.
            Tanpa auto-renew — perpanjangan dilakukan manual.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative inline-flex rounded-full border border-border/70 bg-background p-1">
            {(Object.keys(PERIODE_LABEL) as Periode[]).map((item) => {
              const active = periode === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPeriode(item)}
                  className={cn(
                    "relative z-10 touch-manipulation rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 ease-ios",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active ? (
                    reduce ? (
                      <span
                        className="absolute inset-0 -z-10 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <motion.span
                        layoutId="pricing-periode"
                        className="absolute inset-0 -z-10 rounded-full bg-primary"
                        transition={springSnappy}
                        aria-hidden="true"
                      />
                    )
                  ) : null}
                  {PERIODE_LABEL[item]}
                </button>
              );
            })}
          </div>
        </div>

        <ul className="grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PAKET.map((paket, index) => {
            const gratis = paket.harga_bulanan === 0;
            const harga = periode === "bulanan" ? paket.harga_bulanan : paket.harga_tahunan;
            const per = periode === "bulanan" ? "/bulan" : "/tahun";
            const hemat = paket.harga_bulanan * 12 - paket.harga_tahunan;
            return (
              <li
                key={paket.kode}
                data-reveal
                style={{ "--reveal-delay": `${index * 70}ms` } as CSSProperties}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6 transition-all duration-300 ease-ios hover:-translate-y-1 hover:shadow-lg",
                  paket.populer
                    ? "border-primary/60 shadow-md ring-1 ring-primary/30"
                    : "border-border/60",
                )}
              >
                {paket.populer ? (
                  <Badge className="absolute -top-3 left-6 gap-1">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Paling populer
                  </Badge>
                ) : null}

                <h3 className="text-lg font-semibold">{paket.nama}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {batasRumahLabel(paket.batas_rumah)}
                </p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    {gratis ? "Gratis" : formatRupiah(harga)}
                  </span>
                  {!gratis ? <span className="text-sm text-muted-foreground">{per}</span> : null}
                </div>
                {gratis ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selamanya gratis — upgrade kapan saja tanpa kehilangan data.
                  </p>
                ) : periode === "tahunan" && hemat > 0 ? (
                  <p className="mt-1 text-xs font-medium text-success">
                    Hemat {formatRupiah(hemat)} — setara 2 bulan gratis
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tanpa biaya transaksi bila tidak memakai QRIS.
                  </p>
                )}

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {paket.fitur.map((fitur) => (
                    <li key={fitur} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      <span>{fitur}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className="mt-6 w-full"
                  variant={paket.populer ? "default" : "outline"}
                >
                  <Link href="/login">{gratis ? "Mulai gratis" : "Masuk untuk aktivasi"}</Link>
                </Button>
              </li>
            );
          })}
        </ul>

        <div className="mx-auto max-w-3xl space-y-2 rounded-xl border border-border/60 bg-card p-4 text-center text-xs text-muted-foreground">
          <p>
            Harga paket belum termasuk biaya transaksi QRIS opsional sebesar{" "}
            <strong className="text-foreground">{formatRupiah(FEE_TRANSAKSI_FLAT)}</strong> per
            transaksi. Tanpa QRIS, biaya transaksi <strong className="text-foreground">Rp0</strong>.
          </p>
          <p>
            Aktivasi dan perubahan paket dilakukan pengurus setelah masuk (menu Langganan). Data
            tidak dihapus saat turun paket.
          </p>
        </div>
      </div>
    </section>
  );
};
