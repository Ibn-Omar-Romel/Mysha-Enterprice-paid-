import { pgTable, serial, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Admin panel sections a sub-admin can be granted access to.
export const ADMIN_PERMISSIONS = ["products", "orders", "reviews", "flash_sale", "policies", "settings", "import"] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  verified: boolean("verified").notNull().default(false),
  // Grants access to the admin panel.
  isAdmin: boolean("is_admin").notNull().default(false),
  // Super admins (the owner) can manage other admins and have all permissions.
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  // Sections a sub-admin may access (ignored for super admins, who have all).
  permissions: jsonb("permissions").$type<AdminPermission[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const verificationCodesTable = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(), // "signup" | "reset"
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
