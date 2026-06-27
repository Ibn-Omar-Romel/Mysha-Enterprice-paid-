import { useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatBDT } from "@/lib/format";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Truck, CheckCircle2, MapPin, Clock, Search, Phone, Settings2, Box,
  AlertCircle, XCircle, ShieldCheck,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { format } from "date-fns";

interface TrackedOrder {
  id: number;
  orderCode: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  deliveryCharge: number;
  createdAt: string;
  shippingAddress: Record<string, any>;
  items: { productId: number; name: string; price: number; quantity: number; image: string }[];
}

// Customer-facing steps (cancelled is handled separately, never shown as a step).
const STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: Settings2 },
  { key: "packed", label: "Packed", icon: Box },
  { key: "delivered", label: "Delivered", icon: Truck },
];

function StatusBar({ status }: { status: string }) {
  const idx = STEPS.findIndex((s) => s.key === status);
  const currentIndex = idx === -1 ? 0 : idx;
  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex-1 flex flex-col items-center relative">
            {/* connector to next */}
            {i < STEPS.length - 1 && (
              <div className={`absolute top-5 left-1/2 w-full h-1 ${i < currentIndex ? "bg-primary" : "bg-gray-200"}`} />
            )}
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              done ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
            } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}>
              <Icon size={18} />
            </div>
            <span className={`mt-2 text-xs font-medium text-center ${done ? "text-gray-900" : "text-gray-400"}`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function OrderView({ code }: { code: string }) {
  const { data: settings } = useStoreSettings();
  const { data: order, isLoading, error } = useQuery<TrackedOrder>({
    queryKey: ["track-order", code],
    queryFn: async () => {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!code,
    retry: false,
  });

  if (isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;

  if (error || !order) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400"><AlertCircle size={28} /></div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Order Not Found</h3>
        <p className="text-gray-500">We couldn't find an order with ID <strong>{code}</strong>. Please check and try again.</p>
      </div>
    );
  }

  const cancelled = order.status === "cancelled";
  const wa = (settings?.contact.whatsapp || "8801633800157").replace(/\D/g, "");
  const paid = order.paymentStatus === "verified";

  return (
    <div className="space-y-6">
      {/* Header + status */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-sm text-gray-500">Order</p>
            <h2 className="text-2xl font-bold text-gray-900">{order.orderCode}</h2>
            <p className="text-sm text-gray-500 mt-1">Placed on {format(new Date(order.createdAt), "MMMM dd, yyyy 'at' h:mm a")}</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cancelled ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
              {cancelled ? "Cancelled" : STEPS.find((s) => s.key === order.status)?.label ?? order.status}
            </span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1 ${paid ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              <ShieldCheck size={12} /> Payment {paid ? "Verified" : order.paymentStatus === "rejected" ? "Rejected" : "Pending"}
            </span>
          </div>
        </div>

        {cancelled ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <XCircle size={22} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">This order was cancelled. If you paid online, contact us for a refund.</p>
          </div>
        ) : (
          <div className="pt-2 pb-1 px-2"><StatusBar status={order.status} /></div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Items */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 bg-gray-50 border-b font-semibold text-gray-900">Items ({order.items.length})</div>
          <ul className="divide-y">
            {order.items.map((item, idx) => (
              <li key={idx} className="p-4 flex gap-3 items-center">
                <div className="w-14 h-14 bg-gray-50 border rounded-lg p-1.5 flex-shrink-0"><img src={item.image} alt={item.name} className="w-full h-full object-contain" /></div>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.productId}`} className="text-sm font-medium text-gray-900 hover:text-primary line-clamp-1">{item.name}</Link>
                  <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatBDT(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="p-4 bg-gray-50 border-t space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Delivery</span><span>{formatBDT(order.deliveryCharge)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900"><span>Total</span><span className="text-primary text-lg">{formatBDT(order.total)}</span></div>
          </div>
        </div>

        {/* Delivery + help */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin size={16} className="text-primary" /> Delivery Address</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-900">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.phone}</p>
              <p className="pt-1">{order.shippingAddress.street}, {order.shippingAddress.city}{order.shippingAddress.zip ? ` ${order.shippingAddress.zip}` : ""}, Bangladesh</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Phone size={16} className="text-primary" /> Need Help?</h3>
            <p className="text-sm text-gray-500 mb-4">Questions about your order? Chat with us.</p>
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I'd like to ask about my order ${order.orderCode}.`)}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-semibold rounded-xl h-11 text-sm transition-colors">
              <FaWhatsapp size={16} /> Chat on WhatsApp
            </a>
            {settings?.contact.email && <a href={`mailto:${settings.contact.email}`} className="block text-center text-sm text-gray-500 hover:text-primary mt-3">{settings.contact.email}</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const [, setLocation] = useLocation();
  const initial = params.get("code") || params.get("id") || "";
  const [input, setInput] = useState(initial);
  const [tracked, setTracked] = useState(initial.trim().toUpperCase());

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (code) { setTracked(code); setLocation(`/track?code=${encodeURIComponent(code)}`); }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-xl border p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center"><Truck size={20} /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Track Your Order</h1>
              <p className="text-sm text-gray-500">Enter your Order ID (e.g. ME-7K2Q9D) to see its status</p>
            </div>
          </div>
          <form onSubmit={handleTrack} className="flex gap-3">
            <Input placeholder="Enter your Order ID…" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 uppercase" />
            <Button type="submit" disabled={!input.trim()}><Search size={16} className="mr-2" /> Track</Button>
          </form>
          <p className="text-xs text-gray-400 mt-3">Your Order ID is shown on the confirmation screen after you place an order.</p>
        </div>

        {tracked ? <OrderView code={tracked} /> : (
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: <Package size={24} />, title: "Order Placed", desc: "We receive your order and start verifying payment." },
              { icon: <Settings2 size={24} />, title: "Processing", desc: "Your items are confirmed, packed and prepared." },
              { icon: <CheckCircle2 size={24} />, title: "Delivered", desc: "Your order reaches your doorstep." },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
