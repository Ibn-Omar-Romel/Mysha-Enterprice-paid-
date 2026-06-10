import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { formatBDT } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight, Eye } from "lucide-react";
import { format } from "date-fns";

export default function OrdersPage() {
  const { data: orders, isLoading } = useListOrders();

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-0">Processing</Badge>;
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">Shipped</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-0">Delivered</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-0">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <Package size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No orders yet</h2>
            <p className="text-gray-500 mb-8">When you place an order, it will appear here.</p>
            <Link href="/">
              <Button>Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 px-6 py-4 border-b gap-4">
                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">Order Placed</p>
                      <p className="text-gray-900">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Total</p>
                      <p className="text-gray-900 font-bold">{formatBDT(order.total)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Order #</p>
                      <p className="text-gray-900 font-mono">{order.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                    {getStatusBadge(order.status)}
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
                        View Details <ChevronRight size={16} />
                      </Button>
                    </Link>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center gap-4 overflow-x-auto pb-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="relative shrink-0 group">
                        <div className="w-20 h-20 bg-gray-50 rounded-lg border p-2 flex items-center justify-center">
                          <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                        </div>
                        {item.quantity > 1 && (
                          <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium shadow border-2 border-white">
                            {item.quantity}
                          </span>
                        )}
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-gray-900 text-white text-xs p-2 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                          {item.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 sm:hidden">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                        <Eye size={16} /> View Order Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
