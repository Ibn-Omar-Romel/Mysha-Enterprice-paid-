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
  const [created] = await db.insert(storeSettingsTable).values({ id: 1 }).returning();
  return created;
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
  };
}

/** True if the given city counts as "within Dhaka" for COD charging. */
export function isDhaka(city: string): boolean {
  return /dhaka/i.test((city ?? "").trim());
}
