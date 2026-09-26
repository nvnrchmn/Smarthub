"use client";

import { PageTransition } from "@/components/motion/motion-primitives";

/** `template.tsx` di-remount tiap navigasi → menjalankan transisi halaman halus. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
