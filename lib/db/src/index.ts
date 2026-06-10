import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// On serverless platforms (Vercel) many short-lived instances each open their
// own pool, which can exhaust the database's connection limit. We keep the pool
// small there and ALWAYS connect through a pooled connection string (e.g. Neon's
// "-pooler" host or Supabase port 6543). The pool is cached on globalThis so a
// warm instance reuses one pool across invocations instead of leaking new ones.
const isServerless = Boolean(process.env.VERCEL);

const globalForDb = globalThis as unknown as { __dbPool?: pg.Pool };

export const pool =
  globalForDb.__dbPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: isServerless ? 1 : 10,
    // Recycle idle connections quickly in serverless to avoid holding slots.
    idleTimeoutMillis: isServerless ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (!globalForDb.__dbPool) {
  globalForDb.__dbPool = pool;
}

export const db = drizzle(pool, { schema });

export * from "./schema";
