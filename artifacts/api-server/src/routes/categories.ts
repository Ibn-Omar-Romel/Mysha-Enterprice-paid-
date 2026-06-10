import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";

const router = Router();

router.get("/categories", async (req, res) => {
  try {
    const rows = await db.select().from(categoriesTable);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching categories");
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;
