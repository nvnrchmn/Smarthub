import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_COOKIE_NAME } from "@/lib/platform-auth";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api/v1";

const proxy = async (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> => {
  const { path } = await context.params;
  const token = request.cookies.get(PLATFORM_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { status: "error", message: "Sesi platform berakhir, silakan login kembali", errors: [] },
      { status: 401 },
    );
  }

  const target = new URL(`${API_BASE_URL}/admin/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const headers = new Headers();
  headers.set("authorization", `Bearer ${token}`);
  headers.set("accept", "application/json");
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Tidak dapat menghubungi server API SmartHub", errors: [] },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
