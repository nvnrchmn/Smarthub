import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, HOME_BY_ROLE, REFRESH_COOKIE_NAME, decodeToken } from "@/lib/auth";
import { LandingPage } from "@/components/public/landing-page";

export const metadata: Metadata = {
  title: { absolute: "SmartHub — Sistem Manajemen Warga Digital" },
  description:
    "SmartHub menyatukan kependudukan, keamanan, keuangan, dan komunikasi warga RT/Perumahan. Terima iuran lewat QRIS, pantau kas, dan cairkan dana dari satu dashboard.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "SmartHub — Sistem Manajemen Warga Digital",
    description:
      "Kelola RT lebih rapi, transparan, dan modern: kependudukan, keamanan, iuran QRIS, dan komunikasi warga.",
    siteName: "SmartHub",
  },
};

export default async function RootPage() {
  const cookieStore = await cookies();

  // Pengguna yang sudah masuk diarahkan ke beranda sesuai perannya.
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    const claims = decodeToken(token);
    if (claims) redirect(HOME_BY_ROLE[claims.role]);
  }
  if (cookieStore.get(REFRESH_COOKIE_NAME)?.value) redirect("/dashboard");

  return <LandingPage />;
}
