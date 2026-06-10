import {
  useGetFeaturedProducts,
  useListCategories,
  useListProducts,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Tag,
  Headphones,
  Smartphone,
  Laptop,
  Watch,
  Monitor,
  Home,
  Tablet,
  Refrigerator,
  ChevronRight,
  Zap,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { FlashSaleTimer } from "@/components/FlashSaleTimer";

type Product = {
  id: string | number;
  slug?: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number | null;
  discount?: number | null;
  rating?: number | string | null;
  tag?: string | null;
  category?: string | null;
  brand?: string | null;
  inStock?: boolean;
  description?: string | null;
  [key: string]: any;
};

type Category = {
  id: string | number;
  slug: string;
  name: string;
  icon?: string | null;
  productCount?: number | null;
  [key: string]: any;
};

function toArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.categories)) return value.categories;
  if (Array.isArray(value?.deals)) return value.deals;
  if (Array.isArray(value?.trends)) return value.trends;
  if (Array.isArray(value?.selling)) return value.selling;
  if (Array.isArray(value?.arrival)) return value.arrival;
  if (Array.isArray(value?.topSelling)) return value.topSelling;
  if (Array.isArray(value?.newArrivals)) return value.newArrivals;
  return [];
}

function formatPrice(value: unknown) {
  return Number(value || 0).toLocaleString("en-IN");
}

