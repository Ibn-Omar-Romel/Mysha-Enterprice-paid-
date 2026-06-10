/**
 * Single source of truth for coupons, shared by the /coupons route (validation)
 * and the /orders route (server-side enforcement). Keeping discount math on the
 * server prevents a client from claiming an arbitrary discount.
 */
export interface Coupon {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  description: string;
}

export const COUPONS: Coupon[] = [
  { code: "MYSHA10",   type: "percentage", value: 10,  minOrder: 0,    description: "10% off your order" },
  { code: "SAVE500",   type: "fixed",      value: 500, minOrder: 3000, description: "৳500 off on orders over ৳3,000" },
  { code: "WELCOME",   type: "fixed",      value: 200, minOrder: 0,    description: "৳200 welcome discount" },
  { code: "NEWUSER15", type: "percentage", value: 15,  minOrder: 1000, description: "15% off for new users" },
  { code: "FLASH20",   type: "percentage", value: 20,  minOrder: 5000, description: "20% flash sale discount" },
  { code: "TECH5",     type: "percentage", value: 5,   minOrder: 0,    description: "5% off all tech products" },
];

export interface CouponResult {
  valid: boolean;
  message: string;
  coupon?: Coupon;
  discountAmount: number;
  finalTotal: number;
}

/**
 * Validate a coupon against an order subtotal and compute the discount.
 * `orderTotal` is always the server-computed subtotal — never a client value.
 */
export function applyCoupon(code: unknown, orderTotal: number): CouponResult {
  const base = { discountAmount: 0, finalTotal: Math.max(0, orderTotal) };

  if (!code || typeof code !== "string") {
    return { valid: false, message: "Coupon code is required.", ...base };
  }

  const coupon = COUPONS.find((c) => c.code === code.trim().toUpperCase());
  if (!coupon) {
    return { valid: false, message: "Invalid coupon code. Please try again.", ...base };
  }

  if (orderTotal < coupon.minOrder) {
    return {
      valid: false,
      message: `This coupon requires a minimum order of ৳${coupon.minOrder.toLocaleString()}.`,
      ...base,
    };
  }

  const discountAmount =
    coupon.type === "percentage"
      ? Math.round((orderTotal * coupon.value) / 100)
      : Math.min(coupon.value, orderTotal);

  return {
    valid: true,
    message: `Coupon applied! You save ৳${discountAmount.toLocaleString()}.`,
    coupon,
    discountAmount,
    finalTotal: Math.max(0, orderTotal - discountAmount),
  };
}
