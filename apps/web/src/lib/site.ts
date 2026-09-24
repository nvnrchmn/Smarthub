/**
 * URL publik absolut (tanpa trailing slash). Menangani env kosong/whitespace
 * agar `new URL(...)` di metadata tetap aman saat build/render.
 */
export const siteUrl = (
  process.env.PUBLIC_WEB_URL?.trim() || "https://smarthub.logikraf.id"
).replace(/\/+$/, "");