export default function HomePage() {
  const { data: featured, isLoading: isLoadingFeatured } =
    useGetFeaturedProducts();

  const { data: categoriesData, isLoading: isLoadingCategories } =
    useListCategories();

  const { ids: recentIds } = useRecentlyViewed();

  const { data: allProductsData } = useListProducts({});

  const categories: Category[] = toArray<Category>(categoriesData);
  const allProducts: Product[] = toArray<Product>(allProductsData);

  const featuredTrends: Product[] = Array.isArray((featured as any)?.trends)
    ? (featured as any).trends
    : [];

  const rawDeals: Product[] = Array.isArray((featured as any)?.deals)
    ? (featured as any).deals
    : featuredTrends.length > 0
      ? featuredTrends
      : toArray<Product>(featured);

  const rawSelling: Product[] = Array.isArray((featured as any)?.selling)
    ? (featured as any).selling
    : Array.isArray((featured as any)?.topSelling)
      ? (featured as any).topSelling
      : featuredTrends.length > 0
        ? featuredTrends
        : [];

  const rawArrival: Product[] = Array.isArray((featured as any)?.arrival)
    ? (featured as any).arrival
    : Array.isArray((featured as any)?.newArrivals)
      ? (featured as any).newArrivals
      : featuredTrends.length > 0
        ? featuredTrends
        : [];

  const featuredDeals: Product[] =
    rawDeals.length > 0 ? rawDeals : allProducts.slice(0, 5);

  const featuredSelling: Product[] =
    rawSelling.length > 0 ? rawSelling : allProducts.slice(5, 10);

  const featuredArrival: Product[] =
    rawArrival.length > 0 ? rawArrival : allProducts.slice(10, 15);

  const recentProducts = allProducts
    .filter((p) => recentIds.includes(p.id as any))
    .slice(0, 5);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    if (!emblaApi) return;

    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [emblaApi]);

  const iconMap: Record<string, ReactNode> = {
    smartphone: <Smartphone size={24} />,
    laptop: <Laptop size={24} />,
    headphones: <Headphones size={24} />,
    watch: <Watch size={24} />,
    monitor: <Monitor size={24} />,
    home: <Home size={24} />,
    "tablet-smartphone": <Tablet size={24} />,
    refrigerator: <Refrigerator size={24} />,
  };

  const categoryImageMap: Record<string, string> = {
    smartphone:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=400&h=300&fit=crop",
    laptop:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=400&h=300&fit=crop",
    headphones:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&h=300&fit=crop",
    watch:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&h=300&fit=crop",
    monitor:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=400&h=300&fit=crop",
    home:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=400&h=300&fit=crop",
    "tablet-smartphone":
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=400&h=300&fit=crop",
    refrigerator:
      "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?q=80&w=400&h=300&fit=crop",
  };

  return (
    <div className="w-full">
      {/* Hero Carousel */}
      <section className="bg-[#0d1117] text-white overflow-hidden relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {/* Slide 1 */}
            <div className="flex-[0_0_100%] min-w-0 relative">
              <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 space-y-6 z-10">
                  <div className="inline-block px-3 py-1 bg-primary/20 text-primary font-medium text-sm rounded-full border border-primary/30">
                    New Release
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                    iPhone 15 Pro Max
                  </h1>
                  <p className="text-lg text-gray-400 max-w-lg">
                    Titanium. So strong. So light. So Pro. Experience the new
                    generation of iPhone.
                  </p>
                  <Link
                    href="/product/1"
                    className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-white shadow transition-colors hover:bg-primary/90"
                  >
                    Shop Now
                  </Link>
                </div>

                <div className="flex-1 flex justify-center z-10">
                  <img
                    src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=800&auto=format&fit=crop"
                    alt="iPhone 15 Pro"
                    className="max-w-md w-full object-contain drop-shadow-2xl rounded-xl"
                  />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent blur-3xl opacity-50 pointer-events-none" />
            </div>

            {/* Slide 2 */}
            <div className="flex-[0_0_100%] min-w-0 relative">
              <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 space-y-6 z-10">
                  <div className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 font-medium text-sm rounded-full border border-blue-500/30">
                    Best Seller
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                    MacBook Pro M3
                  </h1>
                  <p className="text-lg text-gray-400 max-w-lg">
                    Mind-blowing. Head-turning. The most advanced Mac ever
                    built.
                  </p>
                  <Link
                    href="/category/laptops"
                    className="inline-flex h-12 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-[#0d1117] shadow transition-colors hover:bg-gray-200"
                  >
                    Explore Mac
                  </Link>
                </div>

                <div className="flex-1 flex justify-center z-10">
                  <img
                    src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop"
                    alt="MacBook Pro"
                    className="max-w-md w-full object-contain drop-shadow-2xl rounded-xl"
                  />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/20 to-transparent blur-3xl opacity-50 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="bg-white border-b py-6 hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {[
              {
                icon: <ShieldCheck size={20} />,
                title: "36 Months EMI",
                text: "Available on all banks",
              },
              {
                icon: <Truck size={20} />,
                title: "Fastest Delivery",
                text: "Home delivery in 24h",
              },
              {
                icon: <RotateCcw size={20} />,
                title: "Exchange Facility",
                text: "Upgrade your old device",
              },
              {
                icon: <Tag size={20} />,
                title: "Best Price Deals",
                text: "Guaranteed lowest price",
              },
              {
                icon: <Headphones size={20} />,
                title: "After-Sales Service",
                text: "Dedicated support team",
              },
            ].map((item, index) => (
              <div key={item.title} className="flex items-center gap-3">
                {index > 0 && (
                  <div className="w-px h-10 bg-gray-200 hidden lg:block -ml-3 mr-3" />
                )}

                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-primary">
                  {item.icon}
                </div>

                <div>
                  <h4 className="font-semibold text-sm">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flash Sale Section */}
      <section className="py-10 bg-[#0d1117]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-7">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Zap size={20} className="text-white" fill="currentColor" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white leading-tight">
                  Flash Sale
                </h2>
                <p className="text-gray-400 text-sm">
                  Limited time deals — don&apos;t miss out!
                </p>
              </div>
            </div>
            <FlashSaleTimer />
          </div>

          {isLoadingFeatured ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[280px] w-full rounded-xl bg-gray-800"
                />
              ))}
            </div>
          ) : featuredDeals.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {featuredDeals.slice(0, 5).map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all group cursor-pointer">
                    <div className="relative aspect-square bg-gray-900 flex items-center justify-center p-4">
                      {!!product.discount && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md z-10 animate-pulse">
                          -{product.discount}%
                        </span>
                      )}
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain mix-blend-luminosity group-hover:mix-blend-normal group-hover:scale-105 transition-all duration-300"
                      />
                    </div>
                    <div className="p-3 border-t border-gray-700">
                      <p className="text-gray-300 text-xs line-clamp-2 mb-2 min-h-[2.5rem] group-hover:text-white transition-colors">
                        {product.name}
                      </p>
                      <div className="flex items-end gap-1.5">
                        <span className="text-primary font-bold text-base leading-none">
                          ৳{formatPrice(product.price)}
                        </span>
                        {!!product.oldPrice && (
                          <span className="text-gray-500 text-xs line-through leading-none">
                            ৳{formatPrice(product.oldPrice)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-red-400 rounded-full"
                            style={{ width: "65%" }}
                          />
                        </div>
                        <p className="text-gray-500 text-[10px] mt-1">
                          Selling fast
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              No flash sale products found.
            </div>
          )}

          <div className="text-center mt-6">
            <Link
              href="/category/all"
              className="inline-flex items-center gap-2 text-sm text-primary font-semibold border border-primary/30 hover:bg-primary hover:text-white px-6 py-2.5 rounded-lg transition-colors"
            >
              View All Deals <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Shop by Category
            </h2>
          </div>

          {isLoadingCategories ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat) => {
                const iconKey = cat.icon || "";
                const catImage = categoryImageMap[iconKey];

                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="group relative rounded-xl overflow-hidden border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-300 aspect-[4/3]"
                  >
                    {catImage ? (
                      <img
                        src={catImage}
                        alt={cat.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-100" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all duration-300" />

                    <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30">
                      <div className="scale-75">
                        {iconKey && iconMap[iconKey] ? (
                          iconMap[iconKey]
                        ) : (
                          <Smartphone size={16} />
                        )}
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-semibold text-sm text-white leading-tight group-hover:text-primary transition-colors">
                        {cat.name}
                      </h3>
                      {!!cat.productCount && (
                        <p className="text-xs text-white/70 mt-0.5">
                          {cat.productCount} Items
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}

              <Link
                href="/category/all"
                className="group relative rounded-xl overflow-hidden border border-primary aspect-[4/3] bg-primary hover:bg-primary/90 hover:shadow-lg transition-all duration-300 flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/30 group-hover:bg-white/30 transition-colors">
                  <ChevronRight size={20} />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-sm text-white">
                    All Products
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5">
                    Browse everything
                  </p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          {isLoadingFeatured ? (
            <div className="space-y-8">
              <div className="flex justify-center">
                <Skeleton className="w-64 h-12 rounded-full" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <Tabs defaultValue="deals" className="w-full">
              <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Featured Products
                </h2>
                <TabsList className="bg-gray-100 p-1">
                  <TabsTrigger
                    value="deals"
                    className="rounded-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    Best Deals
                  </TabsTrigger>
                  <TabsTrigger
                    value="selling"
                    className="rounded-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    Top Selling
                  </TabsTrigger>
                  <TabsTrigger
                    value="arrival"
                    className="rounded-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    New Arrivals
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="deals"
                className="mt-0 focus-visible:outline-none"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {featuredDeals.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="selling"
                className="mt-0 focus-visible:outline-none"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {featuredSelling.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="arrival"
                className="mt-0 focus-visible:outline-none"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {featuredArrival.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>

      {/* Promo Banners */}
      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/category/gadgets?tag=headphones"
              className="group block relative rounded-2xl overflow-hidden bg-[#1e1e24] aspect-[21/9] md:aspect-[16/7]"
            >
              <div className="absolute inset-0 p-8 flex flex-col justify-center z-10 w-2/3">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">
                  Limited Offer
                </span>
                <h3 className="text-white text-2xl md:text-3xl font-bold leading-tight mb-4 group-hover:text-primary transition-colors">
                  Premium Audio Experience
                </h3>
                <span className="inline-flex items-center text-white font-medium group-hover:gap-2 transition-all">
                  Shop Now{" "}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    →
                  </span>
                </span>
              </div>
              <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-gray-800 to-transparent" />
              <img
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop"
                alt="Audio"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[120%] object-cover opacity-80 mix-blend-luminosity group-hover:scale-105 transition-transform duration-500"
              />
            </Link>

            <Link
              href="/category/gadgets?tag=watches"
              className="group block relative rounded-2xl overflow-hidden bg-gray-100 aspect-[21/9] md:aspect-[16/7]"
            >
              <div className="absolute inset-0 p-8 flex flex-col justify-center z-10 w-2/3">
                <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-2">
                  New Arrival
                </span>
                <h3 className="text-gray-900 text-2xl md:text-3xl font-bold leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                  Smart Watches Collection
                </h3>
                <span className="inline-flex items-center text-gray-900 font-medium group-hover:gap-2 transition-all">
                  Explore{" "}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    →
                  </span>
                </span>
              </div>
              <img
                src="https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=800&auto=format&fit=crop"
                alt="Watch"
                className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-2/3 h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      {recentProducts.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Recently Viewed
              </h2>
              <Link
                href="/category/all"
                className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"
              >
                Browse all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {recentProducts.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter Banner */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="bg-[#0d1117] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-2">
                Stay in the Loop
              </h3>
              <p className="text-gray-400">
                Get exclusive deals, new arrivals and tech news delivered to
                your inbox.
              </p>
            </div>
            <form
              className="flex gap-3 w-full md:w-auto"
              onSubmit={(e) => {
                e.preventDefault();
                const el = e.currentTarget.querySelector(
                  "input"
                ) as HTMLInputElement;
                if (el?.value) {
                  el.value = "";
                }
              }}
            >
              <input
                type="email"
                placeholder="Enter your email..."
                className="flex-1 md:w-64 h-12 px-4 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="h-12 px-6 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}