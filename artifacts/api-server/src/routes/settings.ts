import { Router, type Request, type Response } from "express";
import { db, productsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { getStoreSettings, publicSettings } from "../lib/settings";

const router = Router();

// ─── GET /api/settings ─── public store config (charges, methods, contact) ────
// Numbers are intentionally public — customers need to see the wallet number to
// send payment. No secrets are stored here.
router.get("/settings", async (_req: Request, res: Response) => {
  try {
    const s = await getStoreSettings();
    res.json(publicSettings(s));
  } catch (err: any) {
    console.error("[GET /api/settings]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// ─── GET /api/flash-sale ─── active flash sale for the storefront ────────────
router.get("/flash-sale", async (_req: Request, res: Response) => {
  try {
    const s = await getStoreSettings();
    const fs = s.flashSale ?? { endsAt: null, items: [] };
    const active = !!fs.endsAt && new Date(fs.endsAt).getTime() > Date.now() && fs.items.length > 0;
    if (!active) return void res.json({ active: false, endsAt: null, items: [] });

    const ids = fs.items.map((i) => i.productId);
    const rows = await db.select().from(productsTable).where(inArray(productsTable.id, ids));
    const byId = new Map(rows.map((p) => [p.id, p]));

    const items = fs.items
      .map((i) => {
        const p = byId.get(i.productId);
        if (!p) return null;
        const price = parseFloat(p.price as string);
        const salePrice = Math.round(price * (1 - i.percent / 100));
        return {
          id: p.id,
          name: p.name,
          image: p.image,
          brand: p.brand,
          price,
          salePrice,
          percent: i.percent,
        };
      })
      .filter(Boolean);

    res.json({ active: true, endsAt: fs.endsAt, items });
  } catch (err: any) {
    console.error("[GET /api/flash-sale]", err?.message ?? err);
    res.status(500).json({ error: "Failed to load flash sale" });
  }
});

export default router;
