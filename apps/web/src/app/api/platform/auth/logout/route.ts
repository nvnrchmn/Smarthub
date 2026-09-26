import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_COOKIE_NAME } from "@/lib/platform-auth";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api/v1";

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const token = request.cookies.get(PLATFORM_COOKIE_NAME)?.value;

  // Cabut token di server (naikkan token_version) agar tidak bisa dipakai lagi.
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/admin/auth/logout`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      // Tetap bersihkan cookie meski API tidak dapat dihubungi.
    }
  }

  const response = NextResponse.json({
    status: "success",
    message: "Logout platform berhasil",
    data: null,
  });
  response.cookies.set(PLATFORM_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
};
