import type { FieldError, ResponseMeta } from "@smarthub/shared";

export class ApiError extends Error {
  readonly status: number;
  readonly errors: FieldError[];

  constructor(status: number, message: string, errors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }

  get fieldErrors(): Record<string, string> {
    return this.errors.reduce<Record<string, string>>((accumulator, error) => {
      accumulator[error.field] = error.message;
      return accumulator;
    }, {});
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: ResponseMeta;
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export const buildQuery = (params: Record<string, unknown> = {}): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
};

export const apiFetch = async <T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResult<T>> => {
  const response = await fetch(`/api/bff${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
  });

  const payload = (await response.json().catch(() => null)) as
    | { status: string; message?: string; data?: T; meta?: ResponseMeta; errors?: FieldError[] }
    | null;

  if (!response.ok || payload?.status === "error") {
    throw new ApiError(
      response.status,
      payload?.message ?? "Terjadi kesalahan saat menghubungi server",
      payload?.errors ?? [],
    );
  }

  return {
    data: (payload?.data ?? null) as T,
    meta: payload?.meta,
  };
};

export const apiUpload = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/bff/auth/upload", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });

  const payload = (await response.json().catch(() => null)) as
    | { status: string; message?: string; data?: { url: string }; errors?: FieldError[] }
    | null;

  if (!response.ok || payload?.status === "error") {
    throw new ApiError(
      response.status,
      payload?.message ?? "Gagal mengunggah berkas",
      payload?.errors ?? [],
    );
  }

  return payload?.data?.url ?? "";
};
