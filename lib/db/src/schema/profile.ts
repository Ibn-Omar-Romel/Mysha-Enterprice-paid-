import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profileTable = pgTable("profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Guest User"),
  email: text("email").notNull().default("guest@example.com"),
  phone: text("phone").notNull().default(""),
  avatar: text("avatar"),
  address: jsonb("address"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profileTable).omit({ id: true, joinedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profileTable.$inferSelect;
