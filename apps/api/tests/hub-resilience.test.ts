import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { restoreHubEnv, startHubServer, loadHub, type HubServer } from "./helpers/hub-server";

let server: HubServer;

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

const qrisRequest = {
  external_id: "sb-iuran-1",
  account_id: "acc-1",
  tenant_ref: "7",
  amount: 100000,
  description: "Iuran 1/2026",
  expires_in_minutes: 2880,
};

describe("Ketahanan klien Hub (G-B)", () => {
  it("mengulang panggilan pada 5xx lalu berhasil", async () => {
    const hub = await loadHub(server.baseUrl, { LOGIKRAF_HUB_RETRY: "2" });
    let panggilan = 0;
    server.setResponder(() => {
      panggilan += 1;
      if (panggilan < 3) return { status: 502, body: { message: "bad gateway" } };
      return { status: 201, body: { id: "qr-1", external_id: "sb-iuran-1", qr_string: "000201...", status: "PENDING" } };
    });

    const hasil = await hub.hubCreateQris(qrisRequest);

    expect(hasil.qr_string).toBe("000201...");
    expect(server.requests).toHaveLength(3);
  });

  it("tidak mengulang panggilan pada 4xx dan menyembunyikan payload penyedia", async () => {
    const hub = await loadHub(server.baseUrl, { LOGIKRAF_HUB_RETRY: "2" });
    server.setResponder(() => ({ status: 400, body: { error_code: "XENDIT_INVALID_REQUEST", message: "Xendit says no" } }));

    const error = await hub
      .hubCreateQris(qrisRequest)
      .then(() => null)
      .catch((err: unknown) => err as InstanceType<typeof hub.HubApiError>);

    expect(error).toBeInstanceOf(hub.HubApiError);
    expect(error?.statusCode).toBe(400);
    expect(server.requests).toHaveLength(1);
    expect(String(error?.message)).not.toContain("XENDIT");
    expect(String(error?.message)).not.toContain("Xendit says no");
  });

  it("membatalkan panggilan yang melewati timeout lalu mengulang", async () => {
    const hub = await loadHub(server.baseUrl, {
      LOGIKRAF_HUB_RETRY: "1",
      LOGIKRAF_HUB_TIMEOUT_MS: "60",
    });
    let panggilan = 0;
    server.setResponder(() => {
      panggilan += 1;
      if (panggilan === 1) return { status: 200, body: { available: 1, currency: "IDR" }, delayMs: 300 };
      return { status: 200, body: { available: 0, currency: "IDR" } };
    });

    const saldo = await hub.hubGetBalance("acc-1");

    expect(saldo.available).toBe(0);
    expect(server.requests).toHaveLength(2);
  });

  it("memperlakukan DUPLICATE_ERROR payout sebagai idempoten, bukan kegagalan", async () => {
    const hub = await loadHub(server.baseUrl);
    server.setResponder(() => ({ status: 409, body: { error_code: "DUPLICATE_ERROR", id: "po-existing" } }));

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

    expect(payout).toEqual({ id: "po-existing", external_id: "sb-pencairan-7", status: "DUPLICATE_ERROR" });
  });

  it("menerjemahkan status kanal pembayaran secara defensif", async () => {
    const hub = await loadHub(server.baseUrl);

    expect(hub.kanalQrisAktif({ qris: true })).toBe(true);
    expect(hub.kanalQrisAktif({ qris: { status: "ACTIVE" } })).toBe(true);
    expect(hub.kanalQrisAktif(["QRIS", "VA"])).toBe(true);
    expect(hub.kanalQrisAktif({ va: true })).toBe(false);
    expect(hub.kanalQrisAktif(null)).toBe(false);
    expect(hub.bacaKanal({ qris: "ENABLED", va: "INACTIVE" })).toEqual({ qris: true, va: false });
  });
});
