import type { Role } from "@smarthub/shared";
import {
  Banknote,
  BellRing,
  BookUser,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCog,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dasbor",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara", "Warga"],
  },
  {
    label: "Diskusi",
    href: "/diskusi",
    icon: MessageSquare,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara", "Keamanan", "Warga"],
  },
  {
    label: "Marketplace",
    href: "/marketplace",
    icon: Store,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara", "Keamanan", "Warga"],
  },
  {
    label: "Jualan Saya",
    href: "/marketplace/jual",
    icon: ShoppingBag,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara", "Keamanan", "Warga"],
  },
  {
    label: "Rumah",
    href: "/wilayah/rumah",
    icon: Building2,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara"],
  },
  {
    label: "Kartu Keluarga",
    href: "/kependudukan/kk",
    icon: FileText,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara"],
  },
  {
    label: "Warga",
    href: "/kependudukan/warga",
    icon: BookUser,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara"],
  },
  {
    label: "Mutasi Warga",
    href: "/kependudukan/mutasi",
    icon: ClipboardList,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara"],
  },
  {
    label: "Tamu",
    href: "/keamanan/tamu",
    icon: ShieldCheck,
    roles: ["Keamanan", "Ketua_RT", "Sekretaris"],
  },
  {
    label: "Kategori Kas",
    href: "/keuangan/kategori",
    icon: Banknote,
    roles: ["Bendahara", "Ketua_RT"],
  },
  {
    label: "Iuran",
    href: "/keuangan/iuran",
    icon: ReceiptText,
    roles: ["Bendahara", "Ketua_RT", "Sekretaris"],
  },
  {
    label: "Buku Kas",
    href: "/keuangan/kas",
    icon: Banknote,
    roles: ["Bendahara", "Ketua_RT", "Sekretaris", "Warga"],
  },
  {
    label: "Transparansi",
    href: "/keuangan/ringkasan",
    icon: LayoutDashboard,
    roles: ["Bendahara", "Ketua_RT", "Sekretaris", "Warga"],
  },
  {
    label: "Tagihan Saya",
    href: "/warga/tagihan",
    icon: ReceiptText,
    roles: ["Warga"],
  },
  {
    label: "Keluarga Saya",
    href: "/warga/keluarga",
    icon: BookUser,
    roles: ["Warga"],
  },
  {
    label: "Langganan",
    href: "/langganan",
    icon: CreditCard,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara"],
  },
  {
    label: "Pengaturan RT",
    href: "/pengaturan/tenant",
    icon: Building2,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara"],
  },
  {
    label: "Preferensi Notifikasi",
    href: "/pengaturan/notifikasi",
    icon: BellRing,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara", "Keamanan", "Warga"],
  },
  {
    label: "Verifikasi Identitas",
    href: "/verifikasi",
    icon: ShieldCheck,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara"],
  },
  {
    label: "Rekening Pencairan",
    href: "/pengaturan/rekening",
    icon: Landmark,
    roles: ["Ketua_RT", "Bendahara"],
  },
  {
    label: "Pencairan Dana",
    href: "/pencairan",
    icon: Wallet,
    roles: ["Ketua_RT", "Bendahara"],
  },
  {
    label: "Laporan & Ekspor",
    href: "/laporan",
    icon: FileText,
    roles: ["Ketua_RT", "Sekretaris", "Bendahara"],
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    icon: ScrollText,
    roles: ["Ketua_RT", "Sekretaris"],
  },
  {
    label: "Akun",
    href: "/pengaturan/akun",
    icon: UserCog,
    roles: ["Ketua_RT", "Sekretaris"],
  },
];

export const navItemsForRole = (role: Role): NavItem[] =>
  NAV_ITEMS.filter((item) => item.roles.includes(role));

/**
 * Destinasi utama untuk bottom tab bar (mobile) per peran — maksimal 4.
 * Hanya memilih dari item yang memang boleh diakses peran tsb; sisanya
 * tetap tersedia lewat menu "Lainnya". Tidak mengubah NAV_ITEMS.
 */
const TAB_PRIORITY: Record<Role, string[]> = {
  Ketua_RT: ["/dashboard", "/keuangan/kas", "/pencairan", "/marketplace"],
  Sekretaris: ["/dashboard", "/kependudukan/warga", "/keuangan/kas", "/diskusi"],
  Bendahara: ["/dashboard", "/keuangan/iuran", "/keuangan/kas", "/pencairan"],
  Keamanan: ["/keamanan/tamu", "/diskusi", "/marketplace", "/pengaturan/notifikasi"],
  Warga: ["/dashboard", "/warga/tagihan", "/keuangan/kas", "/marketplace"],
};

export const primaryTabsForRole = (role: Role): NavItem[] => {
  const allowed = navItemsForRole(role);
  const picks: NavItem[] = [];
  for (const href of TAB_PRIORITY[role] ?? []) {
    const item = allowed.find((entry) => entry.href === href);
    if (item && !picks.some((p) => p.href === item.href)) picks.push(item);
  }
  for (const item of allowed) {
    if (picks.length >= 4) break;
    if (!picks.some((p) => p.href === item.href)) picks.push(item);
  }
  return picks.slice(0, 4);
};
