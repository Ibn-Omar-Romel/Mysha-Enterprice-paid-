import { pgTable, serial, integer, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().default("default"),
  // Human-friendly unique order id shown to the customer, e.g. "ME-2K7Q4D".
  orderCode: text("order_code"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  // Workflow: pending → confirmed → processing → packed → delivered (or cancelled).
  status: text("status").notNull().default("pending"),
  shippingAddress: jsonb("shipping_address").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  items: jsonb("items").notNull().default([]),
  // When the confirmation notification (SMS) was sent to the customer.
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Allowed order statuses, in workflow order.
export const ORDER_STATUSES = ["pending", "confirmed", "processing", "packed", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  image: text("image").notNull(),
  brand: text("brand").notNull().default(""),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
