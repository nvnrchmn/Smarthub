export const PLATFORM_COOKIE_NAME =
  process.env.PLATFORM_AUTH_COOKIE_NAME ?? "smarthub_platform_token";

export interface PlatformClaims {
  id_akun_platform: number;
  email: string;
  role: string;
  scope?: string;
  exp?: number;
}

const decodeBase64Url = (input: string): string => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
};

export const decodePlatformToken = (token: string): PlatformClaims | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(decodeBase64Url(payload)) as PlatformClaims;
    if (claims.scope !== "platform" || typeof claims.id_akun_platform !== "number") return null;
    return claims;
  } catch {
    return null;
  }
};

export const isPlatformTokenExpired = (token: string): boolean => {
  const claims = decodePlatformToken(token);
  if (!claims?.exp) return false;
  return claims.exp * 1000 <= Date.now();
};
