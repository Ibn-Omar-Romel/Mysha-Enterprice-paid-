import { pgTable, serial, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  oldPrice: numeric("old_price", { precision: 10, scale: 2 }),
  discount: integer("discount").default(0),
  image: text("image").notNull(),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("4.5"),
  tag: text("tag"),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  inStock: boolean("in_stock").default(true),
  description: text("description").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
