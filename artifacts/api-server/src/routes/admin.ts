import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, productsTable, reviewsTable, ordersTable, ORDER_STATUSES, storeSettingsTable, usersTable, ADMIN_PERMISSIONS, policiesTable } from "@workspace/db";
import { eq, desc, asc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAdmin, requireSuperAdmin, requirePermission } from "../middlewares/requireAdmin";
import { validateBody } from "../middlewares/validate";
import { sendSms, orderConfirmationMessage, paymentVerifiedMessage } from "../lib/sms";
import { getStoreSettings } from "../lib/settings";
import { isSuperAdminUser, effectivePermissions } from "../lib/admin";

const router = Router();

// Everything under /admin requires an authenticated admin user.
router.use("/admin", requireAdmin);

// ─── Validation ────────────────────────────────────────────────────────────────
const colorSchema = z.object({
  name: z.string().trim().min(1).max(60),
  hex: z.string().trim().max(20).optional().or(z.literal("")),
  image: z.string().trim().url().max(2000).optional().or(z.literal("")),
});

const storageOptionSchema = z.object({
  label: z.string().trim().min(1).max(60),
  price: z.coerce.number().min(0),
  oldPrice: z.coerce.number().min(0).nullable().optional(),
  stock: z.coerce.number().int().min(0).nullable().optional(),
});

const specSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(2000),
});

const productInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().min(1).max(120),
  model: z.string().trim().max(160).optional().or(z.literal("")),
  category: z.string().trim().min(1).max(120),
  code: z.string().trim().max(60).optional().or(z.literal("")),
  price: z.coerce.number().min(0),
  oldPrice: z.coerce.number().min(0).nullable().optional(),
  cashPrice: z.coerce.number().min(0).nullable().optional(),
  discount: z.coerce.number().int().min(0).max(100).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  tag: z.string().trim().max(60).optional().or(z.literal("")),
  image: z.string().trim().url("Primary image must be a valid URL").max(2000),
  images: z.array(z.string().trim().url().max(2000)).max(12).optional(),
  inStock: z.boolean().optional(),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  colors: z.array(colorSchema).max(20).optional(),
  storageOptions: z.array(storageOptionSchema).max(20).optional(),
  specifications: z.array(specSchema).max(60).optional(),
  deliveryTime: z.string().trim().max(60).optional().or(z.literal("")),
  whatsappNumber: z.string().trim().max(30).optional().or(z.literal("")),
});

type ProductInput = z.infer<typeof productInputSchema>;

// Map validated input → DB insert/update values.
function toRow(body: ProductInput) {
  return {
    name: body.name,
    brand: body.brand,
    model: body.model || null,
    category: body.category,
    code: body.code || null,
    price: String(body.price),
    oldPrice: body.oldPrice != null ? String(body.oldPrice) : null,
    cashPrice: body.cashPrice != null ? String(body.cashPrice) : null,
    discount: body.discount ?? 0,
    rating: body.rating != null ? String(body.rating) : "4.5",
    tag: body.tag || null,
    image: body.image,
    images: body.images ?? [],
    inStock: body.inStock ?? true,
    description: body.description ?? "",
    colors: (body.colors ?? []).map((c) => ({
      name: c.name,
      hex: c.hex || undefined,
      image: c.image || undefined,
    })),
    storageOptions: (body.storageOptions ?? []).map((s) => ({
      label: s.label,
      price: s.price,
      oldPrice: s.oldPrice ?? null,
      stock: s.stock ?? null,
    })),
    specifications: body.specifications ?? [],
    deliveryTime: body.deliveryTime || "3-5 Days",
    whatsappNumber: body.whatsappNumber || null,
  };
}

