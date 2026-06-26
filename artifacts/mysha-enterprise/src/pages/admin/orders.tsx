import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, ORDER_STATUSES, type AdminOrder, type OrderStatus } from "@/lib/admin";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AdminGuard } from "./guard";
import { AdminNav } from "./nav";
import { toast } from "sonner";
import { format } from "date-fns";
import { ShoppingBag, Phone, MapPin, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-amber-50 text-amber-700",
  packed: "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

function OrderCard({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const update = useMutation({
    mutationFn: (status: OrderStatus) => adminApi.updateOrderStatus(order.id, status),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      if (res.notification) {
        if (res.notification.sent) toast.success("Status updated · confirmation SMS sent");
        else toast.success(`Status updated · SMS pending (${res.notification.reason ?? "gateway not set up"})`);
      } else {
        toast.success("Order status updated");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900">{order.orderCode}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status] ?? ""}`}>
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {order.createdAt ? format(new Date(order.createdAt), "PPp") : ""} · {order.paymentMethod}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatBDT(order.total)}</p>
            <p className="text-xs text-gray-400">{order.items.reduce((n, i) => n + i.quantity, 0)} item(s)</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600">
          <span className="font-medium text-gray-800">{order.customerName}</span>
          {order.customerPhone && (
            <span className="inline-flex items-center gap-1"><Phone size={13} className="text-gray-400" />{order.customerPhone}</span>
          )}
          <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-primary hover:underline ml-auto">
            {open ? <>Hide details <ChevronUp size={14} /></> : <>Details <ChevronDown size={14} /></>}
          </button>
        </div>

        {open && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><MapPin size={12} /> Shipping</p>
              <p className="text-sm text-gray-700">
                {order.shippingAddress.street}, {order.shippingAddress.city}
                {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}
                {order.shippingAddress.zip ? ` ${order.shippingAddress.zip}` : ""}
                {order.shippingAddress.country ? `, ${order.shippingAddress.country}` : ""}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
              <ul className="space-y-1.5">
                {order.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <img src={it.image} alt="" className="w-8 h-8 rounded border object-contain bg-white p-0.5 flex-shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-gray-700">{it.name}</span>
                    <span className="text-gray-500">×{it.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Status actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
          <span className="text-xs text-gray-500 mr-1">Set status:</span>
          {ORDER_STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={order.status === s ? "default" : "outline"}
              className="h-8 text-xs"
              disabled={order.status === s || update.isPending}
              onClick={() => update.mutate(s)}
            >
              {STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrdersInner() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", filter],
    queryFn: () => adminApi.listOrders(filter),
  });
  const orders = data?.orders ?? [];

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <AdminNav />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center"><ShoppingBag size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? "s" : ""} · oldest first</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.value ? "bg-primary text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border p-12 text-center text-gray-400">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No orders{filter !== "all" ? ` with status "${filter}"` : " yet"}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  return (
    <AdminGuard>
      <OrdersInner />
    </AdminGuard>
  );
}
