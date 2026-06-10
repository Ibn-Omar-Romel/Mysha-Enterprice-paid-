import { useParams, Link } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { formatBDT } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Truck, CreditCard, MapPin, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function OrderDetailPage() {
  const { id } = useParams();
  const orderId = parseInt(id || "0", 10);
  
  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId }
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-0 px-3 py-1 text-sm">Processing</Badge>;
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0 px-3 py-1 text-sm">Shipped</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-0 px-3 py-1 text-sm flex items-center gap-1"><CheckCircle2 size={14}/> Delivered</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-0 px-3 py-1 text-sm">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="px-3 py-1 text-sm">{status}</Badge>;
    }
  };

  const getStatusProgress = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'processing') return 33;
    if (s === 'shipped') return 66;
    if (s === 'delivered') return 100;
    return 0;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-48 w-full rounded-xl mb-6" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
        <Link href="/orders">
          <Button>Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/orders">
            <Button variant="outline" size="icon" className="rounded-full">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
          <div className="ml-auto">{getStatusBadge(order.status)}</div>
        </div>

        {/* Status Timeline */}
        {order.status.toLowerCase() !== 'cancelled' && (
          <div className="bg-white rounded-xl border p-6 md:p-8 mb-6">
            <div className="relative">
              <div className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-gray-100 rounded"></div>
              <div 
                className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-primary rounded transition-all duration-1000"
                style={{ width: `${getStatusProgress(order.status)}%` }}
              ></div>
              
              <div className="relative flex justify-between">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors ${getStatusProgress(order.status) >= 33 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <Package size={16} />
                  </div>
                  <span className="text-xs font-medium hidden sm:block">Processing</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors ${getStatusProgress(order.status) >= 66 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <Truck size={16} />
                  </div>
                  <span className="text-xs font-medium hidden sm:block">Shipped</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors ${getStatusProgress(order.status) >= 100 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-xs font-medium hidden sm:block">Delivered</span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-6">
              Order placed on {format(new Date(order.createdAt), 'MMMM dd, yyyy at h:mm a')}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 bg-gray-50 border-b font-medium text-gray-900">
                Items ({order.items.length})
              </div>
              <ul className="divide-y">
                {order.items.map((item, idx) => (
                  <li key={idx} className="p-4 flex gap-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-lg p-2 border shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${item.productId}`} className="font-medium text-gray-900 hover:text-primary line-clamp-2 mb-1">
                        {item.name}
                      </Link>
                      <div className="text-sm text-gray-500 mb-2">Qty: {item.quantity}</div>
                      <div className="font-bold text-gray-900">{formatBDT(item.price)}</div>
                    </div>
                    <div className="text-right font-bold text-gray-900 shrink-0">
                      {formatBDT(item.price * item.quantity)}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-4 bg-gray-50 border-t flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatBDT(order.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2 text-gray-900">
                    <span>Total</span>
                    <span className="text-primary">{formatBDT(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-primary" /> Shipping Address
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900 text-base">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.phone}</p>
                <p className="pt-2">{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}</p>
                <p>{order.shippingAddress.zip}</p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-primary" /> Payment Method
              </h3>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">{order.paymentMethod || 'Cash on Delivery'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
