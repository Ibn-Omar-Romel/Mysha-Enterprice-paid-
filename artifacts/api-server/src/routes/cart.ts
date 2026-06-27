import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { cartItemsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { validateBody } from "../middlewares/validate";

const router = Router();

const addItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999),
  // Optional variant selection chosen on the product page.
  color: z.string().trim().max(60).optional(),
  storage: z.string().trim().max(60).optional(),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0).max(999),
});

function buildCart(items: typeof cartItemsTable.$inferSelect[]) {
  const cartItems = items.map((i) => ({
    productId: i.productId,
    name: i.name,
    price: parseFloat(i.price),
    quantity: i.quantity,
    image: i.image,
    brand: i.brand,
    color: i.color ?? null,
    storage: i.storage ?? null,
  }));
  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  return { items: cartItems, total, itemCount };
}

router.get("/cart", async (req, res) => {
  try {
    const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, req.session.id));
    res.json(buildCart(items));
  } catch (err) {
    req.log.error({ err }, "Error fetching cart");
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

router.post("/cart/items", validateBody(addItemSchema), async (req, res) => {
  try {
    const { productId, quantity, color, storage } = req.body as z.infer<typeof addItemSchema>;
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) return void res.status(404).json({ error: "Product not found" });

    const existing = await db
      .select()
      .from(cartItemsTable)
      .where(and(eq(cartItemsTable.sessionId, req.session.id), eq(cartItemsTable.productId, productId)));

    if (existing.length > 0) {
      // Merge quantity and keep the most recently chosen variant.
      await db
        .update(cartItemsTable)
        .set({
          quantity: existing[0].quantity + quantity,
          color: color ?? existing[0].color ?? null,
          storage: storage ?? existing[0].storage ?? null,
        })
        .where(and(eq(cartItemsTable.sessionId, req.session.id), eq(cartItemsTable.productId, productId)));
    } else {
      await db.insert(cartItemsTable).values({
        sessionId: req.session.id,
        productId,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
        brand: product.brand,
        color: color ?? null,
        storage: storage ?? null,
      });
    }

    const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, req.session.id));
    res.json(buildCart(items));
  } catch (err) {
    req.log.error({ err }, "Error adding to cart");
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

router.put("/cart/items/:productId", validateBody(updateItemSchema), async (req, res) => {
  try {
    const productId = parseInt(String(req.params.productId), 10);
    const { quantity } = req.body as z.infer<typeof updateItemSchema>;
    if (quantity <= 0) {
      await db.delete(cartItemsTable).where(and(eq(cartItemsTable.sessionId, req.session.id), eq(cartItemsTable.productId, productId)));
    } else {
      await db.update(cartItemsTable).set({ quantity }).where(and(eq(cartItemsTable.sessionId, req.session.id), eq(cartItemsTable.productId, productId)));
    }
    const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, req.session.id));
    res.json(buildCart(items));
  } catch (err) {
    req.log.error({ err }, "Error updating cart item");
    res.status(500).json({ error: "Failed to update cart item" });
  }
});

router.delete("/cart/items/:productId", async (req, res) => {
  try {
    const productId = parseInt(String(req.params.productId), 10);
    await db.delete(cartItemsTable).where(and(eq(cartItemsTable.sessionId, req.session.id), eq(cartItemsTable.productId, productId)));
    const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, req.session.id));
    res.json(buildCart(items));
  } catch (err) {
    req.log.error({ err }, "Error removing from cart");
    res.status(500).json({ error: "Failed to remove from cart" });
  }
});

router.delete("/cart/clear", async (req, res) => {
  try {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, req.session.id));
    res.json({ items: [], total: 0, itemCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Error clearing cart");
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

export default router;
