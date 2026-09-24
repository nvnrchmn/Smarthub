import crypto from "node:crypto";
import { env } from "./environment";
import { logger } from "./logger";

/**
 * Klien Logikraf Payment Hub. Hub memegang kredensial penyedia (Xendit) dan
 * menormalisasi webhook; SmartHub hanya memakai kredensial internal.
 *
 * Bila `LOGIKRAF_HUB_MOCK=true`, fungsi mengembalikan hasil sintetis sehingga
 * alur KYC/payout dapat diuji tanpa Hub/penyedia sungguhan.
 *
 * Ketahanan (hardening G-B):
 * - timeout tiap panggilan (`LOGIKRAF_HUB_TIMEOUT_MS`, default 10 dtk);
 * - retry terkendali (`LOGIKRAF_HUB_RETRY`, default 2×) hanya untuk 5xx/timeout;
 * - `x-correlation-id` per panggilan untuk penelusuran;
 * - `Idempotency-Key` stabil untuk payout;
 * - pesan error netral (tanpa payload mentah / nama penyedia).
 */

/** Prefix transaksi Client Store Smarthub di Hub (panduan integrasi §10.2). */
export const HUB_PREFIX = "sb-";

export const isHubMock = (): boolean => env.LOGIKRAF_HUB_MOCK;

/** Kunci internal Hub; utamakan `LOGIKRAF_INTERNAL_API_KEY` (panduan Hub §3.1), fallback penamaan lama. */
const hubApiKey = (): string => env.LOGIKRAF_INTERNAL_API_KEY || env.LOGIKRAF_HUB_API_KEY;

export const isHubConfigured = (): boolean =>
  Boolean(env.LOGIKRAF_HUB_BASE_URL && hubApiKey());

export const hubAktif = (): boolean => isHubMock() || isHubConfigured();

