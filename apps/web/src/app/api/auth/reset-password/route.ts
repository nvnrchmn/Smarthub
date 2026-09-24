import { NextResponse } from "next/server";

export const POST = async (request: Request): Promise<NextResponse> => {
  const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api/v1";
  const body = await request.json().catch(() => ({}));

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/auth/reset-password`, {
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

  const payload = await upstream.json().catch(() => null);

  return NextResponse.json(
    payload ?? { status: "error", message: "Gagal mereset password", errors: [] },
    { status: upstream.status || 500 },
  );
};
