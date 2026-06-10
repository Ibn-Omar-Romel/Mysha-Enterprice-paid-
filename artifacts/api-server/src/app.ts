import path from "node:path";
import fs from "node:fs";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { createRateLimiter } from "./middlewares/rateLimit";
import "express-session";

const app: Express = express();

const isProduction = process.env.NODE_ENV === "production";

// Required so secure cookies and the IP-based rate limiter work correctly
// behind a reverse proxy (Replit, nginx, etc.).
app.set("trust proxy", 1);
app.disable("x-powered-by");

// In production the session secret must be a real, strong value.
const SESSION_SECRET = process.env["SESSION_SECRET"];
if (isProduction && (!SESSION_SECRET || SESSION_SECRET.length < 32)) {
  throw new Error(
    "SESSION_SECRET must be set to a strong value (32+ characters) in production."
  );
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

// ─── Security headers ──────────────────────────────────────────────────────────
// HSTS, no-sniff, frameguard, etc. This server also serves the storefront, so
// the Content-Security-Policy must allow the resources the frontend needs:
// product images from any HTTPS host, Google Fonts, and same-origin scripts.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // Inline styles are used by the UI libraries; styles also come from Google Fonts.
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        // Product images are external HTTPS URLs (e.g. Unsplash); allow any HTTPS image.
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// credentials:true is required so the browser sends the session cookie.
// Allowed: (1) same-origin requests — the frontend and API share a host on
// Vercel, so the site always trusts itself with no configuration; (2) any
// localhost origin in development (Vite dev proxy); (3) any extra origins listed
// in the ALLOWED_ORIGINS env var (comma-separated) for separate frontends.
const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors((req, callback) => {
    const origin = req.headers.origin;
    const host = req.headers.host;

    const isAllowed =
      // No Origin header (same-origin GET, server-to-server, curl, health checks)
      !origin ||
      // Same-origin: the request's Origin matches the host it was sent to
      origin === `https://${host}` ||
      origin === `http://${host}` ||
      // Localhost in development
      (!isProduction && (origin.includes("localhost") || origin.includes("127.0.0.1"))) ||
      // Explicitly allow-listed extra origins
      allowedOrigins.includes(origin);

    // Never throw — just withhold CORS headers for disallowed origins so the
    // browser blocks them, instead of returning a 500.
    callback(null, { origin: isAllowed, credentials: true });
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ─── Session (Postgres-backed store) ────────────────────────────────────────────
// MemoryStore is not production-safe (leaks memory, lost on restart, single
// process only). connect-pg-simple persists sessions in the existing database.
const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: SESSION_SECRET || "mysha-dev-secret",
    resave: false,
    saveUninitialized: false, // false = don't create session until something is stored
    cookie: {
      // false in development so the cookie is sent over HTTP through the Vite
      // proxy; true in production so the cookie is only sent over HTTPS.
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// ─── Rate limiting ──────────────────────────────────────────────────────────────
// A light global limiter to blunt scraping/abuse, plus a stricter limiter on
// authentication endpoints to slow credential-stuffing / brute force. Backed by
// Upstash Redis when configured (required for real protection on serverless),
// otherwise an in-memory fallback for local development.
const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  prefix: "global",
  message: "Too many requests. Please slow down.",
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  prefix: "auth",
  message: "Too many requests. Please try again in 15 minutes.",
});

app.use("/api", globalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api", router);

// Unmatched API routes → JSON 404.
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Serve the built frontend (single-origin deploy) ──────────────────────────
// When the frontend has been built (e.g. on Render), this same server serves
// the storefront so the API and site share one origin (sessions/cookies work,
// no CORS). In local dev the build doesn't exist, so this is skipped and Vite
// serves the frontend separately.
const clientDir =
  process.env["CLIENT_DIR"] ||
  path.resolve(process.cwd(), "artifacts/mysha-enterprise/dist/public");
const indexHtml = path.join(clientDir, "index.html");
const serveClient = fs.existsSync(indexHtml);

if (serveClient) {
  app.use(express.static(clientDir));
  // SPA fallback: any non-API GET returns index.html so client-side routing works.
  app.get(/.*/, (_req: Request, res: Response, next: NextFunction) => {
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });
  logger.info({ clientDir }, "Serving built frontend");
} else {
  // No frontend build present (local dev / API-only): plain 404.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });
}

// ─── Central error handler ──────────────────────────────────────────────────────
// Express 5 forwards rejected async handlers here. We log full detail server
// side but never leak stack traces / internal messages to clients in prod.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  req.log?.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  const status = typeof err?.status === "number" ? err.status : 500;
  res.status(status).json({
    error: isProduction ? "Internal server error" : err?.message ?? "Internal server error",
  });
});

export default app;
