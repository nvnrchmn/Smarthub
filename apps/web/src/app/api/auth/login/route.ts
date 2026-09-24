import { NextResponse } from "next/server";
import type { Role } from "@smarthub/shared";
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_MAX_AGE_SECONDS } from "@/lib/auth";

interface LoginPayload {
  status: string;
  message?: string;
  data?: { token: string; refresh_token: string; pengguna: { role: Role } };
  errors?: unknown[];
}

export const POST = async (request: Request): Promise<NextResponse> => {
  const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api/v1";
  const body = await request.json().catch(() => ({}));

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Tidak dapat menghubungi server API SmartHub", errors: [] },
      { status: 502 },
    );
  }

  const payload = (await upstream.json().catch(() => null)) as LoginPayload | null;

  if (!upstream.ok || payload?.status === "error" || !payload?.data?.token) {
    return NextResponse.json(
      payload ?? { status: "error", message: "Login gagal", errors: [] },
      { status: upstream.status || 500 },
    );
  }

  const response = NextResponse.json({
    status: "success",
    message: payload.message ?? "Login berhasil",
    data: { pengguna: payload.data.pengguna },
  });

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  response.cookies.set(AUTH_COOKIE_NAME, payload.data.token, {
    ...cookieOptions,
    maxAge: 15 * 60,
  });

  response.cookies.set(REFRESH_COOKIE_NAME, payload.data.refresh_token, {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });

  return response;
};
