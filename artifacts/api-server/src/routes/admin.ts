import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, productsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { validateBody } from "../middlewares/validate";

const router = Router();

// Everything under /admin requires an authenticated admin user.
router.use("/admin", requireAdmin);

// ─── Validation ────────────────────────────────────────────────────────────────
const colorSchema = z.object({
  name: z.string().trim().min(1).max(60),
  hex: z.string().trim().max(20).optional().or(z.literal("")),
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
  emiAvailable: z.boolean().optional(),
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
    colors: body.colors ?? [],
    storageOptions: (body.storageOptions ?? []).map((s) => ({
      label: s.label,
      price: s.price,
      oldPrice: s.oldPrice ?? null,
      stock: s.stock ?? null,
    })),
    specifications: body.specifications ?? [],
    deliveryTime: body.deliveryTime || "3-5 Days",
    emiAvailable: body.emiAvailable ?? true,
    whatsappNumber: body.whatsappNumber || null,
  };
}

// ─── GET /api/admin/products ─── full list (incl. out of stock) for the panel ──
router.get("/admin/products", async (req: Request, res: Response) => {
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
router.get("/admin/products/:id", async (req: Request, res: Response) => {
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
router.post("/admin/products", validateBody(productInputSchema), async (req: Request, res: Response) => {
  try {
    const [row] = await db.insert(productsTable).values(toRow(req.body)).returning();
    res.status(201).json({ id: row.id });
  } catch (err: any) {
    console.error("[POST /api/admin/products]", err?.message ?? err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// ─── PUT /api/admin/products/:id ─── update ────────────────────────────────────
router.put("/admin/products/:id", validateBody(productInputSchema), async (req: Request, res: Response) => {
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
router.delete("/admin/products/:id", async (req: Request, res: Response) => {
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

export default router;
