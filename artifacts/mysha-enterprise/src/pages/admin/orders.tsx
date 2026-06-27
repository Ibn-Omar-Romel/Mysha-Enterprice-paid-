import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, ORDER_STATUSES, type AdminOrder, type OrderStatus } from "@/lib/admin";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AdminGuard } from "./guard";
import { AdminNav } from "./nav";
import { toast } from "sonner";
import { format } from "date-fns";
import { ShoppingBag, Phone, MapPin, ChevronDown, ChevronUp, Trash2, Check, X, CreditCard } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", processing: "Processing", packed: "Packed", delivered: "Delivered", cancelled: "Cancelled",
};
const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-700", confirmed: "bg-blue-50 text-blue-700", processing: "bg-amber-50 text-amber-700",
  packed: "bg-purple-50 text-purple-700", delivered: "bg-green-50 text-green-700", cancelled: "bg-red-50 text-red-700",
};
const PAY_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700", verified: "bg-green-50 text-green-700", rejected: "bg-red-50 text-red-700",
};
const CHANNEL_LABELS: Record<string, string> = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket" };

const FILTERS = [{ value: "all", label: "All" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))];

function OrderCard({ order, onDelete }: { order: AdminOrder; onDelete: (o: AdminOrder) => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

  const updateStatus = useMutation({
    mutationFn: (status: OrderStatus) => adminApi.updateOrderStatus(order.id, status),
    onSuccess: (res) => {
      invalidate();
      if (res.notification) toast.success(res.notification.sent ? "Status updated · confirmation SMS sent" : `Status updated · SMS pending (${res.notification.reason ?? "gateway not set up"})`);
      else toast.success("Order status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePayment = useMutation({
    mutationFn: (paymentStatus: "verified" | "rejected") => adminApi.updatePaymentStatus(order.id, paymentStatus),
    onSuccess: () => { invalidate(); toast.success("Payment status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const isCod = order.paymentMethod === "cod";
  const onlineAmount = isCod ? order.deliveryCharge : order.total;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900">{order.orderCode}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status] ?? ""}`}>{STATUS_LABELS[order.status] ?? order.status}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAY_STYLES[order.paymentStatus] ?? ""}`}>Payment: {order.paymentStatus}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{order.createdAt ? format(new Date(order.createdAt), "PPp") : ""} · {isCod ? "Cash on Delivery" : "Online"}{order.paymentChannel ? ` · ${CHANNEL_LABELS[order.paymentChannel] ?? order.paymentChannel}` : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatBDT(order.total)}</p>
            <p className="text-xs text-gray-400">{order.items.reduce((n, i) => n + i.quantity, 0)} item(s)</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600">
          <span className="font-medium text-gray-800">{order.customerName}</span>
          {order.customerPhone && <span className="inline-flex items-center gap-1"><Phone size={13} className="text-gray-400" />{order.customerPhone}</span>}
          <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-primary hover:underline ml-auto">
            {open ? <>Hide details <ChevronUp size={14} /></> : <>Details <ChevronDown size={14} /></>}
          </button>
        </div>

        {open && (
          <div className="mt-4 space-y-4">
            {/* Payment */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><CreditCard size={12} /> Payment</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Method</span><span className="text-gray-800 text-right">{isCod ? "Cash on Delivery" : "Online (full)"}</span>
                <span className="text-gray-500">Paid online via</span><span className="text-gray-800 text-right">{order.paymentChannel ? CHANNEL_LABELS[order.paymentChannel] ?? order.paymentChannel : "—"}</span>
                <span className="text-gray-500">Transaction ID</span><span className="text-gray-800 text-right font-mono">{order.transactionId ?? "—"}</span>
                <span className="text-gray-500">Sender number</span><span className="text-gray-800 text-right">{order.senderNumber ?? "—"}</span>
                <span className="text-gray-500">Amount paid online</span><span className="text-gray-800 text-right font-semibold">{formatBDT(onlineAmount)}</span>
                {isCod && <><span className="text-gray-500">Cash on delivery</span><span className="text-gray-800 text-right font-semibold">{formatBDT(order.total - order.deliveryCharge)}</span></>}
                <span className="text-gray-500">Delivery charge</span><span className="text-gray-800 text-right">{formatBDT(order.deliveryCharge)}</span>
              </div>
              {order.paymentStatus === "pending" && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 gap-1" disabled={updatePayment.isPending} onClick={() => updatePayment.mutate("verified")}><Check size={13} /> Verify payment</Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1" disabled={updatePayment.isPending} onClick={() => updatePayment.mutate("rejected")}><X size={13} /> Reject</Button>
                </div>
              )}
            </div>

            {/* Shipping + items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><MapPin size={12} /> Shipping</p>
                <p className="text-sm text-gray-700">{order.shippingAddress.street}, {order.shippingAddress.city}{order.shippingAddress.zip ? ` ${order.shippingAddress.zip}` : ""}, Bangladesh</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                <ul className="space-y-2">
                  {order.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <img src={it.image} alt="" className="w-9 h-9 rounded border object-contain bg-white p-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 truncate">{it.name}</p>
                        {(it.color || it.storage) && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {it.storage && (
                              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{it.storage}</span>
                            )}
                            {it.color && (
                              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{it.color}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-500 flex-shrink-0">×{it.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Status actions + delete */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
          <span className="text-xs text-gray-500 mr-1">Set status:</span>
          {ORDER_STATUSES.map((s) => (
            <Button key={s} size="sm" variant={order.status === s ? "default" : "outline"} className="h-8 text-xs" disabled={order.status === s || updateStatus.isPending} onClick={() => updateStatus.mutate(s)}>
              {STATUS_LABELS[s]}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-400 hover:text-red-600 gap-1 ml-auto" onClick={() => onDelete(order)}><Trash2 size={14} /> Delete</Button>
        </div>
      </div>
    </div>
  );
}

function OrdersInner() {
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminOrder | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-orders", filter], queryFn: () => adminApi.listOrders(filter) });
  const orders = data?.orders ?? [];

  const del = useMutation({
    mutationFn: (id: number) => adminApi.deleteOrder(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Order deleted"); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <AdminNav />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center"><ShoppingBag size={22} /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">Orders</h1><p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? "s" : ""} · oldest first</p></div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.value ? "bg-primary text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border p-12 text-center text-gray-400">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center"><ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No orders{filter !== "all" ? ` with status "${filter}"` : " yet"}.</p></div>
        ) : (
          <div className="space-y-4">{orders.map((o) => <OrderCard key={o.id} order={o} onDelete={setDeleteTarget} />)}</div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete order {deleteTarget?.orderCode}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the order for {deleteTarget?.customerName}. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteTarget && del.mutate(deleteTarget.id)} disabled={del.isPending}>{del.isPending ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminOrders() {
  return <AdminGuard permission="orders"><OrdersInner /></AdminGuard>;
}
