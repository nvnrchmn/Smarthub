import { ApiError, type ApiFetchOptions, type ApiResult } from "./api-client";
import type { FieldError, ResponseMeta } from "@smarthub/shared";

export const platformFetch = async <T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResult<T>> => {
  const response = await fetch(`/api/platform-bff${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
  });

  const payload = (await response.json().catch(() => null)) as {
    status: string;
    message?: string;
    data?: T;
    meta?: ResponseMeta;
    errors?: FieldError[];
  } | null;

  if (!response.ok || payload?.status === "error") {
    // Sesi platform tidak valid/kedaluwarsa → kembali ke login (hindari loop).
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/platform/login")
    ) {
      window.location.href = "/platform/login";
    }

    throw new ApiError(
      response.status,
      payload?.message ?? "Terjadi kesalahan saat menghubungi server",
      payload?.errors ?? [],
    );
  }

  return { data: (payload?.data ?? null) as T, meta: payload?.meta };
};
