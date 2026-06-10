import { useCompare, type CompareProduct } from "@/hooks/useCompare";
import { useLocation, Link } from "wouter";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, ShoppingCart, X, BarChart2, Check, Minus,
  ArrowLeft, Trash2, Plus
} from "lucide-react";
import { useAddToCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={14}
          fill={s <= Math.round(rating) ? "currentColor" : "none"}
          className={s <= Math.round(rating) ? "text-amber-400" : "text-gray-300"}
        />
      ))}
      <span className="text-sm font-semibold text-amber-600 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

interface RowProps {
  label: string;
  values: React.ReactNode[];
  highlight?: boolean;
}

function CompareRow({ label, values, highlight }: RowProps) {
  return (
    <tr className={highlight ? "bg-orange-50/50" : "hover:bg-gray-50/50 transition-colors"}>
      <td className="py-4 px-5 text-sm font-semibold text-gray-600 bg-gray-50 border-r border-gray-100 w-36 align-middle sticky left-0">
        {label}
      </td>
      {values.map((val, i) => (
        <td key={i} className="py-4 px-5 text-sm text-gray-800 border-r border-gray-100 last:border-0 align-middle text-center">
          {val ?? <Minus size={14} className="text-gray-300 mx-auto" />}
        </td>
      ))}
      {/* Fill empty cols if fewer than 4 products */}
      {Array.from({ length: 4 - values.length }).map((_, i) => (
        <td key={`empty-${i}`} className="py-4 px-5 border-r border-gray-100 last:border-0" />
      ))}
    </tr>
  );
}

export default function ComparePage() {
  const { items, removeFromCompare, clearCompare } = useCompare();
  const [, setLocation] = useLocation();
  const addToCart = useAddToCart();
  const queryClient = useQueryClient();

  const handleAddToCart = (product: CompareProduct) => {
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast.success(`${product.name} added to cart`);
        },
        onError: () => toast.error("Failed to add to cart"),
      }
    );
  };

  const minPrice = items.length > 0 ? Math.min(...items.map(p => p.price)) : 0;
  const maxRating = items.length > 0 ? Math.max(...items.map(p => p.rating)) : 0;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart2 size={36} className="text-gray-300" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Nothing to Compare</h1>
          <p className="text-gray-500 mb-6">Add products using the Compare button on any product card or product page.</p>
          <Button onClick={() => setLocation("/category/all")} className="gap-2">
            <Plus size={16} /> Browse Products
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart2 size={36} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Add One More</h1>
          <p className="text-gray-500 mb-6">You need at least 2 products to compare. Add another product to continue.</p>
          <Button onClick={() => setLocation("/category/all")} className="gap-2">
            <Plus size={16} /> Add Another Product
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <button
              onClick={() => setLocation(-1 as unknown as string)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors mb-2"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart2 size={24} className="text-primary" />
              Product Comparison
            </h1>
            <p className="text-gray-500 text-sm mt-1">Comparing {items.length} products side by side</p>
          </div>
          <button
            onClick={clearCompare}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={15} /> Clear All
          </button>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <colgroup>
              <col className="w-36" />
              {items.map(p => <col key={p.id} />)}
              {Array.from({ length: 4 - items.length }).map((_, i) => <col key={`ec-${i}`} />)}
            </colgroup>

            {/* Product Headers */}
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-6 px-5 bg-gray-50 border-r border-gray-100 sticky left-0" />
                {items.map(product => (
                  <th key={product.id} className="py-6 px-4 text-left border-r border-gray-100 last:border-0 relative">
                    <button
                      onClick={() => removeFromCompare(product.id)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                    >
                      <X size={12} />
                    </button>

                    <Link href={`/product/${product.id}`}>
                      <div className="w-full aspect-square bg-gray-50 rounded-xl mb-4 flex items-center justify-center p-4 border hover:border-primary/30 transition-colors cursor-pointer">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                    </Link>

                    <Link href={`/product/${product.id}`} className="block hover:text-primary transition-colors">
                      <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{product.brand}</p>
                      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-3">{product.name}</p>
                    </Link>

                    <Button
                      size="sm"
                      className="w-full gap-1.5 font-semibold"
                      disabled={!product.inStock}
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart size={14} />
                      {product.inStock ? "Add to Cart" : "Out of Stock"}
                    </Button>
                  </th>
                ))}
                {/* Empty add-product slots */}
                {items.length < 4 && (
                  <th className="py-6 px-4 border-r border-gray-100 last:border-0">
                    <div
                      onClick={() => setLocation("/category/all")}
                      className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-orange-50/50 transition-all group mb-4"
                    >
                      <Plus size={24} className="text-gray-300 group-hover:text-primary transition-colors mb-1" />
                      <span className="text-xs text-gray-400 group-hover:text-primary transition-colors font-medium">Add Product</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {/* Price */}
              <CompareRow
                label="Price"
                highlight
                values={items.map(p => (
                  <div className="text-center">
                    <p className={`text-lg font-bold ${p.price === minPrice && items.length > 1 ? "text-green-600" : "text-primary"}`}>
                      {formatBDT(p.price)}
                    </p>
                    {p.oldPrice && (
                      <p className="text-xs text-gray-400 line-through">{formatBDT(p.oldPrice)}</p>
                    )}
                    {p.price === minPrice && items.length > 1 && (
                      <Badge className="bg-green-50 text-green-700 border-0 text-xs mt-1">Best Price</Badge>
                    )}
                  </div>
                ))}
              />

              {/* Discount */}
              <CompareRow
                label="Discount"
                values={items.map(p =>
                  p.discount > 0
                    ? <Badge variant="destructive" className="bg-red-100 text-red-600 border-0">{p.discount}% OFF</Badge>
                    : <span className="text-gray-300 text-xs">No discount</span>
                )}
              />

              {/* Rating */}
              <CompareRow
                label="Rating"
                highlight
                values={items.map(p => (
                  <div className="flex flex-col items-center gap-1">
                    <Stars rating={p.rating} />
                    {p.rating === maxRating && items.length > 1 && (
                      <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">Top Rated</Badge>
                    )}
                  </div>
                ))}
              />

              {/* Availability */}
              <CompareRow
                label="Availability"
                values={items.map(p =>
                  p.inStock
                    ? <span className="flex items-center justify-center gap-1.5 text-green-600 font-medium text-xs"><Check size={14} /> In Stock</span>
                    : <span className="flex items-center justify-center gap-1.5 text-red-400 font-medium text-xs"><X size={14} /> Out of Stock</span>
                )}
              />

              {/* Category */}
              <CompareRow
                label="Category"
                values={items.map(p => (
                  <span className="capitalize text-xs text-gray-600">{p.category}</span>
                ))}
              />

              {/* Brand */}
              <CompareRow
                label="Brand"
                highlight
                values={items.map(p => (
                  <span className="font-medium text-xs">{p.brand}</span>
                ))}
              />

              {/* Description */}
              <CompareRow
                label="Key Features"
                values={items.map(p => (
                  <p className="text-xs text-gray-600 leading-relaxed text-left max-w-[200px] mx-auto">
                    {p.description || "—"}
                  </p>
                ))}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
