import { db, storeSettingsTable, DEFAULT_PAYMENTS, type StoreSettings, type PaymentsConfig } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Returns the single store-settings row, creating it with defaults the first
 * time it's needed. The whole site reads COD charges, enabled payment methods,
 * and contact info from here so the admin can change them in one place.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  const [row] = await db.select().from(storeSettingsTable).where(eq(storeSettingsTable.id, 1)).limit(1);
  if (row) return row;
  // Insert with explicit values rather than relying on DB-level defaults (some
  // jsonb defaults aren't reliably applied by drizzle-kit push).
  const [created] = await db
    .insert(storeSettingsTable)
    .values({
      id: 1,
      codChargeDhaka: "60",
      codChargeOutside: "120",
      payments: DEFAULT_PAYMENTS,
      whatsappNumber: "8801633800157",
      email: "support@myshaenterprise.com",
      address: "21 (Down Floor), Tota mia complex, Senpara Parbata, Mirpur-10, Dhaka-1216",
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  // Race fallback: another request created it first.
  const [existing] = await db.select().from(storeSettingsTable).where(eq(storeSettingsTable.id, 1)).limit(1);
  return existing;
}

/** Public-safe view: charges, which methods are on, their numbers, and contact. */
export function publicSettings(s: StoreSettings) {
  const p = (s.payments ?? DEFAULT_PAYMENTS) as PaymentsConfig;
  return {
    codChargeDhaka: parseFloat(s.codChargeDhaka as string),
    codChargeOutside: parseFloat(s.codChargeOutside as string),
    payments: {
      cod: { enabled: p.cod?.enabled ?? true },
      bkash: { enabled: p.bkash?.enabled ?? false, number: p.bkash?.number ?? "" },
      nagad: { enabled: p.nagad?.enabled ?? false, number: p.nagad?.number ?? "" },
      rocket: { enabled: p.rocket?.enabled ?? false, number: p.rocket?.number ?? "" },
    },
    contact: {
      whatsapp: s.whatsappNumber ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
    },
    social: {
      facebook: s.facebook ?? "",
      instagram: s.instagram ?? "",
      youtube: s.youtube ?? "",
    },
  };
}

/** True if the given city counts as "within Dhaka" for COD charging. */
export function isDhaka(city: string): boolean {
  return /dhaka/i.test((city ?? "").trim());
}
