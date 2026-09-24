import type { MetadataRoute } from "next";
import { PUBLIC_PATHS } from "@/lib/public-paths";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [...PUBLIC_PATHS],
        // Area aplikasi (butuh login) tidak untuk diindeks.
        disallow: [
          "/api/",
          "/dashboard",
          "/platform",
          "/kependudukan",
          "/keamanan",
          "/keuangan",
          "/langganan",
          "/laporan",
          "/audit-log",
          "/diskusi",
          "/marketplace",
          "/notifikasi",
          "/pengaturan",
          "/pencairan",
          "/profil",
          "/verifikasi",
          "/warga",
          "/wilayah",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
