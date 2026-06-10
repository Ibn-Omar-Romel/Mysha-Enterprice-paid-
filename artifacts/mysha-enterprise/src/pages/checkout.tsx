import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  useGetCart,
  useCreateOrder,
  getGetCartQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { formatBDT } from "@/lib/format";
import { OWNER_WHATSAPP, STORE_NAME } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Tag,
  X,
  Loader2,
  Truck,
  Package,
  MessageCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ── Cart helpers (same safe extraction as cart.tsx) ───────────────────────
type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  brand?: string | null;
};

function extractCartItems(cart: unknown): CartItem[] {
  if (!cart || typeof cart !== "object") return [];
  const c = cart as Record<string, unknown>;
  if (Array.isArray(c.items)) return c.items as CartItem[];
  if (Array.isArray(c.cartItems)) return c.cartItems as CartItem[];
  if (c.data && typeof c.data === "object") {
    const d = c.data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as CartItem[];
  }
  return [];
}

function extractCartTotal(cart: unknown): number {
  if (!cart || typeof cart !== "object") return 0;
  const c = cart as Record<string, unknown>;
  if (typeof c.total === "number") return c.total;
  if (c.data && typeof c.data === "object") {
    const d = c.data as Record<string, unknown>;
    if (typeof d.total === "number") return d.total;
  }
  return 0;
}

function extractCartItemCount(cart: unknown, items: CartItem[]): number {
  if (!cart || typeof cart !== "object") return items.length;
  const c = cart as Record<string, unknown>;
  if (typeof c.itemCount === "number") return c.itemCount;
  return items.reduce((s, i) => s + i.quantity, 0);
}

// ── Form schema ───────────────────────────────────────────────────────────
const checkoutSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  phone: z.string().min(11, "Valid phone number is required"),
  street: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default("Bangladesh"),
  paymentMethod: z.enum(["Cash on Delivery", "bKash", "Nagad", "Card"], {
    required_error: "Please select a payment method",
  }),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

