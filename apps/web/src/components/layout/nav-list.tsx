"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { Me } from "@/hooks/use-me";
import { navItemsForRole } from "@/lib/navigation";
import { springSoft } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Daftar menu dengan indikator aktif ber-spring (berbagi `layoutId` per instans). */
export const NavList = ({
  me,
  onNavigate,
  layoutIdPrefix = "nav",
}: {
  me: Me;
  onNavigate?: () => void;
  layoutIdPrefix?: string;
}) => {
  const pathname = usePathname();
  const reduce = useReducedMotion();
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
            onClick={() => {
              haptic(6);
              onNavigate?.();
            }}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {active ? (
              reduce ? (
                <span
                  className="absolute inset-0 -z-10 rounded-xl bg-primary/10"
                  aria-hidden="true"
                />
              ) : (
                <motion.span
                  layoutId={`${layoutIdPrefix}-active`}
                  className="absolute inset-0 -z-10 rounded-xl bg-primary/10"
                  transition={springSoft}
                  aria-hidden="true"
                />
              )
            ) : null}
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