const ambilKodeError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  for (const key of ["error_code", "code", "error", "type", "message"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
};

/** Error panggilan Hub dengan status & kode terpisah; `message` selalu netral. */
export class HubApiError extends Error {
  readonly statusCode: number;
  readonly code: string | null;
  readonly payload: unknown;

  constructor(statusCode: number, payload: unknown, label = "permintaan") {
    super(`Hub menolak ${label} (${statusCode})`);
    this.name = "HubApiError";
    this.statusCode = statusCode;
    this.code = ambilKodeError(payload);
    this.payload = payload;
  }
}

const bolehDiulang = (error: unknown): boolean => {
  if (error instanceof HubApiError) {
    return error.statusCode >= 500 || error.statusCode === 408 || error.statusCode === 429;
  }
  return true;
};

const tidur = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface HubCallOptions {
  idempotencyKey?: string;
}

interface LogHub {
  path: string;
  method: string;
  percobaan: number;
  correlationId: string;
  status: number | "jaringan";
  kode: string | null;
  akanDiulang?: boolean;
}

const logGagal = (log: LogHub): void => {
  logger.warn({ hub: log }, "Panggilan Hub gagal");
};

const percobaanMaksimum = (): number => env.LOGIKRAF_HUB_RETRY + 1;

const hubFetch = async <T>(path: string, init: RequestInit, opsi: HubCallOptions = {}): Promise<T> => {
  if (!isHubConfigured()) {
    throw new Error("Logikraf Payment Hub belum dikonfigurasi");
  }

  const correlationId = crypto.randomUUID();
  const method = init.method ?? "GET";
  const maks = percobaanMaksimum();
  let terakhir: unknown;

  for (let percobaan = 1; ; percobaan += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.LOGIKRAF_HUB_TIMEOUT_MS);
    let errorIni: unknown;

    try {
      const response = await fetch(`${env.LOGIKRAF_HUB_BASE_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-internal-key": hubApiKey(),
          "x-correlation-id": correlationId,
          ...(opsi.idempotencyKey ? { "idempotency-key": opsi.idempotencyKey } : {}),
          ...(init.headers ?? {}),
        },
      });

      const payload = (await response.json().catch(() => null)) as T | null;
      if (!response.ok) throw new HubApiError(response.status, payload);

      logger.debug(
        { hub: { path, method, percobaan, correlationId, status: response.status } },
        "Panggilan Hub berhasil",
      );
      return payload as T;
    } catch (error) {
      errorIni = error;
    } finally {
      clearTimeout(timer);
    }

    terakhir = errorIni;
    const akanDiulang = percobaan < maks && bolehDiulang(errorIni);
    logGagal({
      path,
      method,
      percobaan,
      correlationId,
      status: errorIni instanceof HubApiError ? errorIni.statusCode : "jaringan",
      kode: errorIni instanceof HubApiError ? errorIni.code : null,
      akanDiulang,
    });

    if (!akanDiulang) break;
    await tidur(env.LOGIKRAF_HUB_RETRY_DELAY_MS * percobaan);
  }

  throw terakhir;
};

const hubUpload = async <T>(
  path: string,
  file: { filename: string; mime: string; data: Buffer },
  fields: Record<string, string>,
  idempotencyKey?: string,
): Promise<T> => {
  if (!isHubConfigured()) {
    throw new Error("Logikraf Payment Hub belum dikonfigurasi");
  }

  const correlationId = crypto.randomUUID();
  const maks = percobaanMaksimum();
  let terakhir: unknown;

  for (let percobaan = 1; ; percobaan += 1) {
    const form = new FormData();
    form.append("purpose", "KYC_DOCUMENT");
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    form.append("file", new Blob([new Uint8Array(file.data)], { type: file.mime }), file.filename);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.LOGIKRAF_HUB_TIMEOUT_MS);
    let errorIni: unknown;

    try {
      const response = await fetch(`${env.LOGIKRAF_HUB_BASE_URL}${path}`, {
        method: "POST",
        headers: {
          "x-internal-key": hubApiKey(),
          "x-correlation-id": correlationId,
          ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
        },
        body: form,
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as T | null;
      if (!response.ok) throw new HubApiError(response.status, payload, "unggahan");
      return payload as T;
    } catch (error) {
      errorIni = error;
    } finally {
      clearTimeout(timer);
    }

    terakhir = errorIni;
    const akanDiulang = percobaan < maks && bolehDiulang(errorIni);
    logGagal({
      path,
      method: "POST",
      percobaan,
      correlationId,
      status: errorIni instanceof HubApiError ? errorIni.statusCode : "jaringan",
      kode: errorIni instanceof HubApiError ? errorIni.code : null,
      akanDiulang,
    });

    if (!akanDiulang) break;
    await tidur(env.LOGIKRAF_HUB_RETRY_DELAY_MS * percobaan);
  }

  throw terakhir;
};

/* ------------------------------- Akun & KYC ------------------------------- */

export interface HubAccountResult {
  id: string;
  status: string;
  entity_type?: string;
  tenant_ref?: string;
}

export interface HubKycConsent {
  version: string;
  hash: string;
  agreed_at: string;
  ip?: string | null;
  user_agent?: string | null;
  log_id: string;
  signer_name: string;
}

export interface HubKycSubmitRequest {
  for_user_id: string;
  entity_type: string;
  legal_name: string;
  email: string;
  ktp_number: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  kewarganegaraan: string;
  no_hp?: string;
  alamat: Record<string, unknown>;
  data_usaha: Record<string, unknown>;
  files: { ktp_depan: string; ktp_belakang: string; selfie: string };
  consent: HubKycConsent;
}

export interface HubKycSubmitResult {
  status: string;
  failure_reasons?: unknown;
  payment_channels?: unknown;
}

export const hubCreateAccount = async (input: {
  tenant_ref: string;
  legal_name: string;
  email: string;
  entity_type?: string;
}): Promise<HubAccountResult> => {
  if (isHubMock()) {
    return {
      id: `mock-acc-${Date.now()}`,
      status: "REGISTERED",
      entity_type: input.entity_type ?? "INDIVIDUAL",
      tenant_ref: input.tenant_ref,
    };
  }
  return hubFetch<HubAccountResult>(
    "/api/client-store/accounts",
    {
      method: "POST",
      body: JSON.stringify({
        tenant_ref: input.tenant_ref,
        legal_name: input.legal_name,
        email: input.email,
        entity_type: input.entity_type ?? "INDIVIDUAL",
      }),
    },
    { idempotencyKey: input.email },
  );
};

export const hubGetAccount = async (accountId: string, tenantRef?: string): Promise<HubAccountResult> => {
  if (isHubMock()) {
    return { id: accountId, status: "LIVE", entity_type: "INDIVIDUAL", tenant_ref: tenantRef };
  }
  const path = accountId
    ? `/api/client-store/accounts/${encodeURIComponent(accountId)}`
    : `/api/client-store/accounts?tenant_ref=${encodeURIComponent(tenantRef ?? "")}`;
  return hubFetch<HubAccountResult>(path, { method: "GET" });
};

export const hubUploadKycFile = async (
  file: { filename: string; mime: string; data: Buffer },
  accountId: string,
): Promise<{ file_id: string }> => {
  if (isHubMock()) {
    return { file_id: `mock-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  }
  const sidikJari = crypto.createHash("sha256").update(file.data).digest("hex");
  return hubUpload<{ file_id: string }>("/api/client-store/kyc/files", file, { account_id: accountId }, sidikJari);
};

export const hubSubmitKyc = async (
  request: HubKycSubmitRequest,
): Promise<HubKycSubmitResult> => {
  if (isHubMock()) {
    return { status: "PENDING_VERIFICATION" };
  }
  return hubFetch<HubKycSubmitResult>(
    "/api/client-store/kyc/submit",
    { method: "POST", body: JSON.stringify(request) },
    { idempotencyKey: request.for_user_id },
  );
};

/* ------------------------------ Perjanjian -------------------------------- */

export interface HubAgreementResult {
  version: string;
  text: string;
  hash: string;
}

/** Naskah perjanjian layanan (clickwrap) yang ditampilkan sebelum consent. */
export const hubGetAgreement = async (): Promise<HubAgreementResult> => {
  if (isHubMock()) {
    const text = "PERJANJIAN LAYANAN (mock)";
    return { version: "v1", text, hash: crypto.createHash("sha256").update(text).digest("hex") };
  }
  return hubFetch<HubAgreementResult>("/api/client-store/agreement", { method: "GET" });
};

/* --------------------------------- Saldo ---------------------------------- */

export interface HubBalanceResult {
  available: number;
  currency: string;
}

export const hubGetBalance = async (forUserId: string): Promise<HubBalanceResult> => {
  if (isHubMock()) {
    return { available: 0, currency: "IDR" };
  }
  return hubFetch<HubBalanceResult>(`/api/client-store/balance?account_id=${encodeURIComponent(forUserId)}`, {
    method: "GET",
  });
};

/* -------------------------------- Pembayaran ------------------------------- */

export interface HubChargeRequest {
  external_id: string;
  amount: number;
  description: string;
  /** Sub-akun tenant (XenPlatform). Hub memakai sebagai header for-user-id. */
  account_id?: string;
  tenant_ref?: string;
  expires_in_minutes?: number;
}

export interface HubChargeResult {
  id: string;
  reference_id: string;
  external_id: string;
  qr_string: string;
  status: string;
  expires_at?: string | null;
}

export const hubCreateQris = async (request: HubChargeRequest): Promise<HubChargeResult> => {
  if (isHubMock()) {
    return {
      id: `mock-qr-${Date.now()}`,
      reference_id: request.external_id,
      external_id: request.external_id,
      qr_string: "00020101021226610014ID.CO.QRIS.WWW0118mock",
      status: "pending",
      expires_at: null,
    };
  }
  const raw = await hubFetch<{
    reference_id?: string;
    external_id?: string;
    qr_string?: string;
    status?: string;
    expires_at?: string | null;
  }>(
    "/api/client-store-qris",
    { method: "POST", body: JSON.stringify(request) },
    { idempotencyKey: request.external_id },
  );
  return {
    id: raw.reference_id ?? request.external_id,
    reference_id: raw.reference_id ?? request.external_id,
    external_id: raw.external_id ?? request.external_id,
    qr_string: raw.qr_string ?? "",
    status: raw.status ?? "pending",
    expires_at: raw.expires_at ?? null,
  };
};

export const hubGetQris = (referenceId: string): Promise<HubChargeResult> =>
  hubFetch<HubChargeResult>(`/api/payment/qris/${encodeURIComponent(referenceId)}`, { method: "GET" });

/* --------------------------------- Payout --------------------------------- */

export interface HubPayoutRecipient {
  bank_code: string;
  account_holder_name: string;
  account_number: string;
}

export interface HubPayoutRequest {
  external_id: string;
  for_user_id: string;
  amount: number;
  description: string;
  recipient: HubPayoutRecipient;
}

export interface HubPayoutResult {
  id: string;
  external_id: string;
  status: string;
}

const duplikatPayout = (error: HubApiError): boolean => {
  if (error.statusCode < 400 || error.statusCode >= 500) return false;
  const kode = (error.code ?? "").toLowerCase();
  return kode.includes("duplicate") || kode.includes("already") || kode.includes("exists");
};

export const hubCreatePayout = async (
  request: HubPayoutRequest,
  idempotencyKey?: string,
): Promise<HubPayoutResult> => {
  if (isHubMock()) {
    return { id: `mock-payout-${Date.now()}`, external_id: request.external_id, status: "ACCEPTED" };
  }

  try {
    return await hubFetch<HubPayoutResult>(
      "/api/client-store/payouts",
      { method: "POST", body: JSON.stringify(request) },
      { idempotencyKey: idempotencyKey ?? request.external_id },
    );
  } catch (error) {
    // Hub menolak karena key idempotensi sudah pernah dipakai = payout sudah pernah dikirim.
    if (error instanceof HubApiError && duplikatPayout(error)) {
      const data = (error.payload ?? {}) as Record<string, unknown>;
      return {
        id: String(data.id ?? data.payout_id ?? ""),
        external_id: request.external_id,
        status: "DUPLICATE_ERROR",
      };
    }
    throw error;
  }
};

export const hubGetPayout = (id: string): Promise<HubPayoutResult> =>
  hubFetch<HubPayoutResult>(`/api/client-store/payouts/${encodeURIComponent(id)}`, { method: "GET" });

/* ------------------------------- Kanal bayar ------------------------------ */

export interface KanalPembayaran {
  qris: boolean;
  va: boolean;
}

const nilaiAktif = (value: unknown): boolean => {
  if (value === true) return true;
  if (typeof value === "string") {
    return ["ACTIVE", "AKTIF", "ENABLED", "TRUE", "LIVE", "AVAILABLE"].includes(value.trim().toUpperCase());
  }
  if (value && typeof value === "object") {
    return nilaiAktif((value as Record<string, unknown>).status);
  }
  return false;
};

/**
 * Membaca `payment_channels` dari Hub secara defensif. Bentuk pastinya menunggu
 * kontrak Hub final, jadi fungsi ini menerima boolean, string status, objek
 * `{ status }`, maupun array nama kanal.
 */
export const bacaKanal = (value: unknown): KanalPembayaran => {
  if (Array.isArray(value)) {
    const daftar = value.map((item) => String(item).toUpperCase());
    return {
      qris: daftar.some((item) => item.includes("QRIS")),
      va: daftar.some((item) => item.includes("VA") || item.includes("VIRTUAL")),
    };
  }
  if (!value || typeof value !== "object") return { qris: false, va: false };

  const data = value as Record<string, unknown>;
  return {
    qris: nilaiAktif(data.qris) || nilaiAktif(data.QRIS) || nilaiAktif(data.qris_status),
    va:
      nilaiAktif(data.va) ||
      nilaiAktif(data.VA) ||
      nilaiAktif(data.va_status) ||
      nilaiAktif(data.virtual_account),
  };
};

export const kanalQrisAktif = (value: unknown): boolean => bacaKanal(value).qris;

/* ---------------------------------- Fee ----------------------------------- */

/** Fee platform = FLAT Rp2.500 per transaksi (keputusan 2026-09-24). */
export const FEE_PLATFORM_FLAT = 2500;

export interface RincianBiaya {
  jumlah: number;
  fee_platform: number;
  biaya_hub: number;
  mdr: number;
  net_ke_rt: number;
}

export const hitungRincianBiaya = (jumlah: number): RincianBiaya => {
  const fee_platform = FEE_PLATFORM_FLAT;
  const mdr = Math.round(((env.MDR_PERSEN / 100) * jumlah + Number.EPSILON) * 100) / 100;
  const biaya_hub = 0;
  const net_ke_rt =
    Math.round((jumlah - fee_platform - mdr - biaya_hub + Number.EPSILON) * 100) / 100;

  return { jumlah, fee_platform, biaya_hub, mdr, net_ke_rt };
};

/* -------------------------------- Webhook --------------------------------- */

/** HMAC-SHA256(body, secret) — header `X-Logikraf-Signature-Hmac`. */
export const verifyWebhookHmac = (
  rawBody: Buffer | string | undefined,
  signature: string | undefined,
): boolean => {
  if (!env.LOGIKRAF_HUB_WEBHOOK_SECRET || !signature || !rawBody) return false;

  const expected = crypto
    .createHmac("sha256", env.LOGIKRAF_HUB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature.trim());

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

/** Kompatibilitas lama: header `X-Logikraf-Signature` berisi shared secret mentah. */
export const verifyWebhookSignature = (
  rawBody: Buffer | string | undefined,
  signature: string | undefined,
): boolean => {
  if (!env.LOGIKRAF_HUB_WEBHOOK_SECRET || !signature || !rawBody) return false;

  const expectedBuffer = Buffer.from(env.LOGIKRAF_HUB_WEBHOOK_SECRET);
  const receivedBuffer = Buffer.from(signature.trim());

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

/** Verifikasi gabungan: HMAC (disarankan) atau shared secret mentah (lama). */
export const verifyHubWebhook = (
  rawBody: Buffer | string | undefined,
  headers: { hmac?: string; signature?: string },
): boolean =>
  verifyWebhookHmac(rawBody, headers.hmac) ||
  verifyWebhookHmac(rawBody, headers.signature) ||
  verifyWebhookSignature(rawBody, headers.signature);

export const verifyInternalKey = (key: string | undefined): boolean => {
  if (!env.LOGIKRAF_INTERNAL_API_KEY || !key) return false;
  const expectedBuffer = Buffer.from(env.LOGIKRAF_INTERNAL_API_KEY);
  const receivedBuffer = Buffer.from(key.trim());
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};
