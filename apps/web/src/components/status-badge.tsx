import type { StatusAktif, StatusBayar, StatusLangganan, StatusVerifikasi } from "@smarthub/shared";
import {
  STATUS_AKTIF_LABELS,
  STATUS_BAYAR_LABELS,
  STATUS_LANGGANAN_LABELS,
  STATUS_VERIFIKASI_LABELS,
} from "@smarthub/shared";
import { Badge } from "@/components/ui/badge";

export const StatusBayarBadge = ({ status }: { status: StatusBayar }) => {
  const variant = status === "Lunas" ? "success" : status === "Menunggu_Konfirmasi" ? "warning" : "secondary";
  return <Badge variant={variant}>{STATUS_BAYAR_LABELS[status]}</Badge>;
};

export const StatusVerifikasiBadge = ({ status }: { status: StatusVerifikasi }) => {
  const variant =
    status === "Terverifikasi" ? "success" : status === "Ditolak" ? "destructive" : "warning";
  return <Badge variant={variant}>{STATUS_VERIFIKASI_LABELS[status]}</Badge>;
};

export const StatusAktifBadge = ({ status }: { status: StatusAktif }) => {
  const variant = status === "Aktif" ? "success" : status === "Meninggal" ? "destructive" : "secondary";
  return <Badge variant={variant}>{STATUS_AKTIF_LABELS[status]}</Badge>;
};

export const StatusLanggananBadge = ({ status }: { status: StatusLangganan }) => {
  const variant =
    status === "Aktif" ? "success" : status === "Trial" ? "warning" : status === "Menunggak" ? "destructive" : "secondary";
  return <Badge variant={variant}>{STATUS_LANGGANAN_LABELS[status]}</Badge>;
};

export const TamuStatusBadge = ({ status }: { status: "didalam" | "keluar" }) => (
  <Badge variant={status === "didalam" ? "warning" : "secondary"}>
    {status === "didalam" ? "Di Dalam" : "Sudah Keluar"}
  </Badge>
);
