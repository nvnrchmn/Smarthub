import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  CheckCircle2,
  FileText,
  Lock,
  MessageSquare,
  QrCode,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicSiteFooter } from "@/components/public/public-site-footer";
import { PublicSiteHeader } from "@/components/public/public-site-header";

const FEATURES = [
  {
    icon: Users,
    title: "Kependudukan",
    description:
      "Kelola Rumah, Kartu Keluarga, Warga, dan mutasi penduduk dalam satu basis data yang rapi.",
  },
  {
    icon: ShieldCheck,
    title: "Keamanan & Tamu",
    description:
      "Buku tamu digital dengan log masuk-keluar, memudahkan petugas keamanan dan audit.",
  },
  {
    icon: Wallet,
    title: "Iuran & Kas RT",
    description: "Tagihan, kas, dan ringkasan keuangan RT yang transparan dan mudah ditelusuri.",
  },
  {
    icon: QrCode,
    title: "QRIS & Pencairan",
    description: "Terima iuran lewat QRIS dan ajukan pencairan dana langsung dari dashboard.",
  },
  {
    icon: MessageSquare,
    title: "Diskusi Warga",
    description: "Pengumuman, polling, dan sebutan warga dengan notifikasi otomatis.",
  },
  {
    icon: Store,
    title: "Marketplace Warga",
    description: "Jual-beli dan promosi usaha antar warga, lengkap dengan moderasi.",
  },
];

const STEPS = [
  {
    title: "Masuk sesuai peran",
    description:
      "Ketua, Sekretaris, Bendahara, Keamanan, dan Warga punya akses yang berbeda dan sesuai kebutuhan.",
  },
  {
    title: "Lengkapi data RT",
    description:
      "Impor atau isi data rumah dan keluarga, lalu aktifkan fitur keuangan dan komunikasi.",
  },
  {
    title: "Aktifkan QRIS",
    description:
      "Selesaikan verifikasi identitas sekali; setelah kanal aktif, iuran QRIS siap diterima.",
  },
  {
    title: "Pantau & cairkan",
    description:
      "Lihat iuran masuk, rekonsiliasi otomatis, dan ajukan pencairan ke rekening RT dengan aman.",
  },
];

const ROLES = [
  {
    role: "Ketua RT",
    description: "Akses penuh, menyetujui pencairan, dan memantau seluruh modul.",
  },
  { role: "Sekretaris", description: "Mengelola kependudukan, surat, dan pengumuman warga." },
  { role: "Bendahara", description: "Mengelola iuran, kas, rekening, dan pengajuan pencairan." },
  { role: "Keamanan", description: "Mencatat tamu dan aktivitas keamanan lingkungan." },
  { role: "Warga", description: "Melihat tagihan, membayar QRIS, dan berpartisipasi di diskusi." },
];

const SECURITY_POINTS = [
  {
    icon: ShieldCheck,
    title: "Hak akses berlapis (RBAC)",
    description:
      "Lima peran dengan izin berbeda; aksi sensitif ditegakkan di server, bukan hanya di tampilan.",
  },
  {
    icon: Lock,
    title: "Pembayaran aman",
    description:
      "Dana diproses melalui Logikraf Payment Hub. SmartHub tidak menyimpan kunci penyedia pembayaran.",
  },
  {
    icon: FileText,
    title: "Data KYC terkendali",
    description:
      "Dokumen identitas diproses sesuai persetujuan (consent) yang tercatat dan diaudit.",
  },
  {
    icon: ScrollText,
    title: "Jejak audit",
    description: "Perubahan penting tercatat sehingga dapat ditelusuri dan dipertanggungjawabkan.",
  },
  {
    icon: BarChart3,
    title: "Rekonsiliasi transparan",
    description: "Pembukuan kas dan iuran seimbang serta mudah diperiksa kapan saja.",
  },
  {
    icon: Bell,
    title: "Notifikasi terarah",
    description:
      "Pemberitahuan WhatsApp/email untuk peristiwa penting, tanpa membocorkan data pribadi.",
  },
];

const FAQ = [
  {
    q: "Apakah SmartHub menyimpan foto KTP atau data pribadi sensitif?",
    a: "Tidak. Verifikasi identitas (KYC) diproses melalui Logikraf Payment Hub dan penyedia pembayaran resmi. SmartHub menyimpan metadata dan bukti persetujuan, bukan berkas dokumennya.",
  },
  {
    q: "Bagaimana warga membayar iuran?",
    a: "Setelah akun RT terverifikasi dan kanal QRIS aktif, warga dapat memindai QRIS dari aplikasi bank/e-wallet. Status terbayar diperbarui otomatis melalui webhook.",
  },
  {
    q: "Bisakah dipakai lebih dari satu RT atau perumahan?",
    a: "Ya. SmartHub mendukung banyak tenant (RT/perumahan); setiap RT memiliki data, pengguna, dan rekening yang terpisah.",
  },
  {
    q: "Apakah akses diatur per peran?",
    a: "Ya. Ada lima peran (Ketua RT, Sekretaris, Bendahara, Keamanan, Warga) dengan izin berbeda dan jejak audit untuk perubahan penting.",
  },
  {
    q: "Apakah perlu memasang aplikasi?",
    a: "Tidak perlu. SmartHub berbasis web dan dioptimalkan untuk ponsel maupun desktop, sehingga cukup dibuka dari peramban.",
  },
];