interface CouponResult {
  valid: boolean;
  code?: string;
  discountAmount?: number;
  finalTotal?: number;
  description?: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────

// How many seconds to show the success screen before redirecting to home
const REDIRECT_DELAY_SECONDS = 2;

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { data: cart, isLoading } = useGetCart();
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();

  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "Bangladesh",
      paymentMethod: "Cash on Delivery",
    },
  });

  // ── Auto-redirect to home after successful order ──────────────────────────
  useEffect(() => {
    if (!isSuccess) return;

    // Start countdown display
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    // Hard redirect after delay — use window.location.replace as a failsafe
    // so the back button won't return to the checkout/success screen.
    const redirectTimer = setTimeout(() => {
      clearInterval(countdownTimer);
      setLocation("/");
      // Failsafe: if wouter setLocation doesn't navigate (e.g. base-path mismatch),
      // window.location.replace forces a full navigation to the homepage.
      setTimeout(() => {
        if (window.location.pathname !== "/") {
          window.location.replace("/");
        }
      }, 150);
    }, REDIRECT_DELAY_SECONDS * 1000);

    return () => {
      clearInterval(countdownTimer);
      clearTimeout(redirectTimer);
    };
  }, [isSuccess, setLocation]);

  // Safe extraction
  const cartItems    = extractCartItems(cart);
  const cartTotal    = extractCartTotal(cart);
  const cartItemCount = extractCartItemCount(cart, cartItems);

  useEffect(() => {
    if (!isLoading && cartItems.length === 0 && !isSuccess) {
      setLocation("/cart");
    }
  }, [isLoading, cartItems.length, isSuccess, setLocation]);

  const discount   = appliedCoupon?.discountAmount || 0;
  const finalTotal = Math.max(0, cartTotal - discount);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, orderTotal: cartTotal }),
      });
      const data: CouponResult = await res.json();
      if (data.valid) {
        setAppliedCoupon(data);
        toast.success(data.message, { icon: "🎉" });
      } else {
        toast.error(data.message);
        setAppliedCoupon(null);
      }
    } catch {
      toast.error("Failed to validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    toast("Coupon removed", { icon: "❌" });
  };

  const handleWhatsAppOrder = async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Please fill in all required fields before ordering via WhatsApp.");
      return;
    }
    const data = form.getValues();
    if (cartItems.length === 0) return;

    const itemLines = cartItems
      .map((item) => `• ${item.name} x${item.quantity} — ${formatBDT(item.price * item.quantity)}`)
      .join("\n");

    const msg = [
      `Hello! 👋 I'd like to place an order from *${STORE_NAME}*`,
      "",
      `📦 *My Order:*`,
      itemLines,
      "",
      appliedCoupon
        ? `💰 *Total: ${formatBDT(finalTotal)}* _(after ${appliedCoupon.code} discount)_`
        : `💰 *Total: ${formatBDT(finalTotal)}*`,
      "",
      `📍 *Ship to:*`,
      `${data.name}`,
      `${data.phone}`,
      `${data.street}, ${data.city}${data.zip ? ` ${data.zip}` : ""}, ${data.country}`,
      "",
      `💳 *Payment:* ${data.paymentMethod}`,
      "",
      `Please confirm my order. Thank you!`,
    ].join("\n");

    window.open(
      `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const onSubmit = (data: CheckoutValues) => {
    const { paymentMethod, ...addressData } = data;
    createOrder.mutate(
      { data: { shippingAddress: addressData, paymentMethod } },
      {
        onSuccess: (order) => {
          setOrderId(order.id);
          setIsSuccess(true);
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          window.scrollTo(0, 0);
        },
        onError: () => toast.error("Failed to place order. Please try again."),
      },
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
          <div className="w-full lg:w-96">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && !isSuccess) return null;

  // ── Success screen — auto-redirects to home ───────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="bg-white rounded-2xl border p-12 text-center max-w-lg w-full mx-4 shadow-sm">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Order Placed!</h2>
          <p className="text-gray-500 mb-2 text-lg">
            Thank you for shopping with{" "}
            <span className="text-primary font-semibold">Mysha Enterprise</span>.
          </p>
          <p className="text-gray-500 mb-6">
            Your order{" "}
            <span className="font-bold text-gray-800">#{orderId}</span> is
            confirmed and being processed.
          </p>

          {/* Countdown notice */}
          <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20 mb-6 text-left">
            <Truck size={20} className="text-primary flex-shrink-0" />
            <p className="text-sm text-primary">
              Returning to homepage in{" "}
              <strong>{countdown} second{countdown !== 1 ? "s" : ""}</strong>…
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 mb-8 text-left">
            <Truck size={20} className="text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              Estimated delivery: <strong>3–5 business days</strong>. You'll
              receive SMS updates about your delivery.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/orders/${orderId}`}>
              <Button
                variant="outline"
                className="w-full sm:w-auto h-12 px-8"
                onClick={() => setLocation(`/orders/${orderId}`)}
              >
                <Package size={16} className="mr-2" /> View Order
              </Button>
            </Link>
            <Button
              className="w-full sm:w-auto h-12 px-8"
              onClick={() => { setLocation("/"); window.location.replace("/"); }}
            >
              Go Home Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Checkout form ─────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Progress Steps */}
        <div className="flex items-center gap-3 mb-8 text-sm">
          <Link
            href="/cart"
            className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
              <CheckCircle2 size={12} />
            </span>
            Cart
          </Link>
          <div className="flex-1 h-px bg-primary" />
          <span className="font-semibold text-primary flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs">
              2
            </span>
            Checkout
          </span>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">
              3
            </span>
            Confirmation
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left — Forms */}
          <div className="flex-1">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
                id="checkout-form"
              >
                {/* Shipping */}
                <div className="bg-white p-6 rounded-xl border">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                      1
                    </span>
                    Shipping Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="01XXXXXXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="House 123, Road 4, Block A, Bashundhara"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Dhaka" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Postal Code{" "}
                            <span className="text-gray-400 font-normal">
                              (Optional)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="1212" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Payment */}
                <div className="bg-white p-6 rounded-xl border">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                      2
                    </span>
                    Payment Method
                  </h2>
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                          >
                            {[
                              {
                                value: "Cash on Delivery",
                                icon: <Banknote size={18} className="text-gray-500" />,
                                label: "Cash on Delivery",
                                sub: "Pay when you receive your order",
                              },
                              {
                                value: "bKash",
                                icon: (
                                  <div className="w-5 h-5 bg-[#e2136e] rounded text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                    b
                                  </div>
                                ),
                                label: "bKash",
                                sub: "Mobile banking payment",
                              },
                              {
                                value: "Nagad",
                                icon: (
                                  <div className="w-5 h-5 bg-[#f7941d] rounded text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                    N
                                  </div>
                                ),
                                label: "Nagad",
                                sub: "Digital financial service",
                              },
                              {
                                value: "Card",
                                icon: <CreditCard size={18} className="text-gray-500" />,
                                label: "Credit / Debit Card",
                                sub: "Visa, Mastercard, DBBL Nexus",
                              },
                            ].map((opt) => (
                              <FormItem
                                key={opt.value}
                                className="flex items-center space-x-3 space-y-0 p-4 border rounded-xl hover:bg-gray-50 transition-colors cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                              >
                                <FormControl>
                                  <RadioGroupItem value={opt.value} />
                                </FormControl>
                                <FormLabel className="flex-1 flex items-center gap-3 cursor-pointer">
                                  {opt.icon}
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {opt.label}
                                    </p>
                                    <p className="text-xs text-gray-500 font-normal">
                                      {opt.sub}
                                    </p>
                                  </div>
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </div>

          {/* Right — Order Summary */}
          <div className="w-full lg:w-[400px]">
            <div className="bg-white rounded-xl border p-6 sticky top-24 space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex gap-3 items-center">
                    <div className="w-14 h-14 bg-gray-50 border rounded-lg flex-shrink-0 p-1 flex items-center justify-center">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 flex-shrink-0">
                      {formatBDT(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Tag size={14} className="text-primary" /> Promo Code
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2
                        size={16}
                        className="text-green-600 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-green-800">
                          {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-green-600 truncate">
                          {appliedCoupon.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter promo code"
                      value={couponInput}
                      onChange={(e) =>
                        setCouponInput(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleApplyCoupon()
                      }
                      className="uppercase text-sm font-mono tracking-wider"
                      maxLength={20}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || couponLoading}
                      className="flex-shrink-0 border-primary text-primary hover:bg-primary hover:text-white"
                    >
                      {couponLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                )}
                {!appliedCoupon && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Try:{" "}
                    {["MYSHA10", "WELCOME", "SAVE500"].map((code, i) => (
                      <span key={code}>
                        <button
                          className="text-primary hover:underline font-mono"
                          onClick={() => setCouponInput(code)}
                        >
                          {code}
                        </button>
                        {i < 2 && ", "}
                      </span>
                    ))}
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cartItemCount} items)</span>
                  <span className="font-medium text-gray-900">
                    {formatBDT(cartTotal)}
                  </span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag size={12} /> Discount ({appliedCoupon.code})
                    </span>
                    <span className="font-semibold">−{formatBDT(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <Truck size={12} /> Shipping
                  </span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-base">
                    Total To Pay
                  </span>
                  <div className="text-right">
                    {appliedCoupon && (
                      <p className="text-xs text-gray-400 line-through">
                        {formatBDT(cartTotal)}
                      </p>
                    )}
                    <span className="font-bold text-primary text-2xl">
                      {formatBDT(finalTotal)}
                    </span>
                  </div>
                </div>
                {appliedCoupon && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center gap-2">
                    <CheckCircle2
                      size={14}
                      className="text-green-600 flex-shrink-0"
                    />
                    <p className="text-xs text-green-700 font-medium">
                      You're saving{" "}
                      <strong>{formatBDT(discount)}</strong> with code{" "}
                      {appliedCoupon.code}!
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                form="checkout-form"
                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />{" "}
                    Processing…
                  </>
                ) : (
                  `Place Order · ${formatBDT(finalTotal)}`
                )}
              </Button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 flex-shrink-0">
                  or order via
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <Button
                type="button"
                onClick={handleWhatsAppOrder}
                className="w-full h-12 text-base font-semibold bg-[#25D366] hover:bg-[#1ebe5a] text-white shadow-md hover:shadow-lg transition-all"
              >
                <MessageCircle size={18} className="mr-2" />
                Order via WhatsApp
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <ShieldCheck size={14} className="text-green-500" /> SSL
                secured · 256-bit encryption
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
