import type { RequestHandler } from "express";
import { HttpError } from "../utils/http-error";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const pruneExpired = (now: number): void => {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

export const rateLimit = ({ windowMs, max, message }: RateLimitOptions): RequestHandler => {
  return (req, _res, next) => {
    const now = Date.now();
    pruneExpired(now);

    const key = `${req.ip ?? "unknown"}:${req.method}:${req.baseUrl}${req.path}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      next(HttpError.tooManyRequests(message));
      return;
    }

    bucket.count += 1;
    next();
  };
};