// ─── GET /api/admin/products ─── full list (incl. out of stock) for the panel ──
router.get("/admin/products", requirePermission("products"), async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        brand: productsTable.brand,
        category: productsTable.category,
        price: productsTable.price,
        image: productsTable.image,
        inStock: productsTable.inStock,
        code: productsTable.code,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .where(q ? sql`${productsTable.name} ILIKE ${`%${q}%`}` : undefined)
      .orderBy(desc(productsTable.createdAt))
      .limit(500);

    res.json({
      products: rows.map((r) => ({
        id: r.id,
        name: r.name,
        brand: r.brand,
        category: r.category,
        price: parseFloat(r.price as string),
        image: r.image,
        inStock: r.inStock ?? true,
        code: r.code ?? null,
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (err: any) {
    console.error("[GET /api/admin/products]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

// ─── GET /api/admin/products/:id ─── full row for editing ──────────────────────
router.get("/admin/products/:id", requirePermission("products"), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid product ID" }); return; }
  try {
    const [row] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!row) { res.status(404).json({ error: "Product not found" }); return; }
    res.json({
      ...row,
      price: parseFloat(row.price as string),
      oldPrice: row.oldPrice != null ? parseFloat(row.oldPrice as string) : null,
      cashPrice: row.cashPrice != null ? parseFloat(row.cashPrice as string) : null,
      rating: row.rating != null ? parseFloat(row.rating as string) : 4.5,
      createdAt: row.createdAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/products/:id]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load product" });
  }
});

// ─── POST /api/admin/products ─── create ───────────────────────────────────────
router.post("/admin/products", requirePermission("products"), validateBody(productInputSchema), async (req: Request, res: Response) => {
  try {
    const [row] = await db.insert(productsTable).values(toRow(req.body)).returning();
    res.status(201).json({ id: row.id });
  } catch (err: any) {
    console.error("[POST /api/admin/products]", err?.message ?? err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// ─── POST /api/admin/products/bulk ─── import many products at once ───────────
// Validates each product independently so one bad row doesn't fail the batch.
// Returns how many were created plus per-row errors. The frontend sends rows in
// small batches to stay within the JSON body limit.
router.post("/admin/products/bulk", requirePermission("import"), async (req: Request, res: Response) => {
  const body = req.body as { products?: unknown };
  if (!body || !Array.isArray(body.products)) {
    res.status(400).json({ error: "Expected { products: [...] }" });
    return;
  }
  const rows = body.products.slice(0, 500);
  const results = { created: 0, failed: [] as { row: number; name: string; error: string }[] };

  for (let i = 0; i < rows.length; i++) {
    const parsed = productInputSchema.safeParse(rows[i]);
    const name = (rows[i] as any)?.name ?? `Row ${i + 1}`;
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const msg = Object.entries(fe).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ");
      results.failed.push({ row: i + 1, name, error: msg || "Invalid data" });
      continue;
    }
    try {
      await db.insert(productsTable).values(toRow(parsed.data));
      results.created++;
    } catch (err: any) {
      results.failed.push({ row: i + 1, name, error: err?.message ?? "Insert failed" });
    }
  }

  res.json(results);
});

// ─── PUT /api/admin/products/:id ─── update ────────────────────────────────────
router.put("/admin/products/:id", requirePermission("products"), validateBody(productInputSchema), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid product ID" }); return; }
  try {
    const [row] = await db
      .update(productsTable)
      .set(toRow(req.body))
      .where(eq(productsTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Product not found" }); return; }
    res.json({ id: row.id });
  } catch (err: any) {
    console.error("[PUT /api/admin/products/:id]", err?.message ?? err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// ─── DELETE /api/admin/products/:id ─── delete ─────────────────────────────────
router.delete("/admin/products/:id", requirePermission("products"), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid product ID" }); return; }
  try {
    const [row] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Product not found" }); return; }
    res.json({ id: row.id });
  } catch (err: any) {
    console.error("[DELETE /api/admin/products/:id]", err?.message ?? err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  REVIEWS
// ════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/reviews ─── all reviews, newest first, with product name ──
router.get("/admin/reviews", requirePermission("reviews"), async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: reviewsTable.id,
        productId: reviewsTable.productId,
        productName: productsTable.name,
        reviewerName: reviewsTable.reviewerName,
        rating: reviewsTable.rating,
        comment: reviewsTable.comment,
        helpfulCount: reviewsTable.helpfulCount,
        verified: reviewsTable.verified,
        createdAt: reviewsTable.createdAt,
      })
      .from(reviewsTable)
      .leftJoin(productsTable, eq(reviewsTable.productId, productsTable.id))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(1000);

    res.json({
      reviews: rows.map((r) => ({
        ...r,
        productName: r.productName ?? "(deleted product)",
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (err: any) {
    console.error("[GET /api/admin/reviews]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// ─── DELETE /api/admin/reviews/:id ─── remove a review ───────────────────────
router.delete("/admin/reviews/:id", requirePermission("reviews"), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid review ID" }); return; }
  try {
    const [row] = await db.delete(reviewsTable).where(eq(reviewsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Review not found" }); return; }
    res.json({ id: row.id });
  } catch (err: any) {
    console.error("[DELETE /api/admin/reviews/:id]", err?.message ?? err);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  ORDERS
// ════════════════════════════════════════════════════════════════════════════

function formatAdminOrder(o: typeof ordersTable.$inferSelect) {
  const addr = (o.shippingAddress ?? {}) as Record<string, any>;
  return {
    id: o.id,
    orderCode: o.orderCode ?? `ME-${o.id}`,
    status: o.status,
    total: parseFloat(o.total as string),
    deliveryCharge: parseFloat((o.deliveryCharge ?? "0") as string),
    paymentMethod: o.paymentMethod,
    paymentChannel: o.paymentChannel ?? null,
    transactionId: o.transactionId ?? null,
    senderNumber: o.senderNumber ?? null,
    paymentStatus: o.paymentStatus ?? "pending",
    customerName: addr.name ?? "",
    customerPhone: addr.phone ?? "",
    shippingAddress: addr,
    items: (o.items as Array<{ name: string; price: number; quantity: number; image: string; brand: string; color?: string | null; storage?: string | null }>) ?? [],
    notifiedAt: o.notifiedAt?.toISOString() ?? null,
    createdAt: o.createdAt?.toISOString() ?? null,
  };
}

// ─── GET /api/admin/orders ─── all orders, oldest first ──────────────────────
router.get("/admin/orders", requirePermission("orders"), async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string | undefined)?.trim();
    const rows = await db
      .select()
      .from(ordersTable)
      .where(status && status !== "all" ? eq(ordersTable.status, status) : undefined)
      .orderBy(asc(ordersTable.createdAt))
      .limit(1000);
    res.json({ orders: rows.map(formatAdminOrder) });
  } catch (err: any) {
    console.error("[GET /api/admin/orders]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

const statusSchema = z.object({
  status: z.enum([...ORDER_STATUSES] as [string, ...string[]]),
});

// ─── PATCH /api/admin/orders/:id/status ─── update status (+ SMS on confirm) ──
router.patch("/admin/orders/:id/status", requirePermission("orders"), validateBody(statusSchema), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }
  const { status } = req.body as z.infer<typeof statusSchema>;
  try {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    const [order] = await db
      .update(ordersTable)
      .set({ status })
      .where(eq(ordersTable.id, id))
      .returning();

    // On the first transition into "confirmed", notify the customer by SMS.
    let notification: { sent: boolean; reason?: string } | null = null;
    if (status === "confirmed" && !existing.notifiedAt) {
      const addr = (order.shippingAddress ?? {}) as Record<string, any>;
      const phone = String(addr.phone ?? "");
      const code = order.orderCode ?? `ME-${order.id}`;
      if (phone) {
        const settings = await getStoreSettings();
        notification = await sendSms(phone, orderConfirmationMessage(code, addr.name ?? ""), settings.smsSenderId ?? "");
        if (notification.sent) {
          await db.update(ordersTable).set({ notifiedAt: new Date() }).where(eq(ordersTable.id, id));
        }
      }
    }

    res.json({ ...formatAdminOrder(order), notification });
  } catch (err: any) {
    console.error("[PATCH /api/admin/orders/:id/status]", err?.message ?? err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

const paymentStatusSchema = z.object({
  paymentStatus: z.enum(["pending", "verified", "rejected"]),
});

// ─── PATCH /api/admin/orders/:id/payment ─── verify/reject manual payment ─────
router.patch("/admin/orders/:id/payment", requirePermission("orders"), validateBody(paymentStatusSchema), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }
  const { paymentStatus } = req.body as z.infer<typeof paymentStatusSchema>;
  try {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    const [order] = await db.update(ordersTable).set({ paymentStatus }).where(eq(ordersTable.id, id)).returning();

    // When marking a payment verified (first time), text the customer.
    let notification: { sent: boolean; reason?: string } | null = null;
    if (paymentStatus === "verified" && existing.paymentStatus !== "verified") {
      const addr = (order.shippingAddress ?? {}) as Record<string, any>;
      const phone = String(addr.phone ?? "");
      const code = order.orderCode ?? `ME-${order.id}`;
      if (phone) {
        const settings = await getStoreSettings();
        notification = await sendSms(phone, paymentVerifiedMessage(code, addr.name ?? ""), settings.smsSenderId ?? "");
      }
    }

    res.json({ ...formatAdminOrder(order), notification });
  } catch (err: any) {
    console.error("[PATCH /api/admin/orders/:id/payment]", err?.message ?? err);
    res.status(500).json({ error: "Failed to update payment status" });
  }
});

// ─── DELETE /api/admin/orders/:id ─── remove an order ─────────────────────────
router.delete("/admin/orders/:id", requirePermission("orders"), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }
  try {
    const [order] = await db.delete(ordersTable).where(eq(ordersTable.id, id)).returning();
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json({ id: order.id });
  } catch (err: any) {
    console.error("[DELETE /api/admin/orders/:id]", err?.message ?? err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  STORE SETTINGS
// ════════════════════════════════════════════════════════════════════════════

const methodSchema = z.object({
  enabled: z.boolean(),
  number: z.string().trim().max(30).optional().or(z.literal("")),
});

const settingsSchema = z.object({
  codChargeDhaka: z.coerce.number().min(0),
  codChargeOutside: z.coerce.number().min(0),
  payments: z.object({
    cod: z.object({ enabled: z.boolean() }),
    bkash: methodSchema,
    nagad: methodSchema,
    rocket: methodSchema,
  }),
  whatsappNumber: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  smsSenderId: z.string().trim().max(30).optional().or(z.literal("")),
  facebook: z.string().trim().max(300).optional().or(z.literal("")),
  instagram: z.string().trim().max(300).optional().or(z.literal("")),
  youtube: z.string().trim().max(300).optional().or(z.literal("")),
  aboutUs: z.string().max(20000).optional().or(z.literal("")),
  contactUs: z.string().max(20000).optional().or(z.literal("")),
});

// ─── GET /api/admin/settings ──────────────────────────────────────────────────
router.get("/admin/settings", requirePermission("settings"), async (_req: Request, res: Response) => {
  try {
    const s = await getStoreSettings();
    res.json({
      codChargeDhaka: parseFloat(s.codChargeDhaka as string),
      codChargeOutside: parseFloat(s.codChargeOutside as string),
      payments: s.payments,
      whatsappNumber: s.whatsappNumber ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      smsSenderId: s.smsSenderId ?? "",
      facebook: s.facebook ?? "",
      instagram: s.instagram ?? "",
      youtube: s.youtube ?? "",
      aboutUs: s.aboutUs ?? "",
      contactUs: s.contactUs ?? "",
    });
  } catch (err: any) {
    console.error("[GET /api/admin/settings]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// ─── PUT /api/admin/settings ──────────────────────────────────────────────────
router.put("/admin/settings", requirePermission("settings"), validateBody(settingsSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof settingsSchema>;
  try {
    await getStoreSettings(); // ensure row exists
    await db.update(storeSettingsTable).set({
      codChargeDhaka: String(body.codChargeDhaka),
      codChargeOutside: String(body.codChargeOutside),
      payments: {
        cod: { enabled: body.payments.cod.enabled },
        bkash: { enabled: body.payments.bkash.enabled, number: body.payments.bkash.number || "" },
        nagad: { enabled: body.payments.nagad.enabled, number: body.payments.nagad.number || "" },
        rocket: { enabled: body.payments.rocket.enabled, number: body.payments.rocket.number || "" },
      },
      whatsappNumber: body.whatsappNumber || null,
      email: body.email || null,
      address: body.address || null,
      smsSenderId: body.smsSenderId || "",
      facebook: body.facebook ?? "",
      instagram: body.instagram ?? "",
      youtube: body.youtube ?? "",
      aboutUs: body.aboutUs ?? "",
      contactUs: body.contactUs ?? "",
      updatedAt: new Date(),
    }).where(eq(storeSettingsTable.id, 1));
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[PUT /api/admin/settings]", err?.message ?? err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN MANAGEMENT (super admin only)
// ════════════════════════════════════════════════════════════════════════════

function publicAdmin(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    isSuperAdmin: isSuperAdminUser(u),
    permissions: effectivePermissions(u),
    createdAt: u.createdAt?.toISOString() ?? null,
  };
}

// ─── GET /api/admin/admins ─── list all admins ───────────────────────────────
router.get("/admin/admins", requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.isAdmin, true)).orderBy(desc(usersTable.createdAt));
    res.json({ admins: rows.map(publicAdmin) });
  } catch (err: any) {
    console.error("[GET /api/admin/admins]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load admins" });
  }
});

const createAdminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).default([]),
});

// ─── POST /api/admin/admins ─── create a new admin ───────────────────────────
router.post("/admin/admins", requireSuperAdmin, validateBody(createAdminSchema), async (req: Request, res: Response) => {
  const { name, email, password, permissions } = req.body as z.infer<typeof createAdminSchema>;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      // Promote an existing account to admin AND set the new password + name,
      // so the credentials the owner entered always work.
      const [updated] = await db.update(usersTable)
        .set({ name, passwordHash, isAdmin: true, verified: true, permissions })
        .where(eq(usersTable.email, email)).returning();
      res.status(200).json(publicAdmin(updated));
      return;
    }
    const [user] = await db.insert(usersTable).values({
      name, email, passwordHash, verified: true, isAdmin: true, isSuperAdmin: false, permissions,
    }).returning();
    res.status(201).json(publicAdmin(user));
  } catch (err: any) {
    console.error("[POST /api/admin/admins]", err?.message ?? err);
    res.status(500).json({ error: "Failed to create admin" });
  }
});

const updateAdminSchema = z.object({
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).default([]),
});

// ─── PATCH /api/admin/admins/:id ─── update permissions ──────────────────────
router.patch("/admin/admins/:id", requireSuperAdmin, validateBody(updateAdminSchema), async (req: Request & { adminUser?: any }, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid admin ID" }); return; }
  const { permissions } = req.body as z.infer<typeof updateAdminSchema>;
  try {
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!target) { res.status(404).json({ error: "Admin not found" }); return; }
    if (isSuperAdminUser(target)) { res.status(400).json({ error: "Can't change a super admin's permissions" }); return; }
    const [updated] = await db.update(usersTable).set({ permissions }).where(eq(usersTable.id, id)).returning();
    res.json(publicAdmin(updated));
  } catch (err: any) {
    console.error("[PATCH /api/admin/admins/:id]", err?.message ?? err);
    res.status(500).json({ error: "Failed to update admin" });
  }
});

// ─── DELETE /api/admin/admins/:id ─── remove an admin ────────────────────────
router.delete("/admin/admins/:id", requireSuperAdmin, async (req: Request & { userId?: number }, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid admin ID" }); return; }
  if (id === req.userId) { res.status(400).json({ error: "You can't remove yourself" }); return; }
  try {
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!target) { res.status(404).json({ error: "Admin not found" }); return; }
    if (isSuperAdminUser(target)) { res.status(400).json({ error: "Can't remove a super admin" }); return; }
    // Revoke admin access (keep the account, just demote).
    await db.update(usersTable).set({ isAdmin: false, permissions: [] }).where(eq(usersTable.id, id));
    res.json({ id });
  } catch (err: any) {
    console.error("[DELETE /api/admin/admins/:id]", err?.message ?? err);
    res.status(500).json({ error: "Failed to remove admin" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  FLASH SALE
// ════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/flash-sale ─── current config + product names ────────────
router.get("/admin/flash-sale", requirePermission("flash_sale"), async (_req: Request, res: Response) => {
  try {
    const s = await getStoreSettings();
    const fs = s.flashSale ?? { endsAt: null, items: [] };
    const ids = fs.items.map((i) => i.productId);
    const products = ids.length
      ? await db.select({ id: productsTable.id, name: productsTable.name, price: productsTable.price, image: productsTable.image }).from(productsTable)
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));
    res.json({
      endsAt: fs.endsAt,
      active: !!fs.endsAt && new Date(fs.endsAt).getTime() > Date.now() && fs.items.length > 0,
      items: fs.items.map((i) => {
        const p = byId.get(i.productId);
        return {
          productId: i.productId,
          percent: i.percent,
          name: p?.name ?? "(deleted)",
          price: p ? parseFloat(p.price as string) : 0,
          image: p?.image ?? "",
        };
      }),
    });
  } catch (err: any) {
    console.error("[GET /api/admin/flash-sale]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load flash sale" });
  }
});

const flashSaleSchema = z.object({
  hours: z.coerce.number().min(0.5).max(720),
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    percent: z.coerce.number().min(1).max(95),
  })).min(1).max(100),
});

// ─── PUT /api/admin/flash-sale ─── start/update the sale ─────────────────────
router.put("/admin/flash-sale", requirePermission("flash_sale"), validateBody(flashSaleSchema), async (req: Request, res: Response) => {
  const { hours, items } = req.body as z.infer<typeof flashSaleSchema>;
  try {
    await getStoreSettings();
    const endsAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await db.update(storeSettingsTable).set({ flashSale: { endsAt, items }, updatedAt: new Date() }).where(eq(storeSettingsTable.id, 1));
    res.json({ ok: true, endsAt });
  } catch (err: any) {
    console.error("[PUT /api/admin/flash-sale]", err?.message ?? err);
    res.status(500).json({ error: "Failed to start flash sale" });
  }
});

// ─── DELETE /api/admin/flash-sale ─── end the sale now ───────────────────────
router.delete("/admin/flash-sale", requirePermission("flash_sale"), async (_req: Request, res: Response) => {
  try {
    await getStoreSettings();
    await db.update(storeSettingsTable).set({ flashSale: { endsAt: null, items: [] }, updatedAt: new Date() }).where(eq(storeSettingsTable.id, 1));
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[DELETE /api/admin/flash-sale]", err?.message ?? err);
    res.status(500).json({ error: "Failed to end flash sale" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POLICIES
// ════════════════════════════════════════════════════════════════════════════

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `policy-${Date.now()}`;
}

// ─── GET /api/admin/policies ─── all policies (incl. disabled) ───────────────
router.get("/admin/policies", requirePermission("policies"), async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(policiesTable).orderBy(asc(policiesTable.sortOrder));
    res.json({ policies: rows.map((p) => ({ ...p, updatedAt: p.updatedAt?.toISOString() ?? null })) });
  } catch (err: any) {
    console.error("[GET /api/admin/policies]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load policies" });
  }
});

const policyInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().max(50000).optional().or(z.literal("")),
  enabled: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

// ─── POST /api/admin/policies ─── create ─────────────────────────────────────
router.post("/admin/policies", requirePermission("policies"), validateBody(policyInputSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof policyInputSchema>;
  try {
    let slug = slugify(body.title);
    const exists = await db.select({ id: policiesTable.id }).from(policiesTable).where(eq(policiesTable.slug, slug)).limit(1);
    if (exists.length) slug = `${slug}-${Date.now().toString().slice(-4)}`;
    const [row] = await db.insert(policiesTable).values({
      slug, title: body.title, content: body.content ?? "", enabled: body.enabled ?? true, sortOrder: body.sortOrder ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    console.error("[POST /api/admin/policies]", err?.message ?? err);
    res.status(500).json({ error: "Failed to create policy" });
  }
});

// ─── PUT /api/admin/policies/:id ─── update ──────────────────────────────────
router.put("/admin/policies/:id", requirePermission("policies"), validateBody(policyInputSchema), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid policy ID" }); return; }
  const body = req.body as z.infer<typeof policyInputSchema>;
  try {
    const [row] = await db.update(policiesTable).set({
      title: body.title, content: body.content ?? "", enabled: body.enabled ?? true,
      sortOrder: body.sortOrder ?? 0, updatedAt: new Date(),
    }).where(eq(policiesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Policy not found" }); return; }
    res.json(row);
  } catch (err: any) {
    console.error("[PUT /api/admin/policies/:id]", err?.message ?? err);
    res.status(500).json({ error: "Failed to update policy" });
  }
});

// ─── DELETE /api/admin/policies/:id ──────────────────────────────────────────
router.delete("/admin/policies/:id", requirePermission("policies"), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid policy ID" }); return; }
  try {
    const [row] = await db.delete(policiesTable).where(eq(policiesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Policy not found" }); return; }
    res.json({ id: row.id });
  } catch (err: any) {
    console.error("[DELETE /api/admin/policies/:id]", err?.message ?? err);
    res.status(500).json({ error: "Failed to delete policy" });
  }
});

export default router;
