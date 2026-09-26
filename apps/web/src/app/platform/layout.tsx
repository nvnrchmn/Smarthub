import type { ReactNode } from "react";

import PlatformLayoutClient from "./platform-layout-client";

// Konsol platform juga butuh login -> sama seperti grup (app): jangan di-prerender,
// agar cache bersama tidak pernah menyimpan HTML ber-auth (s-maxage 1 tahun).
export const dynamic = "force-dynamic";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <PlatformLayoutClient>{children}</PlatformLayoutClient>;
}
