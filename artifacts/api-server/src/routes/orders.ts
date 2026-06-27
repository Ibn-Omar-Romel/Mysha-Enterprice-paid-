import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@workspace/db";
import { ordersTable, cartItemsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { validateBody } from "../middlewares/validate";
import { applyCoupon } from "../lib/coupons";
import { getStoreSettings, publicSettings, isDhaka } from "../lib/settings";

const router = Router();

// ─── Unguessable order links ────────────────────────────────────────────────────
// Order URLs use a signed token "<id>-<signature>", where the signature is an
// HMAC of the id with the server secret. A plain or altered id won't verify, so
// orders can't be opened by guessing the number.
const ORDER_SECRET = process.env["SESSION_SECRET"] || "mysha-dev-secret";

function signOrderId(id: number): string {
  return crypto.createHmac("sha256", ORDER_SECRET).update(String(id)).digest("hex").slice(0, 24);
}

function orderToken(id: number): string {
  return `${id}-${signOrderId(id)}`;
}

function verifyOrderToken(token: string): number | null {
  const dash = token.lastIndexOf("-");
  if (dash <= 0) return null;
  const id = parseInt(token.slice(0, dash), 10);
  const sig = token.slice(dash + 1);
  if (Number.isNaN(id)) return null;
  const expected = signOrderId(id);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return id;
}

// ─── Validation ───────────────────────────────────────────────────────────────
// Bangladeshi mobile number: 11-digit local (01[3-9]XXXXXXXX) or with 880/+880.
function isValidBdPhone(s: string): boolean {
  const d = s.replace(/\D/g, "");
  return /^(?:880)?0?1[3-9]\d{8}$/.test(d);
}

const addressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30).refine(isValidBdPhone, "Enter a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX)"),
  street: z.string().trim().min(3).max(300),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().max(120).optional().default(""),
  zip: z.string().trim().max(20).optional().default(""),
  // Orders are only accepted within Bangladesh.
  country: z.string().trim().max(120).optional().default("Bangladesh"),
});

