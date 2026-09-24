"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys, type Role } from "@smarthub/shared";
import { apiFetch } from "@/lib/api-client";

export interface Me {
  id_pengguna: number;
  nik: string;
  email: string;
  role: Role;
  status_akun: string;
  nama_lengkap: string | null;
  mfa_aktif?: boolean;
  impersonasi?: boolean;
}

export const useMe = () =>
  useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => (await apiFetch<Me>("/auth/me")).data,
    retry: false,
    staleTime: 5 * 60_000,
  });
