import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export const POST = (): NextResponse => {
  const response = NextResponse.json({
    status: "success",
    message: "Sesi impersonasi diakhiri",
    data: null,
  });
  response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
};
