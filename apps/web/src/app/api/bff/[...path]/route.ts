import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_MAX_AGE_SECONDS } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api/v1";

interface RefreshedTokens {
  token: string;
  refresh_token: string;
}

const cobaRefresh = async (refreshToken: string): Promise<RefreshedTokens | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: RefreshedTokens };
    return payload.data?.token && payload.data.refresh_token ? payload.data : null;
  } catch {
    return null;
  }
};

const proxy = async (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> => {
  const { path } = await context.params;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!token && !refreshToken) {
    return NextResponse.json(
      { status: "error", message: "Sesi Anda telah berakhir, silakan login kembali", errors: [] },
      { status: 401 },
    );
  }

  const target = new URL(`${API_BASE_URL}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const contentType = request.headers.get("content-type");
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const kirim = (bearer: string): Promise<Response> => {
    const headers = new Headers();
    headers.set("authorization", `Bearer ${bearer}`);
    headers.set("accept", "application/json");
    if (contentType) headers.set("content-type", contentType);

    return fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  };

  let upstream: Response;
  let tokensBaru: RefreshedTokens | null = null;

  try {
    if (token) {
      upstream = await kirim(token);

      if (upstream.status === 401 && refreshToken) {
        tokensBaru = await cobaRefresh(refreshToken);
        if (tokensBaru) upstream = await kirim(tokensBaru.token);
      }
    } else {
      tokensBaru = await cobaRefresh(refreshToken ?? "");
      if (!tokensBaru) {
        return NextResponse.json(
          { status: "error", message: "Sesi Anda telah berakhir, silakan login kembali", errors: [] },
          { status: 401 },
        );
      }
      upstream = await kirim(tokensBaru.token);
    }
  } catch {
    return NextResponse.json(
      { status: "error", message: "Tidak dapat menghubungi server API SmartHub", errors: [] },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  const response = new NextResponse(text || null, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });

  if (tokensBaru) {
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    };
    response.cookies.set(AUTH_COOKIE_NAME, tokensBaru.token, { ...cookieOptions, maxAge: 15 * 60 });
    response.cookies.set(REFRESH_COOKIE_NAME, tokensBaru.refresh_token, {
      ...cookieOptions,
      maxAge: REFRESH_MAX_AGE_SECONDS,
    });
  }

  return response;
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
