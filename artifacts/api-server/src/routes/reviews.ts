import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { reviewsTable, usersTable, ordersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { validateBody } from "../middlewares/validate";

const router = Router();

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(2000),
});

router.get("/products/:id/reviews", async (req, res) => {
  const productId = parseInt(String(req.params.id), 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid product ID" }); return; }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.productId, productId))
    .orderBy(sql`${reviewsTable.createdAt} desc`);

  const total = reviews.length;
  const avgRating = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : 0;

  const breakdown = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(r => r.rating === stars).length;
    return { stars, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });

  res.json({ reviews, avgRating, total, breakdown });
});

// Posting a review requires authentication. The reviewer name comes from the
// logged-in account (not the request body), and the "verified" badge is only
// set when the user actually purchased the product — preventing fake reviews.
router.post("/products/:id/reviews", requireAuth, validateBody(createReviewSchema), async (req: any, res) => {
  const productId = parseInt(String(req.params.id), 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid product ID" }); return; }

  const { rating, comment } = req.body as z.infer<typeof createReviewSchema>;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  // Verified purchase = this session has an order containing the product.
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.sessionId, req.session.id));
  const purchased = orders.some((o) =>
    Array.isArray(o.items) &&
    (o.items as Array<{ productId: number }>).some((it) => it.productId === productId)
  );

  const [review] = await db.insert(reviewsTable).values({
    productId,
    reviewerName: user.name,
    rating,
    comment,
    verified: purchased,
  }).returning();

  res.status(201).json(review);
});

router.post("/reviews/:id/helpful", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid review ID" }); return; }

  const [review] = await db
    .update(reviewsTable)
    .set({ helpfulCount: sql`${reviewsTable.helpfulCount} + 1` })
    .where(eq(reviewsTable.id, id))
    .returning();

  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  res.json({ helpfulCount: review.helpfulCount });
});

export default router;
