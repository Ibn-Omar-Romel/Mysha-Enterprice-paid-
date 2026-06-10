import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { ordersTable, cartItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { validateBody } from "../middlewares/validate";
import { applyCoupon } from "../lib/coupons";

const router = Router();

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

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return {
    id: o.id,
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
      total: total.toString(),
      status: "confirmed",
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

router.get("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) return void res.status(400).json({ error: "Invalid order ID" });
    // Scope to the caller's own session so orders cannot be read by guessing IDs (IDOR).
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.sessionId, req.session.id)));
    if (!order) return void res.status(404).json({ error: "Order not found" });
    res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Error fetching order");
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default router;
