import { Link } from "wouter";
import { Star, ShoppingCart, Heart, BarChart2 } from "lucide-react";
import { Product } from "@workspace/api-client-react";
import { formatBDT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAddToCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWishlist } from "@/hooks/useWishlist";
import { useCompare } from "@/hooks/useCompare";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const queryClient = useQueryClient();
  const addToCart = useAddToCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const wishlisted = isWishlisted(product.id);
  const comparing = isInCompare(product.id);

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (comparing) {
      removeFromCompare(product.id);
      toast("Removed from comparison");
      return;
    }
    const result = addToCompare({
      id: product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice ?? null,
      discount: product.discount ?? 0,
      image: product.image,
      rating: product.rating,
      category: product.category,
      brand: product.brand ?? "",
      inStock: product.inStock ?? true,
      description: product.description ?? "",
    });
    if (result === "max") {
      toast.error("You can compare up to 4 products at a time");
    } else {
      toast.success("Added to comparison");
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast.success(`${product.name} added to cart`);
        },
        onError: () => {
          toast.error("Failed to add to cart");
        }
      }
    );
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    toast(wishlisted ? "Removed from wishlist" : "Added to wishlist", {
      icon: wishlisted ? "💔" : "❤️",
    });
  };

  return (
    <Link href={`/product/${product.id}`} className="group block bg-white rounded-lg border overflow-hidden hover-elevate transition-all duration-300 hover:border-primary/30 relative">
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {product.discount && product.discount > 0 && (
          <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 animate-pulse-slow">
            -{product.discount}%
          </Badge>
        )}
        {product.tag && (
          <Badge className="bg-primary hover:bg-primary/90 text-white">
            {product.tag}
          </Badge>
        )}
      </div>

      {/* Action buttons stack (top-right) */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
        <button
          onClick={handleWishlist}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
            wishlisted
              ? "bg-red-500 text-white"
              : "bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100"
          }`}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
        </button>
        <button
          onClick={handleCompare}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
            comparing
              ? "bg-primary text-white"
              : "bg-white/90 text-gray-400 hover:text-primary hover:bg-white"
          }`}
          aria-label={comparing ? "Remove from comparison" : "Compare"}
          title={comparing ? "Remove from comparison" : "Add to Compare"}
        >
          <BarChart2 size={15} />
        </button>
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-50 relative p-4 flex items-center justify-center">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
        />

        {/* Quick Add Button */}
        {product.inStock && (
          <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <Button
              className="w-full shadow-lg"
              onClick={handleAddToCart}
              disabled={addToCart.isPending}
            >
              <ShoppingCart size={16} className="mr-2" />
              Add to Cart
            </Button>
          </div>
        )}
        {!product.inStock && (
          <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <Button variant="secondary" className="w-full shadow-lg opacity-80" disabled>
              Out of Stock
            </Button>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 bg-white z-20 relative">
        <div className="text-xs text-gray-500 mb-1">{product.category}</div>
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-primary transition-colors h-10">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                fill={star <= Math.round(product.rating) ? "currentColor" : "none"}
                className={star <= Math.round(product.rating) ? "text-amber-400" : "text-gray-300"}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">({product.rating})</span>
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <span className="font-bold text-lg text-primary">{formatBDT(product.price)}</span>
          {product.oldPrice && (
            <span className="text-sm text-gray-400 line-through">{formatBDT(product.oldPrice)}</span>
          )}
        </div>

        <button
          onClick={handleCompare}
          className={`mt-2 flex items-center gap-1 text-xs font-medium transition-colors w-full ${
            comparing
              ? "text-primary"
              : "text-gray-400 hover:text-primary"
          }`}
        >
          <BarChart2 size={12} />
          {comparing ? "Remove from Compare" : "+ Add to Compare"}
        </button>
      </div>
    </Link>
  );
}
