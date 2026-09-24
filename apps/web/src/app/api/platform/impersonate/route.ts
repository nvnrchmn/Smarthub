import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { PLATFORM_COOKIE_NAME } from "@/lib/platform-auth";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api/v1";

interface ImpersonatePayload {
  status: string;
  message?: string;
  data?: { token: string; berlaku_menit: number };
  errors?: unknown[];
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const platformToken = request.cookies.get(PLATFORM_COOKIE_NAME)?.value;
  if (!platformToken) {
    return NextResponse.json(
      { status: "error", message: "Sesi platform berakhir", errors: [] },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { id_tenant?: number; alasan?: string };
  if (!body.id_tenant || !body.alasan) {
    return NextResponse.json(
      { status: "error", message: "Tenant dan alasan wajib diisi", errors: [] },
      { status: 422 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/admin/tenant/${body.id_tenant}/impersonate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${platformToken}`,
      },
      body: JSON.stringify({ alasan: body.alasan }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Tidak dapat menghubungi server API SmartHub", errors: [] },
      { status: 502 },
    );
  }

  const payload = (await upstream.json().catch(() => null)) as ImpersonatePayload | null;

  if (!upstream.ok || payload?.status === "error" || !payload?.data?.token) {
    return NextResponse.json(
      payload ?? { status: "error", message: "Impersonasi gagal", errors: [] },
      { status: upstream.status || 500 },
    );
  }

  const response = NextResponse.json({
    status: "success",
    message: "Sesi impersonasi dimulai",
    data: { berlaku_menit: payload.data.berlaku_menit },
  });

  response.cookies.set(AUTH_COOKIE_NAME, payload.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: payload.data.berlaku_menit * 60,
  });

  return response;
};
