import type { Role } from "@smarthub/shared";

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "smarthub_token";
export const REFRESH_COOKIE_NAME =
  process.env.REFRESH_AUTH_COOKIE_NAME ?? "smarthub_refresh_token";
export const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const HOME_BY_ROLE: Record<Role, string> = {
  Ketua_RT: "/dashboard",
  Sekretaris: "/dashboard",
  Bendahara: "/dashboard",
  Keamanan: "/keamanan/tamu",
  Warga: "/warga/tagihan",
};

export interface JwtClaims {
  id_pengguna: number;
  nik: string;
  role: Role;
  scope?: string;
  impersonated_by?: number;
  exp?: number;
}

const decodeBase64Url = (input: string): string => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
};

export const decodeToken = (token: string): JwtClaims | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(decodeBase64Url(payload)) as JwtClaims;
    if (!claims.role) return null;
    return { ...claims, nik: claims.nik ?? "" };
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const claims = decodeToken(token);
  if (!claims?.exp) return false;
  return claims.exp * 1000 <= Date.now();
};
