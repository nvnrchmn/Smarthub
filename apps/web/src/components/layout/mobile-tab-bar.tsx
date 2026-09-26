"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import type { Me } from "@/hooks/use-me";
import { navItemsForRole, primaryTabsForRole } from "@/lib/navigation";
import { springSnappy } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { NavList } from "@/components/layout/nav-list";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Bottom tab bar khas iOS untuk mobile. 4 tab utama per peran + "Lainnya"
 * (bottom sheet berisi seluruh menu). Semua tautan tetap sama seperti sidebar.
 */
export const MobileTabBar = ({ me }: { me: Me }) => {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = primaryTabsForRole(me.role);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = navItemsForRole(me.role).some(
    (item) => isActive(item.href) && !tabs.some((tab) => tab.href === item.href),
  );

  const itemClass = (active: boolean) =>
    cn(
      "relative flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
      active ? "text-primary" : "text-muted-foreground active:text-foreground",
    );

  const indicator = (active: boolean) =>
    active && !reduce ? (
      <motion.span
        layoutId="tabbar-active"
        className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary"
        transition={springSnappy}
        aria-hidden="true"
      />
    ) : null;

  return (
    <>
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => haptic(8)}
                  className={itemClass(active)}
                >
                  {indicator(active)}
                  <motion.span
                    whileTap={reduce ? undefined : { scale: 0.85 }}
                    transition={springSnappy}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </motion.span>
                  <span className="max-w-full truncate px-1">{tab.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-current={moreActive ? "page" : undefined}
              aria-label="Buka semua menu"
              onClick={() => {
                haptic(8);
                setMoreOpen(true);
              }}
              className={itemClass(moreActive)}
            >
              {indicator(moreActive)}
              <motion.span
                whileTap={reduce ? undefined : { scale: 0.85 }}
                transition={springSnappy}
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </motion.span>
              <span className="px-1">Lainnya</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="h-[78dvh] rounded-t-3xl border-x-0 p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="pt-2.5">
            <div
              className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30"
              aria-hidden="true"
            />
          </div>
          <SheetHeader className="px-5 pb-2 pt-3 text-left">
            <SheetTitle>Semua Menu</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(78dvh-5.5rem)] overflow-y-auto overscroll-contain px-3 pb-6">
            <NavList me={me} layoutIdPrefix="sheet" onNavigate={() => setMoreOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
