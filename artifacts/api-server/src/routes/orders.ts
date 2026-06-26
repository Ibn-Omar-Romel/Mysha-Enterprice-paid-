import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@workspace/db";
import { ordersTable, cartItemsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { validateBody } from "../middlewares/validate";
import { applyCoupon } from "../lib/coupons";

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
const addressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  street: z.string().trim().min(3).max(300),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().max(120).optional().default(""),
  zip: z.string().trim().max(20).optional().default(""),
  country: z.string().trim().min(2).max(120).default("Bangladesh"),
});

const createOrderSchema = z.object({
  shippingAddress: addressSchema,
  paymentMethod: z.enum(["Cash on Delivery", "bKash", "Nagad", "Card"]),
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
    items: (o.items as Array<{ productId: number; name: string; price: number; quantity: number; image: string; brand: string }>),
    total: parseFloat(o.total),
    status: o.status,
    createdAt: o.createdAt?.toISOString() ?? new Date().toISOString(),
    shippingAddress: o.shippingAddress,
    paymentMethod: o.paymentMethod,
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
    const { shippingAddress, paymentMethod, couponCode } = req.body as CreateOrderInput;

    const cartItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, req.session.id));
    if (cartItems.length === 0) return void res.status(400).json({ error: "Cart is empty" });

    const items = cartItems.map((i) => ({
      productId: i.productId,
      name: i.name,
      price: parseFloat(i.price),
      quantity: i.quantity,
      image: i.image,
      brand: i.brand,
    }));

    // Subtotal is always computed from the server-side cart — never trusted from
    // the client. The coupon (if any) is re-validated and applied here so the
    // stored total cannot be tampered with.
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const coupon = couponCode ? applyCoupon(couponCode, subtotal) : null;
    const total = coupon && coupon.valid ? coupon.finalTotal : subtotal;

    const [order] = await db.insert(ordersTable).values({
      sessionId: req.session.id,
      orderCode: generateOrderCode(),
      total: total.toString(),
      // New orders await admin confirmation.
      status: "pending",
      shippingAddress,
      paymentMethod,
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
