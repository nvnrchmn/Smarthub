import { NextResponse } from "next/server";
import { PLATFORM_COOKIE_NAME } from "@/lib/platform-auth";

interface PlatformLoginPayload {
  status: string;
  message?: string;
  data?: { token: string; akun: { role: string } };
  errors?: unknown[];
}

export const POST = async (request: Request): Promise<NextResponse> => {
  const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api/v1";
  const body = await request.json().catch(() => ({}));

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/admin/auth/login`, {
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

  const payload = (await upstream.json().catch(() => null)) as PlatformLoginPayload | null;

  if (!upstream.ok || payload?.status === "error" || !payload?.data?.token) {
    return NextResponse.json(
      payload ?? { status: "error", message: "Login platform gagal", errors: [] },
      { status: upstream.status || 500 },
    );
  }

  const response = NextResponse.json({
    status: "success",
    message: payload.message ?? "Login platform berhasil",
    data: { akun: payload.data.akun },
  });

  response.cookies.set(PLATFORM_COOKIE_NAME, payload.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });

  return response;
};
