import Link from "next/link";
import { Building2, LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LANDING_SECTIONS } from "@/lib/landing";

const navLinkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const PublicSiteHeader = () => (
  <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="container flex h-16 items-center justify-between gap-4">
      <Link
        href="/"
        aria-label="SmartHub, kembali ke beranda"
        className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold tracking-tight">SmartHub</span>
      </Link>

      <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
        {LANDING_SECTIONS.map((item) => (
          <a key={item.href} href={item.href} className={navLinkClass}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/login">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Masuk
          </Link>
        </Button>

        <details className="group relative md:hidden">
          <summary
            aria-label="Buka menu navigasi"
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg">
            <nav aria-label="Navigasi seluler" className="flex flex-col">
              {LANDING_SECTIONS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </a>
              ))}
              <Link
                href="/login"
                className="mt-1 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Masuk
              </Link>
            </nav>
          </div>
        </details>
      </div>
    </div>
  </header>
);
