import { pgTable, serial, text, numeric, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Variant / spec value shapes stored as JSONB ───────────────────────────────
// Kept as JSONB columns so the admin can add an arbitrary number of colors,
// storage options and specification rows per product without extra tables or
// migrations. Each shape is intentionally simple so it maps 1:1 to the admin
// form fields.
export type ProductColor = {
  /** Display name, e.g. "Rose Quartz" */
  name: string;
  /** Optional swatch colour, e.g. "#f6cdd6" */
  hex?: string;
};

export type ProductStorageOption = {
  /** Display label, e.g. "16/128GB" */
  label: string;
  /** Price for this option (selected price shown on the page) */
  price: number;
  /** Optional strikethrough/original price for this option */
  oldPrice?: number | null;
  /** Optional stock count for this option */
  stock?: number | null;
};

export type ProductSpec = {
  /** Row label, e.g. "Chipset" */
  label: string;
  /** Row value, e.g. "Google Tensor G4 (4 nm)" */
  value: string;
};

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  oldPrice: numeric("old_price", { precision: 10, scale: 2 }),
  // "Cash Price" highlighted on the product page; falls back to price when null.
  cashPrice: numeric("cash_price", { precision: 10, scale: 2 }),
  discount: integer("discount").default(0),
  // Primary image (used in listings / cards / search).
  image: text("image").notNull(),
  // Additional gallery images shown as thumbnails on the product page.
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("4.5"),
  tag: text("tag"),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  // Manufacturer model name, e.g. "Pixel 9 Pro XL".
  model: text("model"),
  // Product/SKU code shown next to availability, e.g. "1-15".
  code: text("code"),
  inStock: boolean("in_stock").default(true),
  description: text("description").default(""),
  // Selectable colour swatches.
  colors: jsonb("colors").$type<ProductColor[]>().default([]).notNull(),
  // Selectable storage options (each can carry its own price/stock).
  storageOptions: jsonb("storage_options").$type<ProductStorageOption[]>().default([]).notNull(),
  // Full specification table rows.
  specifications: jsonb("specifications").$type<ProductSpec[]>().default([]).notNull(),
  // Estimated delivery window shown on the page, e.g. "3-5 Days".
  deliveryTime: text("delivery_time").default("3-5 Days"),
  // Whether the "EMI Available" row shows.
  emiAvailable: boolean("emi_available").default(true),
  // Optional per-product WhatsApp number (digits only). Falls back to the
  // store-wide OWNER_WHATSAPP config on the frontend when empty.
  whatsappNumber: text("whatsapp_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = typeof productsTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;
