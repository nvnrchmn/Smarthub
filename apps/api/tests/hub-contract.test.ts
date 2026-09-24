import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  restoreHubEnv,
  startHubServer,
  loadHub,
  type CapturedRequest,
  type HubServer,
} from "./helpers/hub-server";

let server: HubServer;

const req = (index = 0): CapturedRequest => {
  const item = server.requests[index];
  if (!item) throw new Error(`Permintaan Hub ke-${index} tidak ditemukan`);
  return item;
};

beforeAll(async () => {
  server = await startHubServer();
});

afterAll(async () => {
  await server.close();
  restoreHubEnv();
});

beforeEach(() => {
  server.requests.length = 0;
  server.setResponder(() => ({ status: 200, body: {} }));
});

describe("Kontrak keluar klien Hub (HTTP-level)", () => {
  it("mengirim akun dengan X-Internal-Key, correlation-id, dan body yang disepakati", async () => {
    server.setResponder(() => ({
      status: 201,
      body: { id: "acc-1", status: "REGISTERED", tenant_ref: "7" },
    }));
    const hub = await loadHub(server.baseUrl);

    const akun = await hub.hubCreateAccount({
      tenant_ref: "7",
      legal_name: "RT 05",
      email: "rt05@test.local",
    });

    expect(akun).toEqual({ id: "acc-1", status: "REGISTERED", tenant_ref: "7" });
    expect(server.requests).toHaveLength(1);
    const request = req();
    expect(request.method).toBe("POST");
    expect(request.path).toBe("/api/client-store/accounts");
    expect(request.headers["x-internal-key"]).toBe("test-internal-key");
    expect(request.headers["x-logikraf-internal-key"]).toBeUndefined();
    expect(request.headers["x-correlation-id"]).toBeTruthy();
    expect(request.headers["idempotency-key"]).toBe("rt05@test.local");
    expect(String(request.headers["content-type"])).toContain("application/json");
    expect(request.json).toEqual({
      tenant_ref: "7",
      legal_name: "RT 05",
      email: "rt05@test.local",
      entity_type: "INDIVIDUAL",
    });
  });

  it("mengambil akun lewat GET /api/client-store/accounts/{id}", async () => {
    server.setResponder(() => ({ status: 200, body: { id: "acc-9", status: "LIVE" } }));
    const hub = await loadHub(server.baseUrl);

    const akun = await hub.hubGetAccount("acc-9");

    expect(akun.status).toBe("LIVE");
    expect(server.requests[0]?.method).toBe("GET");
    expect(req().path).toBe("/api/client-store/accounts/acc-9");
  });

  it("mengunggah dokumen KYC sebagai multipart dengan purpose KYC_DOCUMENT + account_id", async () => {
    server.setResponder(() => ({ status: 201, body: { file_id: "file-1" } }));
    const hub = await loadHub(server.baseUrl);

    const hasil = await hub.hubUploadKycFile(
      { filename: "ktp.png", mime: "image/png", data: Buffer.from("dummy") },
      "acc-1",
    );

    expect(hasil.file_id).toBe("file-1");
    const request = req();
    expect(request.method).toBe("POST");
    expect(request.path).toBe("/api/client-store/kyc/files");
    expect(String(request.headers["content-type"])).toContain("multipart/form-data");
    expect(request.headers["idempotency-key"]).toBeTruthy();
    expect(request.body).toContain('name="purpose"');
    expect(request.body).toContain("KYC_DOCUMENT");
    expect(request.body).toContain('name="account_id"');
    expect(request.body).toContain('filename="ktp.png"');
  });

  it("mengirim submit KYC lengkap ke /api/client-store/kyc/submit", async () => {
    server.setResponder(() => ({ status: 200, body: { status: "PENDING_VERIFICATION" } }));
    const hub = await loadHub(server.baseUrl);

    const hasil = await hub.hubSubmitKyc({
      for_user_id: "acc-1",
      entity_type: "INDIVIDUAL",
      legal_name: "RT 05",
      email: "rt05@test.local",
      ktp_number: "3273019900007777",
      tanggal_lahir: "1990-01-01",
      jenis_kelamin: "MALE",
      kewarganegaraan: "ID",
      alamat: { alamat: "Jl. Uji 1", kota: "Jakarta", provinsi: "DKI", kode_pos: "12345" },
      data_usaha: { nama_legal: "RT 05", deskripsi: "Iuran", sumber_dana: "REVENUE" },
      files: { ktp_depan: "f1", ktp_belakang: "f2", selfie: "f3" },
      consent: {
        version: "v1",
        hash: "abc123",
        agreed_at: "2026-09-24T00:00:00.000Z",
        ip: "127.0.0.1",
        user_agent: "vitest",
        log_id: "log-1",
        signer_name: "Ketua",
      },
    });

    expect(hasil.status).toBe("PENDING_VERIFICATION");
    const request = req();
    expect(request.path).toBe("/api/client-store/kyc/submit");
    const body = request.json as Record<string, unknown>;
    expect(body).toMatchObject({
      for_user_id: "acc-1",
      entity_type: "INDIVIDUAL",
      files: { ktp_depan: "f1", ktp_belakang: "f2", selfie: "f3" },
    });
    expect((body.consent as Record<string, unknown>).signer_name).toBe("Ketua");
    expect((body.consent as Record<string, unknown>).log_id).toBe("log-1");
    expect(body.ktp_number).toBe("3273019900007777");
  });

  it("mengambil naskah perjanjian lewat GET /api/client-store/agreement", async () => {
    server.setResponder(() => ({
      status: 200,
      body: { version: "v1", text: "PERJANJIAN", hash: "hash-v1" },
    }));
    const hub = await loadHub(server.baseUrl);

    const agreement = await hub.hubGetAgreement();

    expect(agreement).toEqual({ version: "v1", text: "PERJANJIAN", hash: "hash-v1" });
    expect(server.requests[0]?.method).toBe("GET");
    expect(req().path).toBe("/api/client-store/agreement");
    expect(req().headers["x-internal-key"]).toBe("test-internal-key");
  });

  it("mengambil saldo dengan query account_id", async () => {
    server.setResponder(() => ({ status: 200, body: { available: 12500, currency: "IDR" } }));
    const hub = await loadHub(server.baseUrl);

    const saldo = await hub.hubGetBalance("acc 1/2");

    expect(saldo).toEqual({ available: 12500, currency: "IDR" });
    expect(server.requests[0]?.method).toBe("GET");
    expect(req().path).toBe("/api/client-store/balance");
    expect(req().query).toBe("account_id=acc%201%2F2");
  });

  it("membuat QRIS di /api/client-store-qris dengan sub-akun tenant", async () => {
    server.setResponder(() => ({
      status: 201,
      body: {
        reference_id: "sb-iuran-1",
        external_id: "sb-iuran-1",
        qr_string: "000201...",
        status: "pending",
        expires_at: null,
      },
    }));
    const hub = await loadHub(server.baseUrl);

    const qris = await hub.hubCreateQris({
      external_id: "sb-iuran-1",
      account_id: "acc-1",
      tenant_ref: "7",
      amount: 100000,
      description: "Iuran 1/2026",
      expires_in_minutes: 2880,
    });

    expect(qris.reference_id).toBe("sb-iuran-1");
    expect(qris.qr_string).toBe("000201...");
    expect(req().path).toBe("/api/client-store-qris");
    expect(req().headers["idempotency-key"]).toBe("sb-iuran-1");
    expect(req().json).toMatchObject({
      external_id: "sb-iuran-1",
      account_id: "acc-1",
      tenant_ref: "7",
      amount: 100000,
      description: "Iuran 1/2026",
      expires_in_minutes: 2880,
    });
  });

  it("membuat payout di /api/client-store/payouts dengan Idempotency-Key stabil", async () => {
    server.setResponder(() => ({
      status: 200,
      body: { id: "po-1", external_id: "sb-pencairan-7", status: "MENUNGGU" },
    }));
    const hub = await loadHub(server.baseUrl);

    const payout = await hub.hubCreatePayout(
      {
        external_id: "sb-pencairan-7",
        for_user_id: "acc-1",
        amount: 50000,
        description: "Pencairan",
        recipient: { bank_code: "BCA", account_holder_name: "RT 05", account_number: "1234567890" },
      },
      "sb-pencairan-7",
    );

    expect(payout.status).toBe("MENUNGGU");
    const request = req();
    expect(request.path).toBe("/api/client-store/payouts");
    expect(request.headers["idempotency-key"]).toBe("sb-pencairan-7");
    expect(request.json).toMatchObject({
      external_id: "sb-pencairan-7",
      for_user_id: "acc-1",
      amount: 50000,
      recipient: { bank_code: "BCA", account_number: "1234567890" },
    });
  });

  it("mengambil payout lewat GET /api/client-store/payouts/{id}", async () => {
    server.setResponder(() => ({
      status: 200,
      body: { id: "po-1", external_id: "sb-pencairan-7", status: "SELESAI" },
    }));
    const hub = await loadHub(server.baseUrl);

    const payout = await hub.hubGetPayout("po-1");

    expect(payout.status).toBe("SELESAI");
    expect(req().path).toBe("/api/client-store/payouts/po-1");
  });
});
