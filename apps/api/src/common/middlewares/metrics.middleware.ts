import type { RequestHandler } from "express";

interface MetricsState {
  startedAt: string;
  totalRequests: number;
  totalErrors: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
  totalDurationMs: number;
}

const state: MetricsState = {
  startedAt: new Date().toISOString(),
  totalRequests: 0,
  totalErrors: 0,
  byStatus: {},
  byMethod: {},
  totalDurationMs: 0,
};

export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const status = String(res.statusCode);

    state.totalRequests += 1;
    state.totalDurationMs += durationMs;
    state.byStatus[status] = (state.byStatus[status] ?? 0) + 1;
    state.byMethod[req.method] = (state.byMethod[req.method] ?? 0) + 1;
    if (res.statusCode >= 500) state.totalErrors += 1;
  });

  next();
};

export const getMetrics = (): MetricsState & { avgDurationMs: number; uptimeSeconds: number } => ({
  ...state,
  byStatus: { ...state.byStatus },
  byMethod: { ...state.byMethod },
  avgDurationMs:
    state.totalRequests === 0 ? 0 : Number((state.totalDurationMs / state.totalRequests).toFixed(2)),
  uptimeSeconds: Math.floor(process.uptime()),
});
