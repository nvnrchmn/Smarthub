import type { ReactNode } from "react";

import AppLayoutClient from "./app-layout-client";

// Halaman di grup ini butuh login: jangan di-prerender. Kalau statis, Next.js mengirim
// cache-control s-maxage=31536000 sehingga cache bersama (nginx proxy_cache / Cloudflare)
// bisa menyajikan HTML basi -> chunk 404 -> halaman blank; dan bila kelak ada data user
// yang dirender di server, key cache tanpa Cookie membuatnya bocor antar-pengguna.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
