import { Router } from "express";
import { applyCoupon } from "../lib/coupons";

const router = Router();

router.post("/coupons/validate", (req, res) => {
  const { code, orderTotal } = req.body as { code?: unknown; orderTotal?: unknown };

  const total = parseFloat(String(orderTotal)) || 0;
  const result = applyCoupon(code, total);

  if (!result.valid) {
    const status = !code || typeof code !== "string" ? 400 : 200;
    return void res.status(status).json({ valid: false, message: result.message });
  }

  return void res.json({
    valid: true,
    code: result.coupon!.code,
    type: result.coupon!.type,
    value: result.coupon!.value,
    discountAmount: result.discountAmount,
    finalTotal: result.finalTotal,
    description: result.coupon!.description,
    message: result.message,
  });
});

export default router;
