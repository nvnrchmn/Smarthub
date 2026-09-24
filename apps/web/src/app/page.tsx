import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, HOME_BY_ROLE, decodeToken } from "@/lib/auth";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect("/login");

  const claims = decodeToken(token);
  redirect(claims ? HOME_BY_ROLE[claims.role] : "/login");
}
