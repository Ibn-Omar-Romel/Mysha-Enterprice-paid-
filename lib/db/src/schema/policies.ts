import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

// Store policy pages (Privacy, Refund, Warranty, etc.). Content is plain text
// and fully supports Bengali + English (stored as UTF-8 text).
export const policiesTable = pgTable("policies", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  // When false, the policy is hidden from the storefront (temporarily disabled).
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Policy = typeof policiesTable.$inferSelect;
