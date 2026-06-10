/**
 * One-time catalog migration: copies categories, products, and reviews from a
 * SOURCE Postgres database (your local one) into a DESTINATION database (Neon).
 *
 * Usage (run from the repo root):
 *   node lib/db/migrate-catalog.mjs "<LOCAL_DATABASE_URL>" "<NEON_DATABASE_URL>"
 *
 * Both databases must already have the tables (the Neon one does after
 * `pnpm --filter @workspace/db run push`). Existing rows with the same id are
 * skipped, so it is safe to run more than once.
 */
import pg from "pg";

const { Pool } = pg;

const SRC = process.argv[2];
const DEST = process.argv[3];

if (!SRC || !DEST) {
  console.error(
    'Usage: node lib/db/migrate-catalog.mjs "<LOCAL_DATABASE_URL>" "<NEON_DATABASE_URL>"',
  );
  process.exit(1);
}

// Neon (and any sslmode=require URL) needs SSL; localhost does not.
const sslFor = (url) =>
  /neon\.tech|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined;

const src = new Pool({ connectionString: SRC, ssl: sslFor(SRC) });
const dest = new Pool({ connectionString: DEST, ssl: sslFor(DEST) });

// Order matters only loosely here; this is a sensible default.
const TABLES = ["categories", "products", "reviews"];

async function copyTable(table) {
  const { rows } = await src.query(`SELECT * FROM ${table} ORDER BY id`);
  if (rows.length === 0) {
    console.log(`- ${table}: 0 rows (nothing to copy)`);
    return;
  }

  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");

  let copied = 0;
  for (const row of rows) {
    const values = cols.map((c) => row[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    await dest.query(
      `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
      values,
    );
    copied++;
  }

  // Keep the id sequence ahead of the copied ids so new inserts don't collide.
  await dest.query(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST((SELECT MAX(id) FROM ${table}), 1))`,
  );

  console.log(`- ${table}: copied ${copied} rows`);
}

try {
  console.log("Copying catalog (categories, products, reviews) local -> Neon ...\n");
  for (const t of TABLES) {
    await copyTable(t);
  }
  console.log("\nDone. Your catalog is now in Neon.");
} catch (err) {
  console.error("\nMigration failed:", err.message);
  process.exitCode = 1;
} finally {
  await src.end();
  await dest.end();
}
