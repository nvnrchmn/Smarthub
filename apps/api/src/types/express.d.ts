import type { PlatformRole, Role } from "@smarthub/shared";

export interface AuthUser {
  id_pengguna: number;
  nik: string;
  role: Role;
  id_tenant: number | null;
  impersonated_by?: number;
}

export interface PlatformUser {
  id_akun_platform: number;
  email: string;
  role: PlatformRole;
}

export interface ValidatedRequestData {
  body: unknown;
  query: unknown;
  params: unknown;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      platform_user?: PlatformUser;
      validated?: ValidatedRequestData;
      rawBody?: Buffer;
    }
  }
}

export {};
