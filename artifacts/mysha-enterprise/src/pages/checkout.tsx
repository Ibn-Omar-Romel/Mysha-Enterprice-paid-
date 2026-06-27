import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useGetCart, getGetCartQueryKey, getListOrdersQueryKey } from "@workspace/api-client-react";
import { formatBDT, isValidBdPhone } from "@/lib/format";
import { STORE_NAME } from "@/lib/config";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Banknote, ShieldCheck, CheckCircle2, Tag, X, Loader2, Truck, Package, MessageCircle, Smartphone, AlertTriangle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type CartItem = { productId: number; name: string; price: number; quantity: number; image: string; brand?: string | null };

function extractCartItems(cart: unknown): CartItem[] {
  if (!cart || typeof cart !== "object") return [];
  const c = cart as Record<string, unknown>;
  if (Array.isArray(c.items)) return c.items as CartItem[];
  if (Array.isArray(c.cartItems)) return c.cartItems as CartItem[];
  return [];
}
function extractCartTotal(cart: unknown): number {
  if (!cart || typeof cart !== "object") return 0;
  const c = cart as Record<string, unknown>;
  return typeof c.total === "number" ? c.total : 0;
}

interface CouponResult { valid: boolean; code?: string; discountAmount?: number; finalTotal?: number; description?: string; message: string }

