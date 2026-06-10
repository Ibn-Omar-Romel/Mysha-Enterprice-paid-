import { Link } from "wouter";
import { useWishlist } from "@/hooks/useWishlist";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { toArray } from "@/lib/data";

export default function WishlistPage() {
  const { wishlistIds, clearWishlist, count } = useWishlist();

  const { data: allProductsRaw, isLoading } = useListProducts(
    {},
    { query: { enabled: wishlistIds.length > 0 } },
  );

  // Safe array extraction before calling .filter
  const allProducts = toArray(allProductsRaw);
  // String-coerced comparison guards against number vs string ID mismatch
  // between localStorage (number[]) and API response (id may serialize as string)
  const wishlistProducts = allProducts.filter((p: any) =>
    wishlistIds.some((wid) => String(wid) === String(p.id)),
  );

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <Heart size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
              <p className="text-sm text-gray-500">
                {count} saved item{count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {count > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearWishlist}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
            >
              <Trash2 size={14} className="mr-2" /> Clear All
            </Button>
          )}
        </div>

        {isLoading && wishlistIds.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[340px] w-full rounded-xl" />
            ))}
          </div>
        ) : wishlistProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {wishlistProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border p-16 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-200">
              <Heart size={36} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Your wishlist is empty
            </h2>
            <p className="text-gray-500 mb-8">
              Save items you love by clicking the heart icon on any product.
              Come back later to purchase them!
            </p>
            <Link href="/">
              <Button className="px-8">
                <ShoppingBag size={16} className="mr-2" /> Start Shopping
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