const STATS = [
  { value: "5", label: "Peran terkelola" },
  { value: "6", label: "Modul inti" },
  { value: "QRIS", label: "Pembayaran iuran" },
  { value: "Multi", label: "Tenant (RT/perumahan)" },
];

export const LandingPage = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <a
      href="#konten"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      Lompat ke konten
    </a>

    <PublicSiteHeader />

    <main id="konten" className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_-10%,hsl(var(--primary)/0.20),transparent)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:44px_44px]"
        />
        <div className="container relative grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="space-y-6">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Manajemen RT dalam satu platform
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Kelola RT lebih rapi, transparan, dan modern.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              SmartHub menyatukan kependudukan, keamanan, keuangan, dan komunikasi warga. Terima
              iuran lewat QRIS, pantau kas RT, dan cairkan dana langsung dari dashboard.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">
                  Masuk ke SmartHub
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#fitur">Lihat fitur</a>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
              {["Berbasis web", "Aman & berjenjang", "Pembayaran QRIS"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/20 via-accent/40 to-transparent blur-2xl"
            />
            <Card className="relative overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-destructive/70" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-warning/70" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-success/70" aria-hidden="true" />
                <span className="ml-2 text-xs text-muted-foreground">Ringkasan RT</span>
              </div>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Iuran bulan ini</p>
                    <p className="mt-1 text-xl font-semibold">Rp 4.250.000</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Warga terdata</p>
                    <p className="mt-1 text-xl font-semibold">318</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "QRIS terbayar", value: "92%", tone: "bg-success/70" },
                    { label: "Sudah diverifikasi", value: "78%", tone: "bg-primary/70" },
                    { label: "Menunggu bayar", value: "35%", tone: "bg-warning/70" },
                  ].map((row) => (
                    <div key={row.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium">{row.value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${row.tone}`}
                          style={{ width: row.value }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-accent/40 p-3 text-xs text-accent-foreground">
                  <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Rekonsiliasi kas seimbang — siap dicairkan.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border/60 bg-muted/20">
        <div className="container grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="scroll-mt-20 py-16 lg:py-24">
        <div className="container space-y-12">
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <Badge variant="secondary">Fitur</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Semua kebutuhan RT dalam satu dashboard
            </h2>
            <p className="text-muted-foreground">
              Modul yang saling terhubung, sehingga data tidak perlu dicatat ulang di banyak tempat.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <CardHeader className="space-y-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cara kerja */}
      <section
        id="cara-kerja"
        className="scroll-mt-20 border-y border-border/60 bg-muted/20 py-16 lg:py-24"
      >
        <div className="container space-y-12">
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <Badge variant="secondary">Cara Kerja</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Mulai dalam empat langkah
            </h2>
            <p className="text-muted-foreground">
              Dari pendataan hingga pencairan dana, semuanya bisa dilakukan dari peramban.
            </p>
          </div>
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative">
                <Card className="h-full">
                  <CardHeader className="space-y-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Peran */}
      <section id="peran" className="scroll-mt-20 py-16 lg:py-24">
        <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-3">
            <Badge variant="secondary">Peran & Hak Akses</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Setiap orang melihat yang relevan
            </h2>
            <p className="text-muted-foreground">
              Hak akses disesuaikan dengan tugas pengurus dan warga, sehingga data sensitif tetap
              terjaga.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {ROLES.map((role) => (
                <Badge key={role.role} variant="outline">
                  {role.role}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((role) => (
              <div key={role.role} className="rounded-lg border border-border/60 bg-card p-4">
                <p className="font-medium">{role.role}</p>
                <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Keamanan */}
      <section
        id="keamanan"
        className="scroll-mt-20 border-y border-border/60 bg-muted/20 py-16 lg:py-24"
      >
        <div className="container space-y-12">
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <Badge variant="secondary">Keamanan & Kepatuhan</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Dibangun dengan keamanan sejak awal
            </h2>
            <p className="text-muted-foreground">
              Prinsipnya sederhana: data pribadi seminimal mungkin, akses seperlunya, dan semuanya
              dapat diaudit.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY_POINTS.map((point) => (
              <div
                key={point.title}
                className="flex gap-4 rounded-lg border border-border/60 bg-card p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <point.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium">{point.title}</p>
                  <p className="text-sm text-muted-foreground">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-16 lg:py-24">
        <div className="container mx-auto max-w-3xl space-y-8">
          <div className="space-y-3 text-center">
            <Badge variant="secondary">FAQ</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Pertanyaan yang sering diajukan
            </h2>
          </div>
          <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    className="text-muted-foreground transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16 lg:pb-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-accent/30 to-transparent px-6 py-12 text-center sm:px-12">
            <div className="mx-auto max-w-2xl space-y-5">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Siap memodernisasi pengelolaan RT Anda?
              </h2>
              <p className="text-muted-foreground">
                Masuk untuk mulai menata data warga, keuangan, dan komunikasi dalam satu platform.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/login">
                    Masuk ke SmartHub
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#fitur">Pelajari fitur</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <PublicSiteFooter />
  </div>
);