const createOrderSchema = z.object({
  shippingAddress: addressSchema,
  // "cod" = pay product on delivery (pay the COD charge online); "online" = pay full amount online.
  paymentMethod: z.enum(["cod", "online"]),
  // Mobile wallet used to send the (manual) payment.
  paymentChannel: z.enum(["bkash", "nagad", "rocket"]),
  transactionId: z.string().trim().min(4).max(60),
  senderNumber: z.string().trim().min(6).max(30).refine(isValidBdPhone, "Enter a valid Bangladeshi mobile number"),
  couponCode: z.string().trim().max(40).optional(),
});
type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Short, human-friendly, hard-to-guess order code, e.g. "ME-7K2Q9D".
function generateOrderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/O/1/I
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ME-${s}`;
}

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return {
    id: o.id,
    token: orderToken(o.id),
    orderCode: o.orderCode ?? `ME-${o.id}`,
    items: (o.items as Array<{ productId: number; name: string; price: number; quantity: number; image: string; brand: string; color?: string | null; storage?: string | null }>),
    total: parseFloat(o.total),
    deliveryCharge: parseFloat((o.deliveryCharge ?? "0") as string),
    status: o.status,
    createdAt: o.createdAt?.toISOString() ?? new Date().toISOString(),
    shippingAddress: o.shippingAddress,
    paymentMethod: o.paymentMethod,
    paymentChannel: o.paymentChannel ?? null,
    transactionId: o.transactionId ?? null,
    senderNumber: o.senderNumber ?? null,
    paymentStatus: o.paymentStatus ?? "pending",
  };
}

router.get("/orders", async (req, res) => {
  try {
    const rows = await db.select().from(ordersTable).where(eq(ordersTable.sessionId, req.session.id));
    res.json(rows.map(formatOrder).reverse());
  } catch (err) {
    req.log.error({ err }, "Error fetching orders");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.post("/orders", validateBody(createOrderSchema), async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, paymentChannel, transactionId, senderNumber, couponCode } =
      req.body as CreateOrderInput;

    // Bangladesh only.
    const country = (shippingAddress.country || "Bangladesh").trim();
    if (!/bangladesh/i.test(country)) {
      return void res.status(400).json({ error: "We currently deliver within Bangladesh only." });
    }
    shippingAddress.country = "Bangladesh";

    // Load store settings (charges + which methods are enabled).
    const settings = publicSettings(await getStoreSettings());

    // The chosen wallet must be enabled by the admin.
    const channelCfg = settings.payments[paymentChannel];
    if (!channelCfg?.enabled) {
      return void res.status(400).json({ error: `${paymentChannel} payments are currently unavailable.` });
    }
    if (paymentMethod === "cod" && !settings.payments.cod.enabled) {
      return void res.status(400).json({ error: "Cash on delivery is currently unavailable." });
    }

    const cartItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, req.session.id));
    if (cartItems.length === 0) return void res.status(400).json({ error: "Cart is empty" });

    const items = cartItems.map((i) => ({
      productId: i.productId,
      name: i.name,
      price: parseFloat(i.price),
      quantity: i.quantity,
      image: i.image,
      brand: i.brand,
      color: i.color ?? null,
      storage: i.storage ?? null,
    }));

    // Subtotal is always computed from the server-side cart — never trusted from
    // the client. The coupon (if any) is re-validated and applied here so the
    // stored total cannot be tampered with.
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const coupon = couponCode ? applyCoupon(couponCode, subtotal) : null;
    const discountedSubtotal = coupon && coupon.valid ? coupon.finalTotal : subtotal;

    // Delivery / COD charge based on city.
    const deliveryCharge = isDhaka(shippingAddress.city) ? settings.codChargeDhaka : settings.codChargeOutside;
    const total = discountedSubtotal + deliveryCharge;

    const [order] = await db.insert(ordersTable).values({
      sessionId: req.session.id,
      orderCode: generateOrderCode(),
      total: total.toString(),
      deliveryCharge: deliveryCharge.toString(),
      // New orders await admin confirmation; payment awaits manual verification.
      status: "pending",
      paymentStatus: "pending",
      shippingAddress,
      paymentMethod,
      paymentChannel,
      transactionId,
      senderNumber,
      items,
    }).returning();

    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, req.session.id));

    res.status(201).json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Error creating order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

// All orders for a phone number, matched on digits only (ignores spaces, +, etc.).
// NOTE: this is an OPEN lookup — anyone with the number can see these orders.
// Add SMS-code verification before real launch. Must be registered BEFORE
// /orders/:id so "by-phone" isn't parsed as an order id.
router.get("/orders/by-phone", async (req, res) => {
  try {
    const digits = String(req.query.phone ?? "").replace(/\D/g, "");
    if (digits.length < 6) {
      return void res.status(400).json({ error: "A valid phone number is required" });
    }
    const rows = await db
      .select()
      .from(ordersTable)
      .where(
        sql`regexp_replace(${ordersTable.shippingAddress} ->> 'phone', '\\D', '', 'g') = ${digits}`,
      );
    res.json(rows.map(formatOrder).reverse());
  } catch (err) {
    req.log.error({ err }, "Error fetching orders by phone");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Public order tracking by the human-friendly order code (e.g. ME-7K2Q9D).
// Registered before /orders/:id so "track" isn't parsed as an id.
router.get("/orders/track/:code", async (req, res) => {
  try {
    const code = String(req.params.code).trim().toUpperCase();
    if (!code) return void res.status(400).json({ error: "Order ID required" });
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderCode, code)).limit(1);
    if (!order) return void res.status(404).json({ error: "Order not found" });
    res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Error tracking order");
    res.status(500).json({ error: "Failed to track order" });
  }
});

// Look up a single order by its signed token. The signature must verify, so a
// plain or altered id (e.g. /orders/1, /orders/2) returns "not found".
router.get("/orders/:id", async (req, res) => {
  try {
    const id = verifyOrderToken(String(req.params.id));
    if (id === null) return void res.status(404).json({ error: "Order not found" });
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return void res.status(404).json({ error: "Order not found" });
    res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Error fetching order");
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default router;
