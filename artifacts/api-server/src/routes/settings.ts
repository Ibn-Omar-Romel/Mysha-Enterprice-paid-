import { Router, type Request, type Response } from "express";
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

export default router;
