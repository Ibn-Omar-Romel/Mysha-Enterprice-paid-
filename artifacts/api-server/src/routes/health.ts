import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  // Deploy marker: lets us confirm which code version is actually live.
  res.json({ ...data, version: "signup-fix-1" });
});

export default router;
