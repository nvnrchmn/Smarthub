import type { Role, StatusPostingan } from "@smarthub/shared";

export interface PollOpsiItem {
  id_opsi: number;
  label: string;
  jumlah_suara: number;
  persen: number;
}

export interface PollItem {
  id_poll: number;
  berakhir_pada: string | null;
  sudah_berakhir: boolean;
  total_suara: number;
  sudah_vote: boolean;
  pilihan_saya: number | null;
  opsi: PollOpsiItem[];
}

export interface MentionItem {
  id_pengguna: number;
  username: string;
  nama_lengkap: string | null;
}

export interface DiskusiItem {
  id_postingan: number;
  id_induk: number | null;
  isi: string;
  status: StatusPostingan;
  jumlah_suka: number;
  jumlah_balasan: number;
  createdAt: string;
  updatedAt: string;
  penulis: {
    id_pengguna: number;
    role: Role;
    nama_lengkap: string | null;
  };
  lampiran: string[];
  disukai_saya: boolean;
  mention: MentionItem[];
  poll: PollItem | null;
  bisa_diedit: boolean;
  bisa_dihapus: boolean;
  bisa_dimoderasi: boolean;
}
