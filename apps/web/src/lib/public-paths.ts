/**
 * Path yang boleh diakses tanpa login. Satu sumber kebenaran untuk middleware
 * (auth) dan `robots.ts` agar tidak drift.
 */
export const PUBLIC_PATHS = [
  "/",
  "/login",
  "/reset-password",
  "/robots.txt",
  "/sitemap.xml",
] as const;

export const PUBLIC_PATH_SET: ReadonlySet<string> = new Set(PUBLIC_PATHS);
