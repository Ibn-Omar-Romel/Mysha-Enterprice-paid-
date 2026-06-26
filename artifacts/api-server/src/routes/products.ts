import { Router, Request, Response } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, gte, lte, and, or, asc, desc, sql } from "drizzle-orm";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeInt(v: unknown, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function safeFloat(v: unknown): number | null {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Map DB row → frontend-friendly shape
function toProduct(row: typeof productsTable.$inferSelect) {
  return {
    id:             row.id,
    name:           row.name,
    price:          parseFloat(row.price as string),
    oldPrice:       row.oldPrice  != null ? parseFloat(row.oldPrice as string) : null,
    cashPrice:      row.cashPrice != null ? parseFloat(row.cashPrice as string) : null,
    discount:       row.discount  ?? 0,
    image:          row.image,
    images:         Array.isArray(row.images) ? row.images : [],
    rating:         row.rating    != null ? parseFloat(row.rating as string) : 4.5,
    tag:            row.tag       ?? null,
    category:       row.category,
    brand:          row.brand,
    model:          row.model     ?? null,
    code:           row.code      ?? null,
    inStock:        row.inStock   ?? true,
    description:    row.description ?? "",
    colors:         Array.isArray(row.colors) ? row.colors : [],
    storageOptions: Array.isArray(row.storageOptions) ? row.storageOptions : [],
    specifications: Array.isArray(row.specifications) ? row.specifications : [],
    deliveryTime:   row.deliveryTime ?? "3-5 Days",
    whatsappNumber: row.whatsappNumber ?? null,
    createdAt:      row.createdAt?.toISOString() ?? null,
  };
}

// ─── GET /api/products/featured ───────────────────────────────────────────────
// Must be registered BEFORE /:id so Express does not match "featured" as an id.
router.get("/products/featured", async (_req: Request, res: Response) => {
  try {
    // Return the 20 newest in-stock products and let the frontend slice them
    // into deals / selling / arrival tabs. Keeps the route simple and avoids
    // needing extra columns (is_featured, is_new, etc.) that do not exist.
    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.inStock, true))
      .orderBy(desc(productsTable.createdAt))
      .limit(20);

    const products = rows.map(toProduct);

    // The frontend FeaturedProducts type expects { trends, deals, selling, arrival }.
    // We divide the 20 products across the four sections so every tab shows something.
    const chunk = (arr: typeof products, from: number, to: number) =>
      arr.slice(from, Math.min(to, arr.length));

    return res.json({
      trends:  chunk(products, 0,  5),
      deals:   chunk(products, 0,  5),
      selling: chunk(products, 5,  10),
      arrival: chunk(products, 10, 15),
    });
  } catch (err: any) {
    console.error("[GET /api/products/featured]", err?.message ?? err);
    return res.status(500).json({ error: "Failed to fetch featured products" });
  }
});

// ─── GET /api/products ────────────────────────────────────────────────────────
// Query params: category, tag, brand (comma-sep), minPrice, maxPrice,
//               sort, page, limit, search/q
router.get("/products", async (req: Request, res: Response) => {
  try {
    const q        = req.query as Record<string, string | undefined>;
    const category = q.category?.trim();
    const tag      = q.tag?.trim();
    const brand    = q.brand?.trim();
    const keyword  = (q.search ?? q.q ?? "").trim();
    const minPrice = safeFloat(q.minPrice);
    const maxPrice = safeFloat(q.maxPrice);
    const page     = safeInt(q.page,  1);
    const limit    = safeInt(q.limit, 24);
    const offset   = (page - 1) * limit;
    const sort     = q.sort ?? "newest";

    // ── Build WHERE ────────────────────────────────────────────────────────
    const conds = [];

    if (category && category !== "all") {
      conds.push(ilike(productsTable.category, category));
    }

    if (tag) {
      conds.push(ilike(productsTable.tag, tag));
    }

    if (brand) {
      const brands = brand
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);
      if (brands.length === 1) {
        conds.push(ilike(productsTable.brand, brands[0]));
      } else if (brands.length > 1) {
        conds.push(or(...brands.map((b) => ilike(productsTable.brand, b)))!);
      }
    }

    if (minPrice !== null) {
      conds.push(gte(sql`${productsTable.price}::numeric`, sql`${minPrice}`));
    }
    if (maxPrice !== null) {
      conds.push(lte(sql`${productsTable.price}::numeric`, sql`${maxPrice}`));
    }

    if (keyword) {
      conds.push(
        or(
          ilike(productsTable.name,        `%${keyword}%`),
          ilike(productsTable.description, `%${keyword}%`),
          ilike(productsTable.brand,       `%${keyword}%`),
          ilike(productsTable.tag,         `%${keyword}%`),
        )!
      );
    }

    const where = conds.length > 0 ? and(...conds) : undefined;

    // ── Sort ───────────────────────────────────────────────────────────────
    const orderBy = (() => {
      switch (sort) {
        case "price-asc":
        case "price_asc":
          return asc(sql`${productsTable.price}::numeric`);
        case "price-desc":
        case "price_desc":
          return desc(sql`${productsTable.price}::numeric`);
        case "rating":
          return desc(sql`${productsTable.rating}::numeric`);
        default: // newest
          return desc(productsTable.createdAt);
      }
    })();

    // ── Count ──────────────────────────────────────────────────────────────
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(where);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    // ── Data ───────────────────────────────────────────────────────────────
    const rows = await db
      .select()
      .from(productsTable)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return res.json({
      products:   rows.map(toProduct),
      pagination: { page, limit, total, totalPages },
    });
  } catch (err: any) {
    console.error("[GET /api/products]", err?.message ?? err);
    return res.status(500).json({
      error:   "Failed to fetch products",
      details: process.env.NODE_ENV !== "production" ? err?.message : undefined,
    });
  }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get("/products/:id", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }
  try {
    const [row] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id));

    if (!row) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json(toProduct(row));
  } catch (err: any) {
    console.error("[GET /api/products/:id]", err?.message ?? err);
    return res.status(500).json({ error: "Failed to fetch product" });
  }
});

export default router;
