import { Link } from "wouter";
import {
  useGetCart,
  useUpdateCartItem,
  useRemoveFromCart,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { formatBDT } from "@/lib/format";
import { OWNER_WHATSAPP, STORE_NAME } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ShoppingCart, ArrowRight, MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

// Cart item shape returned by the backend buildCart() function
type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  brand?: string | null;
};

// Safely extract items array regardless of response shape
function extractCartItems(cart: unknown): CartItem[] {
  if (!cart || typeof cart !== "object") return [];
  const c = cart as Record<string, unknown>;
  if (Array.isArray(c.items))     return c.items     as CartItem[];
  if (Array.isArray(c.cartItems)) return c.cartItems as CartItem[];
  if (c.data && typeof c.data === "object") {
    const d = c.data as Record<string, unknown>;
    if (Array.isArray(d.items))     return d.items     as CartItem[];
    if (Array.isArray(d.cartItems)) return d.cartItems as CartItem[];
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
  if (c.data && typeof c.data === "object") {
    const d = c.data as Record<string, unknown>;
    if (typeof d.itemCount === "number") return d.itemCount;
  }
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export default function CartPage() {
  const { data: cart, isLoading } = useGetCart();
  const updateCartItem = useUpdateCartItem();
  const removeFromCart = useRemoveFromCart();
  const queryClient = useQueryClient();

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    updateCartItem.mutate(
      { productId, data: { quantity } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        },
      },
    );
  };

  const handleRemove = (productId: number) => {
    removeFromCart.mutate(
      { productId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        },
      },
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <div className="w-full lg:w-80">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Safe extraction — never call .length on a potentially-undefined value ─
  const cartItems    = extractCartItems(cart);
  const cartTotal    = extractCartTotal(cart);
  const cartItemCount = extractCartItemCount(cart, cartItems);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-lg">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
          <ShoppingCart size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your cart is empty
        </h2>
        <p className="text-gray-500 mb-8">
          Looks like you haven&apos;t added anything to your cart yet.
        </p>
        <Link href="/">
          <Button size="lg" className="w-full sm:w-auto px-8">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  // ── Cart with items ───────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Items list */}
          <div className="flex-1">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="hidden sm:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b text-sm font-medium text-gray-500">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <ul className="divide-y">
                {cartItems.map((item) => (
                  <li
                    key={item.productId}
                    className="p-4 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center"
                  >
                    <div className="col-span-6 flex items-center gap-4 w-full">
                      <div className="w-20 h-20 bg-gray-50 rounded-lg p-2 flex-shrink-0 border">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                      <div className="flex-1">
                        <Link
                          href={`/product/${item.productId}`}
                          className="font-medium text-gray-900 hover:text-primary line-clamp-2 mb-1"
                        >
                          {item.name}
                        </Link>
                        {item.brand && (
                          <p className="text-sm text-gray-500">{item.brand}</p>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 text-center w-full sm:w-auto flex justify-between sm:block mt-2 sm:mt-0">
                      <span className="sm:hidden text-gray-500">Price:</span>
                      <span className="font-medium">{formatBDT(item.price)}</span>
                    </div>

                    <div className="col-span-2 flex justify-center w-full sm:w-auto">
                      <div className="flex items-center border rounded-lg h-9 bg-gray-50">
                        <button
                          onClick={() =>
                            handleUpdateQuantity(
                              item.productId,
                              Math.max(1, item.quantity - 1),
                            )
                          }
                          className="px-3 text-gray-500 hover:text-primary transition-colors disabled:opacity-50"
                          disabled={item.quantity <= 1 || updateCartItem.isPending}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateQuantity(item.productId, item.quantity + 1)
                          }
                          className="px-3 text-gray-500 hover:text-primary transition-colors disabled:opacity-50"
                          disabled={updateCartItem.isPending}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
                      <div className="sm:hidden text-gray-500">Total:</div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-primary">
                          {formatBDT(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => handleRemove(item.productId)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-2"
                          disabled={removeFromCart.isPending}
                          aria-label="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="w-full lg:w-80">
            <div className="bg-white rounded-xl border p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cartItemCount} items)</span>
                  <span className="font-medium text-gray-900">
                    {formatBDT(cartTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold text-gray-900 text-base">Total</span>
                  <span className="font-bold text-primary text-xl">
                    {formatBDT(cartTotal)}
                  </span>
                </div>
              </div>

              <Link href="/checkout">
                <Button className="w-full h-12 text-base font-semibold shadow-md">
                  Proceed to Checkout <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>

              <div className="relative flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 flex-shrink-0">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <Button
                onClick={() => {
                  const itemLines = cartItems
                    .map(
                      (i) =>
                        `• ${i.name} x${i.quantity} — ${formatBDT(i.price * i.quantity)}`,
                    )
                    .join("\n");
                  const msg = [
                    `Hello! 👋 I'd like to order from *${STORE_NAME}*`,
                    "",
                    `📦 *My Cart:*`,
                    itemLines,
                    "",
                    `💰 *Total: ${formatBDT(cartTotal)}*`,
                    "",
                    `Please help me complete my order. Thank you!`,
                  ].join("\n");
                  window.open(
                    `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
                className="w-full h-11 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold"
              >
                <MessageCircle size={17} className="mr-2" />
                Order via WhatsApp
              </Button>

              <p className="text-center text-xs text-gray-400 mt-3">
                No account needed — anyone can shop &amp; checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
