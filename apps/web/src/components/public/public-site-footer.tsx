import Link from "next/link";
import { Building2 } from "lucide-react";
import { LANDING_SECTIONS } from "@/lib/landing";

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

const FOOTER_GROUPS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Sumber Daya",
    links: [
      { href: "https://github.com/nvnrchmn/Smarthub", label: "Repositori", external: true },
      {
        href: "https://github.com/nvnrchmn/Smarthub/blob/main/CONTRIBUTING.md",
        label: "Panduan Kontribusi",
        external: true,
      },
      {
        href: "https://github.com/nvnrchmn/Smarthub/blob/main/docs/Architecture.md",
        label: "Arsitektur",
        external: true,
      },
    ],
  },
  {
    title: "Akun",
    links: [
      { href: "/login", label: "Masuk" },
      { href: "/reset-password", label: "Lupa kata sandi" },
      { href: "/platform/login", label: "Portal Platform" },
    ],
  },
];

const linkClass =
  "rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const PublicSiteFooter = () => (
  <footer className="border-t border-border/60 bg-muted/30">
    <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">SmartHub</span>
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">
          Sistem manajemen warga digital untuk RT/Perumahan: kependudukan, keamanan, keuangan, dan
          komunikasi dalam satu tempat.
        </p>
      </div>

      {/* Tautan produk memakai sumber yang sama dengan header (anti-drift). */}
      <nav aria-label="Produk" className="space-y-3">
        <h2 className="text-sm font-semibold">Produk</h2>
        <ul className="space-y-2">
          {LANDING_SECTIONS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={linkClass}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {FOOTER_GROUPS.map((group) => (
        <nav key={group.title} aria-label={group.title} className="space-y-3">
          <h2 className="text-sm font-semibold">{group.title}</h2>
          <ul className="space-y-2">
            {group.links.map((link) => (
              <li key={link.label}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={linkClass}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </div>

    <div className="border-t border-border/60">
      <div className="container flex flex-col gap-2 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} PT Logika Kreatif Indonesia. Seluruh hak cipta.</p>
        <p>Pembayaran diproses melalui Logikraf Payment Hub.</p>
      </div>
    </div>
  </footer>
);
