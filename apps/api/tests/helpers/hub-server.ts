import http from "node:http";
import type { AddressInfo } from "node:net";
import { vi } from "vitest";

export interface CapturedRequest {
  method: string;
  path: string;
  query: string;
  headers: http.IncomingHttpHeaders;
  body: string;
  json: unknown;
}

export interface StubResponse {
  status: number;
  body?: unknown;
  delayMs?: number;
}

export interface HubServer {
  baseUrl: string;
  requests: CapturedRequest[];
  setResponder: (fn: (req: CapturedRequest) => StubResponse) => void;
  close: () => Promise<void>;
}

/** Server HTTP palsu untuk menguji kontrak keluar klien Hub (tanpa fungsi mock). */
export const startHubServer = async (): Promise<HubServer> => {
  const requests: CapturedRequest[] = [];
  let responder: (req: CapturedRequest) => StubResponse = () => ({ status: 200, body: {} });

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const [pathRaw, queryRaw] = (req.url ?? "").split("?");
      const path = pathRaw ?? "";
      const query = queryRaw ?? "";
      let json: unknown = null;
      try {
        json = raw === "" ? null : JSON.parse(raw);
      } catch {
        json = null;
      }
      const captured: CapturedRequest = {
        method: req.method ?? "",
        path,
        query,
        headers: req.headers,
        body: raw,
        json,
      };
      requests.push(captured);

      const out = responder(captured);
      const send = () => {
        res.writeHead(out.status, { "content-type": "application/json" });
        res.end(out.body === undefined ? "" : JSON.stringify(out.body));
      };
      if (out.delayMs && out.delayMs > 0) setTimeout(send, out.delayMs);
      else send();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    setResponder: (fn) => {
      responder = fn;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
};

export type HubModule = typeof import("../../src/config/hub");

/**
 * Memuat ulang modul hub dengan `LOGIKRAF_HUB_MOCK=false` dan base URL ke server
 * palsu. `vi.resetModules()` wajib agar environment dievaluasi ulang dari env baru.
 */
export const loadHub = async (
  baseUrl: string,
  overrides: Record<string, string> = {},
): Promise<HubModule> => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.LOGIKRAF_HUB_MOCK = "false";
  process.env.LOGIKRAF_HUB_BASE_URL = baseUrl;
  process.env.LOGIKRAF_HUB_API_KEY = "test-hub-key";
  process.env.LOGIKRAF_INTERNAL_API_KEY = "test-internal-key";
  process.env.LOGIKRAF_HUB_TIMEOUT_MS = "500";
  process.env.LOGIKRAF_HUB_RETRY = "0";
  process.env.LOGIKRAF_HUB_RETRY_DELAY_MS = "1";
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
  return (await import("../../src/config/hub")) as HubModule;
};

/** Kembalikan env ke mode mock agar test lain tidak terpengaruh. */
export const restoreHubEnv = (): void => {
  process.env.LOGIKRAF_HUB_MOCK = "true";
  delete process.env.LOGIKRAF_HUB_BASE_URL;
  delete process.env.LOGIKRAF_HUB_API_KEY;
  delete process.env.LOGIKRAF_HUB_TIMEOUT_MS;
  delete process.env.LOGIKRAF_HUB_RETRY;
  delete process.env.LOGIKRAF_HUB_RETRY_DELAY_MS;
  vi.resetModules();
};
