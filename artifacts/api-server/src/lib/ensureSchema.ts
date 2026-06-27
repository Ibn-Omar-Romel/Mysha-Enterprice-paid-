import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Idempotent safety-net migration run at startup. The build also runs
 * `drizzle-kit push`, but this guarantees the newer store_settings table and
 * order payment columns exist even if a push didn't apply them. All statements
 * use IF NOT EXISTS so running repeatedly is safe and cheap.
 */
export async function ensureSchema(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS store_settings (
        id integer PRIMARY KEY DEFAULT 1,
        cod_charge_dhaka numeric(10,2) NOT NULL DEFAULT '60',
        cod_charge_outside numeric(10,2) NOT NULL DEFAULT '120',
        payments jsonb NOT NULL DEFAULT '{"cod":{"enabled":true},"bkash":{"enabled":true,"number":""},"nagad":{"enabled":true,"number":""},"rocket":{"enabled":true,"number":""}}'::jsonb,
        whatsapp_number text DEFAULT '8801633800157',
        email text DEFAULT 'support@myshaenterprise.com',
        address text DEFAULT '21 (Down Floor), Tota mia complex, Senpara Parbata, Mirpur-10, Dhaka-1216',
        sms_sender_id text DEFAULT '',
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS sms_sender_id text DEFAULT '';`);
    await db.execute(sql`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS flash_sale jsonb NOT NULL DEFAULT '{"endsAt":null,"items":[]}'::jsonb;`);

    const orderCols = [
      sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code text;`,
      sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge numeric(10,2) NOT NULL DEFAULT '0';`,
      sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_channel text;`,
      sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id text;`,
      sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS sender_number text;`,
      sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';`,
      sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notified_at timestamp;`,
    ];
    for (const stmt of orderCols) await db.execute(stmt);

    // Product columns added in earlier iterations (safe no-ops if present).
    const productCols = [
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS cash_price numeric(10,2);`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS model text;`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS code text;`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '[]'::jsonb;`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS storage_options jsonb NOT NULL DEFAULT '[]'::jsonb;`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '[]'::jsonb;`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time text DEFAULT '3-5 Days';`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS whatsapp_number text;`,
    ];
    for (const stmt of productCols) await db.execute(stmt);

    // Admin flag + roles on users.
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;`);

    // Policies table + default policy pages (only seeded when the table is empty).
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS policies (
        id serial PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        title text NOT NULL,
        content text NOT NULL DEFAULT '',
        enabled boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      INSERT INTO policies (slug, title, content, sort_order)
      SELECT v.slug, v.title, '', v.ord FROM (VALUES
        ('privacy-policy', 'Privacy Policy', 1),
        ('emi-payment-policy', 'EMI and Payment Policy', 2),
        ('warranty-policy', 'Warranty Policy', 3),
        ('exchange-policy', 'Exchange Policy', 4),
        ('delivery-policy', 'Delivery Policy', 5),
        ('pre-order-policy', 'Pre-Order Policy', 6),
        ('refund-policy', 'Refund Policy', 7),
        ('return-policy', 'Return Policy', 8)
      ) AS v(slug, title, ord)
      WHERE NOT EXISTS (SELECT 1 FROM policies);
    `);

    logger.info("ensureSchema: schema verified");
  } catch (err) {
    logger.error({ err }, "ensureSchema failed");
  }
}
