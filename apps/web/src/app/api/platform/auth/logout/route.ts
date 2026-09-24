import { NextResponse } from "next/server";
import { PLATFORM_COOKIE_NAME } from "@/lib/platform-auth";

export const POST = (): NextResponse => {
  const response = NextResponse.json({
    status: "success",
    message: "Logout platform berhasil",
    data: null,
  });
  response.cookies.set(PLATFORM_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
};
