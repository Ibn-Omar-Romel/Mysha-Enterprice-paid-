import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  prefix: string;
  message: string;
}

// Upstash is used when its REST credentials are present. This gives a single,
// shared rate-limit counter across every serverless instance — the in-memory
// limiter below only protects a single process, so it resets on every cold
// start and is effectively useless on Vercel.
const upstashConfigured =
  Boolean(process.env["UPSTASH_REDIS_REST_URL"]) &&
  Boolean(process.env["UPSTASH_REDIS_REST_TOKEN"]);

const redis = upstashConfigured ? Redis.fromEnv() : null;

function clientKey(req: { ip?: string; headers: Record<string, unknown> }): string {
  const fwd = req.headers["x-forwarded-for"];
  const fromFwd = Array.isArray(fwd) ? fwd[0] : typeof fwd === "string" ? fwd.split(",")[0] : undefined;
  return (req.ip || fromFwd || "anonymous").toString().trim();
}

export function createRateLimiter(opts: RateLimiterOptions): RequestHandler {
  if (redis) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.max, `${Math.ceil(opts.windowMs / 1000)} s`),
      prefix: `rl:${opts.prefix}`,
      analytics: false,
    });

    return (req, res, next) => {
      limiter
        .limit(clientKey(req))
        .then(({ success, limit, remaining, reset }) => {
          res.setHeader("RateLimit-Limit", String(limit));
          res.setHeader("RateLimit-Remaining", String(Math.max(0, remaining)));
          res.setHeader("RateLimit-Reset", String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))));
          if (!success) {
            res.status(429).json({ error: opts.message });
            return;
          }
          next();
        })
        .catch((err) => {
          // Fail open: a Redis hiccup must not take the whole API down. Log it
          // so the problem is visible.
          (req as { log?: { error: (o: unknown, m: string) => void } }).log?.error(
            { err },
            "Rate limiter error (failing open)",
          );
          next();
        });
    };
  }

  // Fallback for local development (and as a last resort if Upstash is missing).
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    message: { error: opts.message },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
