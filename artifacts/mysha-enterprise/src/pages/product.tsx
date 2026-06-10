import { useParams, Link } from "wouter";
import { useGetProduct, useListProducts, useAddToCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { toArray } from "@/lib/data";
import { ProductCard } from "@/components/ProductCard";
import { formatBDT } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ChevronRight, Star, Truck, ShieldCheck, ShoppingCart, Check, Heart, Share2, ThumbsUp, AlertTriangle, RotateCcw, Zap, PenLine, X, BarChart2 } from "lucide-react";
import { EmiCalculator } from "@/components/EmiCalculator";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useWishlist } from "@/hooks/useWishlist";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCompare } from "@/hooks/useCompare";
import { formatDistanceToNow } from "date-fns";

interface Review {
  id: number;
  productId: number;
  reviewerName: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  verified: boolean;
  createdAt: string;
}

interface ReviewsData {
  reviews: Review[];
  avgRating: number;
  total: number;
  breakdown: { stars: number; count: number; pct: number }[];
}

function ReviewStars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? "currentColor" : "none"}
          className={star <= rating ? "text-amber-400" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

function InteractiveStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={28}
            fill={(hovered || value) >= star ? "currentColor" : "none"}
            className={(hovered || value) >= star ? "text-amber-400" : "text-gray-300"}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-amber-600">
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
        </span>
      )}
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const productId = parseInt(id || "0", 10);

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId }
  });

  const { data: relatedProducts } = useListProducts({
    category: product?.category,
  }, {
    query: { enabled: !!product?.category }
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery<ReviewsData>({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!productId,
  });

  const submitReview = useMutation({
    mutationFn: async (body: { reviewerName: string; rating: number; comment: string }) => {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit review");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Review submitted! Thank you for your feedback.");
      setShowForm(false);
      setFormData({ name: "", rating: 0, comment: "" });
      refetchReviews();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markHelpfulMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      const res = await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark helpful");
      return res.json();
    },
    onSuccess: () => refetchReviews(),
  });

  const [quantity, setQuantity] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", rating: 0, comment: "" });
  const [helpfulVoted, setHelpfulVoted] = useState<Set<number>>(new Set());
  const [imgError, setImgError] = useState(false);
  const addToCart = useAddToCart();
  const queryClient = useQueryClient();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const { addViewed } = useRecentlyViewed();
  const wishlisted = product ? isWishlisted(product.id) : false;
  const comparing = product ? isInCompare(product.id) : false;

  useEffect(() => {
    if (product?.id) addViewed(product.id);
  }, [product?.id, addViewed]);

  // Reset img error when product changes
  useEffect(() => { setImgError(false); }, [product?.id]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart.mutate(
      { data: { productId: product.id, quantity } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast.success(`${quantity}x ${product.name} added to cart`);
        },
        onError: () => toast.error("Failed to add to cart"),
      }
    );
  };

  const handleWishlist = () => {
    if (!product) return;
    toggleWishlist(product.id);
    toast(wishlisted ? "Removed from wishlist" : "Saved to wishlist", {
      icon: wishlisted ? "💔" : "❤️",
    });
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleCompare = () => {
    if (!product) return;
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

  const handleHelpful = (reviewId: number) => {
    if (helpfulVoted.has(reviewId)) return;
    setHelpfulVoted(prev => new Set(prev).add(reviewId));
    markHelpfulMutation.mutate(reviewId);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.rating === 0) { toast.error("Please select a star rating"); return; }
    submitReview.mutate({ reviewerName: formData.name, rating: formData.rating, comment: formData.comment });
  };

  const reviews = reviewsData?.reviews ?? [];
  const avgRating = reviewsData?.avgRating ?? (product?.rating ?? 0);
  const totalReviews = reviewsData?.total ?? 0;
  const breakdown = reviewsData?.breakdown ?? [5, 4, 3, 2, 1].map(s => ({ stars: s, count: 0, pct: 0 }));

  const savings =
    product?.oldPrice && product.oldPrice > product.price
      ? product.oldPrice - product.price
      : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="w-full aspect-square rounded-2xl" />
          <div className="space-y-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <Link href="/"><Button>Return Home</Button></Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-6 md:py-8">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5 flex-wrap">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight size={13} className="flex-shrink-0" />
          <Link href={`/category/${product.category}`} className="hover:text-primary transition-colors capitalize">
            {product.category}
          </Link>
          <ChevronRight size={13} className="flex-shrink-0" />
          <span className="text-gray-800 font-medium truncate max-w-[220px]">{product.name}</span>
        </nav>

        {/* ── Main Product Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

            {/* ── LEFT: Image Column ── */}
            <div className="p-5 md:p-8 md:border-r border-gray-100">
              {/* Image card with fixed aspect ratio, image stays inside */}
              <div className="relative w-full aspect-square max-h-[420px] bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex items-center justify-center">
                {/* Discount badge — inside the card, top-left */}
                {product.discount != null && product.discount > 0 && (
                  <span className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                    -{product.discount}%
                  </span>
                )}
                {/* Tag badge — top-right */}
                {product.tag && (
                  <span className="absolute top-3 right-3 z-10 bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                    {product.tag}
                  </span>
                )}
                {!imgError && product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain p-6"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-300">
                    <ShoppingCart size={48} strokeWidth={1} />
                    <span className="text-sm">No image</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Details Column ── */}
            <div className="p-5 md:p-8 flex flex-col gap-5">

              {/* Brand */}
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                  {product.brand || product.category}
                </span>
              </div>

              {/* Product name */}
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug -mt-2">
                {product.name}
              </h1>

              {/* Rating / Reviews / Stock row */}
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <div className="flex items-center gap-1.5">
                  <ReviewStars rating={Math.round(avgRating)} size={15} />
                  <span className="font-semibold text-amber-600">
                    {avgRating > 0 ? Number(avgRating).toFixed(1) : "0.0"}
                  </span>
                </div>
                <span className="text-gray-200">|</span>
                <button
                  className="text-gray-500 hover:text-primary transition-colors"
                  onClick={() => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })}
                >
                  {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}
                </button>
                <span className="text-gray-200">|</span>
                {product.inStock ? (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <Check size={13} />In Stock
                  </span>
                ) : (
                  <span className="text-red-500 font-medium">Out of Stock</span>
                )}
              </div>

              {/* Divider */}
              <hr className="border-gray-100" />

              {/* Price block */}
              <div className="flex flex-wrap items-end gap-2">
                <span className="text-3xl font-extrabold text-primary leading-none">
                  {formatBDT(product.price)}
                </span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="text-base text-gray-400 line-through leading-none mb-0.5">
                    {formatBDT(product.oldPrice)}
                  </span>
                )}
                {savings > 0 && (
                  <span className="text-xs font-semibold bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full mb-0.5">
                    Save {formatBDT(savings)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 -mt-3">Price includes VAT. Free delivery on orders over ৳10,000.</p>

              {/* Urgency row */}
              {product.inStock && (
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <AlertTriangle size={13} fill="currentColor" className="opacity-80" />
                    Only <strong>7 left</strong> in stock
                  </span>
                  <span className="flex items-center gap-1.5 text-green-600 font-medium">
                    <Zap size={13} fill="currentColor" className="opacity-80" />
                    Fast delivery available
                  </span>
                </div>
              )}

              {/* Key features */}
              {product.description && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Features</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Divider */}
              <hr className="border-gray-100" />

              {/* Quantity + Add to Cart (same row on desktop) */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Quantity selector */}
                <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 h-12 w-36 flex-shrink-0 overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-full flex items-center justify-center text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors text-xl font-medium flex-shrink-0"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-10 text-center font-semibold bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Quantity"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-11 h-full flex items-center justify-center text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors text-xl font-medium flex-shrink-0"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <Button
                  className="h-12 flex-1 text-sm font-semibold gap-2 shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all"
                  onClick={handleAddToCart}
                  disabled={!product.inStock || addToCart.isPending}
                >
                  {addToCart.isPending ? (
                    "Adding…"
                  ) : (
                    <>
                      <ShoppingCart size={17} />
                      {product.inStock ? "Add to Cart" : "Out of Stock"}
                    </>
                  )}
                </Button>
              </div>

              {/* Wishlist / Compare / Share */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex-1 gap-2 h-10 text-sm ${wishlisted ? "text-red-500 border-red-200 bg-red-50 hover:bg-red-100" : ""}`}
                  onClick={handleWishlist}
                >
                  <Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
                  {wishlisted ? "Wishlisted" : "Wishlist"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex-1 gap-2 h-10 text-sm ${comparing ? "text-primary border-primary/30 bg-orange-50 hover:bg-orange-100" : ""}`}
                  onClick={handleCompare}
                >
                  <BarChart2 size={15} />
                  {comparing ? "Comparing" : "Compare"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-3"
                  onClick={handleShare}
                  aria-label="Share product"
                >
                  <Share2 size={15} />
                </Button>
              </div>

              {/* EMI Calculator */}
              <EmiCalculator price={product.price} />

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {[
                  { icon: <Truck size={16} />, color: "blue", label: "Free Delivery", sub: "Orders over ৳10,000" },
                  { icon: <ShieldCheck size={16} />, color: "green", label: "1 Year Warranty", sub: "Official brand warranty" },
                  { icon: <RotateCcw size={16} />, color: "orange", label: "7-Day Return", sub: "Hassle-free returns" },
                  { icon: <Zap size={16} />, color: "purple", label: "Same Day Delivery", sub: "Dhaka metro area" },
                ].map(({ icon, color, label, sub }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full bg-${color}-50 text-${color}-600 flex items-center justify-center flex-shrink-0`}>
                      {icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
            {/* end right column */}
          </div>
        </div>
        {/* end main product card */}

        {/* ── Reviews Section ── */}
        <div id="reviews" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Customer Reviews</h2>
            <Button
              variant={showForm ? "ghost" : "outline"}
              size="sm"
              className="gap-2 text-sm"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? <><X size={14} /> Cancel</> : <><PenLine size={14} /> Write a Review</>}
            </Button>
          </div>

          {/* Review form */}
          {showForm && (
            <div className="mb-8 bg-orange-50 border border-orange-100 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Share Your Experience</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your Rating <span className="text-red-500">*</span>
                  </label>
                  <InteractiveStars value={formData.rating} onChange={r => setFormData(f => ({ ...f, rating: r }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Rahim U."
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    required
                    minLength={2}
                    className="max-w-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your Review <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Tell others what you think about this product…"
                    value={formData.comment}
                    onChange={e => setFormData(f => ({ ...f, comment: e.target.value }))}
                    required
                    maxLength={200}
                    rows={4}
                    className="bg-white resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{formData.comment.length} / 200 characters</p>
                </div>
                <Button type="submit" disabled={submitReview.isPending} className="gap-2">
                  {submitReview.isPending ? "Submitting…" : <><Check size={14} /> Submit Review</>}
                </Button>
              </form>
            </div>
          )}

          {totalReviews > 0 ? (
            <>
              {/* Rating summary */}
              <div className="flex flex-col md:flex-row gap-6 mb-7 pb-7 border-b border-gray-100">
                <div className="flex flex-col items-center justify-center text-center md:w-44 flex-shrink-0">
                  <p className="text-5xl font-bold text-gray-900 mb-1">{Number(avgRating).toFixed(1)}</p>
                  <ReviewStars rating={Math.round(avgRating)} size={18} />
                  <p className="text-sm text-gray-400 mt-1.5">{totalReviews} {totalReviews === 1 ? "review" : "reviews"}</p>
                </div>
                <div className="flex-1 space-y-2">
                  {breakdown.map(({ stars, count, pct }) => (
                    <div key={stars} className="flex items-center gap-2.5">
                      <span className="text-xs text-gray-500 w-6 text-right">{stars}★</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-6">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review cards */}
              <div className="space-y-5">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-50 last:border-0 pb-5 last:pb-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm flex-shrink-0">
                          {review.reviewerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{review.reviewerName}</p>
                          <div className="flex items-center gap-2">
                            <ReviewStars rating={review.rating} size={12} />
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.verified && (
                        <Badge className="bg-green-50 text-green-700 border-0 text-xs flex-shrink-0">Verified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-2 ml-11">{review.comment}</p>
                    <button
                      className={`ml-11 flex items-center gap-1.5 text-xs transition-colors ${helpfulVoted.has(review.id) ? "text-primary" : "text-gray-400 hover:text-gray-600"}`}
                      onClick={() => handleHelpful(review.id)}
                      disabled={helpfulVoted.has(review.id)}
                    >
                      <ThumbsUp size={12} fill={helpfulVoted.has(review.id) ? "currentColor" : "none"} />
                      Helpful ({review.helpfulCount})
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star size={24} className="text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-1">No reviews yet</h3>
              <p className="text-sm text-gray-400 mb-4">Be the first to share your experience.</p>
              {!showForm && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowForm(true)}>
                  <PenLine size={13} /> Write the First Review
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Related Products ── */}
        {toArray(relatedProducts).filter((p: any) => p.id !== product.id).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Similar Products</h2>
              <Link href={`/category/${product.category}`} className="text-sm text-primary hover:underline font-medium">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {toArray(relatedProducts)
                .filter((p: any) => p.id !== product.id)
                .slice(0, 5)
                .map((related: any) => (
                  <ProductCard key={related.id} product={related} />
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}