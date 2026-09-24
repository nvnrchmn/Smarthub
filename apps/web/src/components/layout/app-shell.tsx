"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, UserRound } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/notifikasi/notification-bell";

const Brand = () => (
  <Link href="/" className="flex items-center gap-2 px-2 py-1">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
      SH
    </span>
    <span className="text-base font-semibold tracking-tight">SmartHub</span>
  </Link>
);

const NavList = ({ me, onNavigate }: { me: Me; onNavigate?: () => void }) => {
  const pathname = usePathname();
  const items = navItemsForRole(me.role);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export const AppShell = ({ me, children }: { me: Me; children: React.ReactNode }) => {
  const router = useRouter();
  const displayName = me.nama_lengkap ?? me.email;

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
          <NavList me={me} />
        </div>
        <Separator />
        <div className="px-3 text-xs text-muted-foreground">
          Masuk sebagai
          <div className="font-medium text-foreground">{displayName}</div>
          <div>{ROLE_LABELS[me.role]}</div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu SmartHub</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <NavList me={me} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="lg:hidden">
              <Brand />
            </div>
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

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};
