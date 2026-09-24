import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SmartHub — Sistem Manajemen Warga Digital",
    template: "%s · SmartHub",
  },
  description:
    "Sistem manajemen warga digital untuk RT/Perumahan: kependudukan, keamanan, keuangan, dan komunikasi warga.",
  applicationName: "SmartHub",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "SmartHub",
    locale: "id_ID",
    url: siteUrl,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
