/**
 * Tautan bagian halaman publik. Satu sumber kebenaran untuk header dan footer
 * agar label/anchor tidak drift.
 */
export const LANDING_SECTIONS = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#paket", label: "Paket & Harga" },
  { href: "#peran", label: "Peran & Hak Akses" },
  { href: "#keamanan", label: "Keamanan" },
  { href: "#faq", label: "FAQ" },
] as const;
