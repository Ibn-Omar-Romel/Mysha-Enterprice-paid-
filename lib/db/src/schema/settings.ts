import { pgTable, integer, text, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";

// Per-method config for manual (verify-by-transaction-id) mobile banking.
export type PaymentMethodConfig = { enabled: boolean; number?: string };

export type PaymentsConfig = {
  cod: { enabled: boolean };
  bkash: PaymentMethodConfig;
  nagad: PaymentMethodConfig;
  rocket: PaymentMethodConfig;
};

export const DEFAULT_PAYMENTS: PaymentsConfig = {
  cod: { enabled: true },
  bkash: { enabled: true, number: "" },
  nagad: { enabled: true, number: "" },
  rocket: { enabled: true, number: "" },
};

// Single-row table (id is always 1) holding store-wide settings the admin edits.
export const storeSettingsTable = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  // Cash-on-delivery charge: Amount A (within Dhaka) and Amount B (outside Dhaka).
  codChargeDhaka: numeric("cod_charge_dhaka", { precision: 10, scale: 2 }).notNull().default("60"),
  codChargeOutside: numeric("cod_charge_outside", { precision: 10, scale: 2 }).notNull().default("120"),
  // Which payment methods are enabled + the receive number for each mobile wallet.
  payments: jsonb("payments").$type<PaymentsConfig>().notNull().default(DEFAULT_PAYMENTS),
  // Contact details shown across the site (footer, product pages).
  whatsappNumber: text("whatsapp_number").default("8801633800157"),
  email: text("email").default("support@myshaenterprise.com"),
  address: text("address").default("21 (Down Floor), Tota mia complex, Senpara Parbata, Mirpur-10, Dhaka-1216"),
  // Sender ID/number used for outgoing SMS (order confirmed / payment verified).
  smsSenderId: text("sms_sender_id").default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type StoreSettings = typeof storeSettingsTable.$inferSelect;
