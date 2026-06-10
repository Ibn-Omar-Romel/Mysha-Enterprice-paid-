import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Truck, CheckCircle2, MapPin, Clock, Search,
  ChevronRight, Phone, MessageSquare, AlertCircle
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Link } from "wouter";

function OrderTrackingView({ orderId }: { orderId: number }) {
  const { data: order, isLoading, error } = useGetOrder(orderId, {
    query: { enabled: !!orderId }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Order Not Found</h3>
        <p className="text-gray-500 mb-6">
          We couldn't find an order with ID <strong>#{orderId}</strong>. Please check the order number and try again.
        </p>
        <Link href="/orders">
          <Button variant="outline">View My Orders</Button>
        </Link>
      </div>
    );
  }

  const status = order.status.toLowerCase();
  const steps = [
    {
      key: "placed",
      label: "Order Placed",
      desc: "Your order has been received and confirmed.",
      icon: <Package size={18} />,
      done: true,
      time: format(new Date(order.createdAt), "MMM dd, h:mm a"),
    },
    {
      key: "processing",
      label: "Processing",
      desc: "Your items are being packed and prepared for dispatch.",
      icon: <Clock size={18} />,
      done: ["processing", "shipped", "delivered"].includes(status),
      time: ["processing", "shipped", "delivered"].includes(status)
        ? format(addDays(new Date(order.createdAt), 1), "MMM dd, h:mm a")
        : null,
    },
    {
      key: "shipped",
      label: "Shipped",
      desc: "Your order is on its way to you.",
      icon: <Truck size={18} />,
      done: ["shipped", "delivered"].includes(status),
      time: ["shipped", "delivered"].includes(status)
        ? format(addDays(new Date(order.createdAt), 2), "MMM dd, h:mm a")
        : null,
    },
    {
      key: "delivered",
      label: "Delivered",
      desc: "Your order has been delivered successfully.",
      icon: <CheckCircle2 size={18} />,
      done: status === "delivered",
      time: status === "delivered"
        ? format(addDays(new Date(order.createdAt), 4), "MMM dd, h:mm a")
        : null,
    },
  ];

  const estimatedDelivery = addDays(new Date(order.createdAt), 4);
  const isCancelled = status === "cancelled";

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "processing": return <Badge className="bg-amber-100 text-amber-800 border-0 px-3 py-1">Processing</Badge>;
      case "shipped":    return <Badge className="bg-blue-100 text-blue-800 border-0 px-3 py-1">Shipped</Badge>;
      case "delivered":  return <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">Delivered</Badge>;
      case "cancelled":  return <Badge className="bg-red-100 text-red-800 border-0 px-3 py-1">Cancelled</Badge>;
      default:           return <Badge variant="outline" className="px-3 py-1">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b">
          <div>
            <p className="text-sm text-gray-500 mb-1">Tracking Order</p>
            <h2 className="text-2xl font-bold text-gray-900">#{order.id}</h2>
            <p className="text-sm text-gray-500 mt-1">Placed on {format(new Date(order.createdAt), "MMMM dd, yyyy")}</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            {getStatusBadge(order.status.toLowerCase())}
            {!isCancelled && status !== "delivered" && (
              <p className="text-sm text-gray-600">
                Estimated delivery: <span className="font-semibold text-gray-900">{format(estimatedDelivery, "MMM dd, yyyy")}</span>
              </p>
            )}
          </div>
        </div>

        {/* Timeline */}
        {!isCancelled ? (
          <div className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />
            <div className="space-y-6">
              {steps.map((step, idx) => (
                <div key={step.key} className="relative flex gap-4 pl-0">
                  <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    step.done
                      ? idx === steps.filter(s => s.done).length - 1
                        ? "bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-primary/20"
                        : "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}>
                    {step.icon}
                  </div>
                  <div className="pt-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`font-semibold ${step.done ? "text-gray-900" : "text-gray-400"}`}>
                        {step.label}
                      </p>
                      {step.time && (
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border">{step.time}</span>
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 ${step.done ? "text-gray-500" : "text-gray-300"}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="font-semibold text-red-800">Order Cancelled</p>
              <p className="text-sm text-red-600">This order was cancelled. If you were charged, a refund will be processed within 3-5 business days.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Items */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 bg-gray-50 border-b font-semibold text-gray-900">
            Order Items ({order.items.length})
          </div>
          <ul className="divide-y">
            {order.items.map((item, idx) => (
              <li key={idx} className="p-4 flex gap-3 items-center">
                <div className="w-14 h-14 bg-gray-50 border rounded-lg p-1.5 flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.productId}`} className="text-sm font-medium text-gray-900 hover:text-primary line-clamp-1">{item.name}</Link>
                  <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatBDT(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-primary text-lg">{formatBDT(order.total)}</span>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-primary" /> Delivery Address
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-900">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.phone}</p>
              <p className="pt-1">{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Phone size={16} className="text-primary" /> Need Help?
            </h3>
            <p className="text-sm text-gray-500 mb-4">Have questions about your delivery? Contact our support team.</p>
            <div className="flex flex-col gap-2">
              <a href="tel:+8801234567890" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                <Phone size={14} /> +880 1234-567890
              </a>
              <a href="#" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                <MessageSquare size={14} /> Live Chat Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const [, setLocation] = useLocation();
  const initialId = searchParams.get("id") || "";
  const [inputId, setInputId] = useState(initialId);
  const [trackedId, setTrackedId] = useState(initialId ? parseInt(initialId, 10) : 0);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(inputId, 10);
    if (!isNaN(id) && id > 0) {
      setTrackedId(id);
      setLocation(`/track?id=${id}`);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Track Form */}
        <div className="bg-white rounded-xl border p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <Truck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Track Your Order</h1>
              <p className="text-sm text-gray-500">Enter your order number to see real-time delivery updates</p>
            </div>
          </div>
          <form onSubmit={handleTrack} className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">#</span>
              <Input
                type="number"
                placeholder="Enter order number..."
                value={inputId}
                onChange={e => setInputId(e.target.value)}
                className="pl-7"
                min="1"
              />
            </div>
            <Button type="submit" disabled={!inputId || isNaN(parseInt(inputId))}>
              <Search size={16} className="mr-2" /> Track Order
            </Button>
          </form>
          <div className="flex items-center gap-6 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><ChevronRight size={12} /> Find order number in confirmation email</span>
            <span className="flex items-center gap-1"><ChevronRight size={12} /> Or check <Link href="/orders" className="text-primary hover:underline">My Orders</Link></span>
          </div>
        </div>

        {trackedId > 0 && <OrderTrackingView orderId={trackedId} />}

        {!trackedId && (
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: <Package size={24} />, title: "Order Placed", desc: "We send a confirmation email immediately after your order." },
              { icon: <Truck size={24} />, title: "Fast Shipping", desc: "Orders are typically dispatched within 24 hours of placement." },
              { icon: <CheckCircle2 size={24} />, title: "Safe Delivery", desc: "All packages are insured and delivered to your doorstep." },
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