type Channel = "bkash" | "nagad" | "rocket";
const CHANNEL_META: Record<Channel, { label: string; bg: string; letter: string }> = {
  bkash: { label: "bKash", bg: "#e2136e", letter: "b" },
  nagad: { label: "Nagad", bg: "#f7941d", letter: "N" },
  rocket: { label: "Rocket", bg: "#8a2be2", letter: "R" },
};

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { data: cart, isLoading } = useGetCart();
  const { data: settings, isLoading: settingsLoading } = useStoreSettings();
  const queryClient = useQueryClient();

  const [isSuccess, setIsSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{ id: number; token: string; code: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  // Form state
  const [form, setForm] = useState({ name: "", phone: "", street: "", city: "", zip: "" });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [channel, setChannel] = useState<Channel | "">("");
  const [transactionId, setTransactionId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const cartItems = extractCartItems(cart);
  const cartTotal = extractCartTotal(cart);
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (!isLoading && cartItems.length === 0 && !isSuccess) setLocation("/cart");
  }, [isLoading, cartItems.length, isSuccess, setLocation]);

  // Enabled channels + default selection
  const enabledChannels = useMemo<Channel[]>(() => {
    if (!settings) return [];
    return (["bkash", "nagad", "rocket"] as Channel[]).filter((c) => settings.payments[c]?.enabled);
  }, [settings]);

  useEffect(() => {
    if (enabledChannels.length && !channel) setChannel(enabledChannels[0]);
  }, [enabledChannels, channel]);

  useEffect(() => {
    if (settings && !settings.payments.cod.enabled && paymentMethod === "cod") setPaymentMethod("online");
  }, [settings, paymentMethod]);

  // Money math
  const discount = appliedCoupon?.discountAmount || 0;
  const discountedSubtotal = Math.max(0, cartTotal - discount);
  const inDhaka = /dhaka/i.test(form.city.trim());
  const deliveryCharge = settings ? (inDhaka ? settings.codChargeDhaka : settings.codChargeOutside) : 0;
  const orderTotal = discountedSubtotal + deliveryCharge;
  const amountToSendNow = paymentMethod === "online" ? orderTotal : deliveryCharge;
  const selectedNumber = channel && settings ? settings.payments[channel].number : "";

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, orderTotal: cartTotal }),
      });
      const data: CouponResult = await res.json();
      if (data.valid) { setAppliedCoupon(data); toast.success(data.message, { icon: "🎉" }); }
      else { toast.error(data.message); setAppliedCoupon(null); }
    } catch { toast.error("Failed to validate coupon."); }
    finally { setCouponLoading(false); }
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Please enter your full name.";
    if (!isValidBdPhone(form.phone)) e.phone = "Enter a valid Bangladeshi mobile number, e.g. 01XXXXXXXXX.";
    if (form.street.trim().length < 5) e.street = "Please enter your street address.";
    if (form.city.trim().length < 2) e.city = "Please enter your city.";
    if (!channel) e.channel = "Select a payment wallet (bKash/Nagad/Rocket).";
    if (transactionId.trim().length < 4) e.transactionId = "Enter the Transaction ID from your payment.";
    if (!isValidBdPhone(senderNumber)) e.senderNumber = "Enter the valid Bangladeshi number you paid from.";
    return e;
  };

  const handlePlaceOrder = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error(Object.values(errs)[0]); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: { name: form.name, phone: form.phone, street: form.street, city: form.city, state: "", zip: form.zip, country: "Bangladesh" },
          paymentMethod, paymentChannel: channel, transactionId: transactionId.trim(), senderNumber: senderNumber.trim(),
          couponCode: appliedCoupon?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to place order."); return; }
      setPlacedOrder({ id: data.id, token: data.token ?? String(data.id), code: data.orderCode ?? `#${data.id}` });
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      window.scrollTo(0, 0);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  };

  const handleWhatsAppOrder = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error(Object.values(errs)[0]); return; }
    const itemLines = cartItems.map((i) => `• ${i.name} x${i.quantity} — ${formatBDT(i.price * i.quantity)}`).join("\n");
    const msg = [
      `Hello! I'd like to order from *${STORE_NAME}*`, "", `*Order:*`, itemLines, "",
      `Delivery: ${formatBDT(deliveryCharge)}`, `*Total: ${formatBDT(orderTotal)}*`, "",
      `*Ship to:* ${form.name}, ${form.phone}`, `${form.street}, ${form.city}${form.zip ? ` ${form.zip}` : ""}, Bangladesh`, "",
      `*Payment:* ${paymentMethod === "cod" ? "Cash on Delivery" : "Online"} via ${channel ? CHANNEL_META[channel].label : ""}`,
      `TrxID: ${transactionId}`,
    ].join("\n");
    const wa = (settings?.contact.whatsapp || "8801633800157").replace(/\D/g, "");
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading || settingsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>
        <div className="flex flex-col lg:flex-row gap-8">
          <Skeleton className="h-[600px] flex-1 rounded-xl" />
          <Skeleton className="h-96 w-full lg:w-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && !isSuccess) return null;

  if (isSuccess && placedOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="bg-white rounded-2xl border p-12 text-center max-w-lg w-full mx-4 shadow-sm">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Order Placed!</h2>
          <p className="text-gray-500 mb-2 text-lg">Thank you for shopping with <span className="text-primary font-semibold">Mysha Enterprise</span>.</p>
          <p className="text-gray-500 mb-6">Your order <span className="font-bold text-gray-800">{placedOrder.code}</span> is received.</p>
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 mb-8 text-left">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">We're verifying your payment. Once confirmed, we'll process and ship your order. You'll get an update by SMS/WhatsApp.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/orders/${placedOrder.token}`}>
              <Button variant="outline" className="w-full sm:w-auto h-12 px-8"><Package size={16} className="mr-2" /> View Order</Button>
            </Link>
            <Button className="w-full sm:w-auto h-12 px-8" onClick={() => { setLocation("/"); window.location.replace("/"); }}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const noMethods = settings && !settings.payments.cod.enabled && enabledChannels.length === 0;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left — form */}
          <div className="flex-1 space-y-6">
            {/* Shipping */}
            <div className="bg-white p-6 rounded-xl border">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">1</span>
                Shipping Information
              </h2>
              <p className="text-xs text-gray-400 mb-5 ml-9">Delivery within Bangladesh only.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Full Name</Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="John Doe" className={errors.name ? "border-red-400 focus-visible:ring-red-400" : ""} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label className="mb-1.5 block">Phone Number</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" className={errors.phone ? "border-red-400 focus-visible:ring-red-400" : ""} />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-1.5 block">Street Address</Label>
                  <Input value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="House 123, Road 4, Block A" className={errors.street ? "border-red-400 focus-visible:ring-red-400" : ""} />
                  {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
                </div>
                <div>
                  <Label className="mb-1.5 block">City</Label>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Dhaka" className={errors.city ? "border-red-400 focus-visible:ring-red-400" : ""} />
                  {errors.city ? <p className="text-xs text-red-500 mt-1">{errors.city}</p> : <p className="text-xs text-gray-400 mt-1">{form.city.trim() ? (inDhaka ? "Within Dhaka" : "Outside Dhaka") + ` — delivery ${formatBDT(deliveryCharge)}` : "Type your city to see the delivery charge"}</p>}
                </div>
                <div><Label className="mb-1.5 block">Postal Code <span className="text-gray-400 font-normal">(Optional)</span></Label><Input value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="1216" /></div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white p-6 rounded-xl border">
              <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">2</span>
                Payment Method
              </h2>

              {noMethods ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">No payment methods are available right now. Please contact us to order.</div>
              ) : (
                <>
                  {/* COD vs Online */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {settings?.payments.cod.enabled && (
                      <button type="button" onClick={() => setPaymentMethod("cod")}
                        className={`flex items-start gap-3 p-4 border rounded-xl text-left transition-colors ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-gray-200 hover:bg-gray-50"}`}>
                        <Banknote size={20} className="text-gray-500 mt-0.5" />
                        <div><p className="font-semibold text-gray-900">Cash on Delivery</p><p className="text-xs text-gray-500">Pay product cash on delivery. Pay only the delivery charge online now.</p></div>
                      </button>
                    )}
                    {enabledChannels.length > 0 && (
                      <button type="button" onClick={() => setPaymentMethod("online")}
                        className={`flex items-start gap-3 p-4 border rounded-xl text-left transition-colors ${paymentMethod === "online" ? "border-primary bg-primary/5" : "border-gray-200 hover:bg-gray-50"}`}>
                        <Smartphone size={20} className="text-gray-500 mt-0.5" />
                        <div><p className="font-semibold text-gray-900">Pay Online (Full)</p><p className="text-xs text-gray-500">Pay the full amount now via bKash/Nagad/Rocket.</p></div>
                      </button>
                    )}
                  </div>

                  {/* Channel selection */}
                  {enabledChannels.length > 0 && (
                    <>
                      <Label className="mb-2 block text-sm">Pay with</Label>
                      <div className="flex flex-wrap gap-2 mb-1">
                        {enabledChannels.map((c) => (
                          <button key={c} type="button" onClick={() => { setChannel(c); setErrors((e) => ({ ...e, channel: "" })); }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${channel === c ? "border-primary bg-primary/5 font-medium" : "border-gray-200 hover:bg-gray-50"}`}>
                            <span className="w-5 h-5 rounded text-white flex items-center justify-center text-[10px] font-bold" style={{ background: CHANNEL_META[c].bg }}>{CHANNEL_META[c].letter}</span>
                            {CHANNEL_META[c].label}
                          </button>
                        ))}
                      </div>
                      {errors.channel && <p className="text-xs text-red-500 mb-3">{errors.channel}</p>}
                      <div className="mb-1" />

                      {/* Instructions */}
                      {channel && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-sm">
                          <p className="text-gray-700 mb-2">
                            Send <span className="font-bold text-primary">{formatBDT(amountToSendNow)}</span> to our {CHANNEL_META[channel].label} number:
                          </p>
                          <p className="text-lg font-bold text-gray-900 tracking-wide mb-1">{selectedNumber || "(number not set — contact us)"}</p>
                          <p className="text-xs text-gray-500">{paymentMethod === "cod" ? "This is the delivery charge. Pay the product price in cash when it arrives." : "This is the full order amount."} After sending, enter the Transaction ID below.</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="mb-1.5 block">Transaction ID (TrxID)</Label>
                          <Input value={transactionId} onChange={(e) => { setTransactionId(e.target.value.toUpperCase()); setErrors((er) => ({ ...er, transactionId: "" })); }} placeholder="e.g. 9AB3C2D1XY" className={errors.transactionId ? "border-red-400 focus-visible:ring-red-400" : ""} />
                          {errors.transactionId && <p className="text-xs text-red-500 mt-1">{errors.transactionId}</p>}
                        </div>
                        <div>
                          <Label className="mb-1.5 block">Your {channel ? CHANNEL_META[channel].label : "wallet"} number</Label>
                          <Input value={senderNumber} onChange={(e) => { setSenderNumber(e.target.value); setErrors((er) => ({ ...er, senderNumber: "" })); }} placeholder="01XXXXXXXXX" className={errors.senderNumber ? "border-red-400 focus-visible:ring-red-400" : ""} />
                          {errors.senderNumber && <p className="text-xs text-red-500 mt-1">{errors.senderNumber}</p>}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right — summary */}
          <div className="w-full lg:w-[400px]">
            <div className="bg-white rounded-xl border p-6 sticky top-24 space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex gap-3 items-center">
                    <div className="w-14 h-14 bg-gray-50 border rounded-lg flex-shrink-0 p-1 flex items-center justify-center">
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 flex-shrink-0">{formatBDT(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Tag size={14} className="text-primary" /> Promo Code</Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-green-800">{appliedCoupon.code}</p>
                    </div>
                    <button onClick={() => { setAppliedCoupon(null); setCouponInput(""); }} className="text-gray-400 hover:text-red-500 p-1"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input placeholder="Enter promo code" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} className="uppercase text-sm font-mono" maxLength={20} />
                    <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={!couponInput.trim() || couponLoading} className="flex-shrink-0 border-primary text-primary hover:bg-primary hover:text-white">
                      {couponLoading ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal ({itemCount} items)</span><span className="font-medium text-gray-900">{formatBDT(cartTotal)}</span></div>
                {appliedCoupon && <div className="flex justify-between text-green-600"><span>Discount</span><span className="font-semibold">−{formatBDT(discount)}</span></div>}
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><Truck size={12} /> Delivery {form.city.trim() ? (inDhaka ? "(Dhaka)" : "(Outside)") : ""}</span>
                  <span className="font-medium text-gray-900">{formatBDT(deliveryCharge)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-base">Order Total</span>
                  <span className="font-bold text-primary text-2xl">{formatBDT(orderTotal)}</span>
                </div>
                {paymentMethod === "cod" ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between"><span>Pay now (online)</span><span className="font-semibold text-gray-900">{formatBDT(deliveryCharge)}</span></div>
                    <div className="flex justify-between"><span>Pay on delivery (cash)</span><span className="font-semibold text-gray-900">{formatBDT(discountedSubtotal)}</span></div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    <div className="flex justify-between"><span>Pay now (online)</span><span className="font-semibold text-gray-900">{formatBDT(orderTotal)}</span></div>
                  </div>
                )}
              </div>

              <Button onClick={handlePlaceOrder} className="w-full h-12 text-base font-semibold" disabled={submitting || !!noMethods}>
                {submitting ? <><Loader2 size={18} className="mr-2 animate-spin" /> Placing order…</> : `Place Order · Pay ${formatBDT(amountToSendNow)} now`}
              </Button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" />
              </div>
              <Button type="button" onClick={handleWhatsAppOrder} className="w-full h-12 text-base font-semibold bg-[#25D366] hover:bg-[#1ebe5a] text-white">
                <MessageCircle size={18} className="mr-2" /> Order via WhatsApp
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400"><ShieldCheck size={14} className="text-green-500" /> Your details are kept secure</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
