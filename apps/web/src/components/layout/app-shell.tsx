"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { ROLE_LABELS } from "@smarthub/shared";
import type { Me } from "@/hooks/use-me";
import { navItemsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/notifikasi/notification-bell";
import { NavList } from "@/components/layout/nav-list";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

const Brand = () => (
  <Link href="/" className="flex items-center gap-2 px-2 py-1">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
      SH
    </span>
    <span className="text-base font-semibold tracking-tight">SmartHub</span>
  </Link>
);

const EXTRA_TITLES: Record<string, string> = {
  "/profil": "Profil & Password",
  "/platform": "Portal Platform",
};

const resolveTitle = (pathname: string, role: Me["role"]): string => {
  const match = navItemsForRole(role)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? EXTRA_TITLES[pathname] ?? "SmartHub";
};

export const AppShell = ({ me, children }: { me: Me; children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const displayName = me.nama_lengkap ?? me.email;
  const title = resolveTitle(pathname, me.role);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r bg-card lg:flex lg:flex-col lg:gap-4 lg:p-4">
        <Brand />
        <Separator />
        <div className="flex-1 overflow-y-auto">
          <NavList me={me} layoutIdPrefix="sidebar" />
        </div>
        <Separator />
        <div className="px-3 text-xs text-muted-foreground">
          Masuk sebagai
          <div className="font-medium text-foreground">{displayName}</div>
          <div>{ROLE_LABELS[me.role]}</div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center justify-between gap-2 border-b px-4 backdrop-blur transition-[padding,background-color,border-color] duration-300 ease-ios lg:px-8",
            scrolled
              ? "border-border bg-background/85 py-2"
              : "border-transparent bg-background/60 py-3",
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/"
              aria-label="SmartHub"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground transition-transform duration-200 ease-ios active:scale-90 lg:hidden"
            >
              SH
            </Link>
            <h1
              className={cn(
                "truncate font-bold tracking-tight transition-all duration-300 ease-ios",
                scrolled ? "text-base" : "text-xl",
              )}
            >
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu pengguna">
                  <UserRound className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{displayName}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {ROLE_LABELS[me.role]}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push("/profil")}>
                  <UserRound className="h-4 w-4" /> Profil & Password
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void logout()}>
                  <LogOut className="h-4 w-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4 lg:px-8 lg:pb-8 lg:pt-6">{children}</main>

        <MobileTabBar me={me} />
      </div>
    </div>
  );
};
