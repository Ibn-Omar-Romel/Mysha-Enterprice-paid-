import { Router, type Request, type Response } from "express";
import { db, policiesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

// ─── GET /api/policies ─── enabled policies for footer links ─────────────────
router.get("/policies", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({ slug: policiesTable.slug, title: policiesTable.title })
      .from(policiesTable)
      .where(eq(policiesTable.enabled, true))
      .orderBy(asc(policiesTable.sortOrder));
    res.json({ policies: rows });
  } catch (err: any) {
    console.error("[GET /api/policies]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load policies" });
  }
});

// ─── GET /api/policies/:slug ─── a single enabled policy page ────────────────
router.get("/policies/:slug", async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug).trim();
    const [row] = await db
      .select()
      .from(policiesTable)
      .where(and(eq(policiesTable.slug, slug), eq(policiesTable.enabled, true)))
      .limit(1);
    if (!row) return void res.status(404).json({ error: "Policy not found" });
    res.json({ slug: row.slug, title: row.title, content: row.content, updatedAt: row.updatedAt?.toISOString() ?? null });
  } catch (err: any) {
    console.error("[GET /api/policies/:slug]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load policy" });
  }
});

export default router;
