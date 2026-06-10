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
// Sensible defaults: HSTS, no-sniff, frameguard, etc. CSP is left to the
// frontend host since this service only serves JSON.
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// credentials:true is required so the browser sends the session cookie.
// In production only origins on ALLOWED_ORIGINS (comma-separated env var) may
// make credentialed cross-origin calls. In development any localhost origin is
// allowed so the Vite dev proxy works.
const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin / server-to-server / curl requests have no Origin header.
      if (!origin) return callback(null, true);

      if (!isProduction) {
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
          return callback(null, true);
        }
      }

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true, // ← required to send Set-Cookie back to browser
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

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

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
