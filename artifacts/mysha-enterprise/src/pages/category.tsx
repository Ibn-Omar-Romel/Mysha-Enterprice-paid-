import { useParams, useSearch } from "wouter";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { formatBDT } from "@/lib/format";
import { Filter, SlidersHorizontal, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Pagination } from "@/components/Pagination";
import { toArray } from "@/lib/data";

type CategoryItem = {
  id: string | number;
  slug: string;
  name: string;
};

const PRODUCTS_PER_PAGE = 24;
const PRICE_MIN = 0;
const PRICE_MAX = 200000;

// ─── FilterContent ────────────────────────────────────────────────────────────
type FilterContentProps = {
  priceRange: [number, number];
  committedPrice: [number, number];
  availableBrands: string[];
  selectedBrands: string[];
  onPriceChange: (v: [number, number]) => void;
  onPriceCommit: (v: [number, number]) => void;
  onResetPrice: () => void;
  onToggleBrand: (brand: string) => void;
  onClearBrands: () => void;
};

function FilterContent({
  priceRange,
  committedPrice,
  availableBrands,
  selectedBrands,
  onPriceChange,
  onPriceCommit,
  onResetPrice,
  onToggleBrand,
  onClearBrands,
}: FilterContentProps) {
  const priceActive = committedPrice[0] > PRICE_MIN || committedPrice[1] < PRICE_MAX;
  // Pending = slider dragged but Apply not yet clicked
  const hasPending =
    priceRange[0] !== committedPrice[0] || priceRange[1] !== committedPrice[1];

  return (
    <div className="space-y-8">
      {/* ── Price Range ─────────────────────────────────────────── */}
      <div>
        {/* Title + Reset */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base text-gray-900">Price Range</h3>
          {priceActive && (
            <button
              onClick={onResetPrice}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Min / Max display cards */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 rounded-lg border border-gray-200 bg-orange-50 px-3 py-2 text-center">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Min</p>
            <p className="text-sm font-semibold text-gray-800 tabular-nums">
              {formatBDT(priceRange[0])}
            </p>
          </div>
          <div className="w-4 h-px bg-gray-300 flex-shrink-0" />
          <div className="flex-1 rounded-lg border border-gray-200 bg-orange-50 px-3 py-2 text-center">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Max</p>
            <p className="text-sm font-semibold text-gray-800 tabular-nums">
              {formatBDT(priceRange[1])}
            </p>
          </div>
        </div>

        {/* Dual-handle slider */}
        <div className="px-1">
          <Slider
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={1000}
            value={priceRange}
            onValueChange={(v) => onPriceChange(v as [number, number])}
            onValueCommit={(v) => onPriceCommit(v as [number, number])}
            className={[
              "[&_[data-radix-slider-track]]:bg-orange-100",
              "[&_[data-radix-slider-range]]:bg-orange-400",
              "[&_[role=slider]]:h-5",
              "[&_[role=slider]]:w-5",
              "[&_[role=slider]]:rounded-full",
              "[&_[role=slider]]:bg-white",
              "[&_[role=slider]]:border-2",
              "[&_[role=slider]]:border-orange-400",
              "[&_[role=slider]]:shadow-md",
              "[&_[role=slider]]:cursor-grab",
              "[&_[role=slider]:active]:cursor-grabbing",
              "[&_[role=slider]]:focus-visible:outline-none",
              "[&_[role=slider]]:focus-visible:ring-2",
              "[&_[role=slider]]:focus-visible:ring-orange-300",
              "[&_[role=slider]]:focus-visible:ring-offset-2",
              "[&_[role=slider]]:transition-transform",
              "[&_[role=slider]:hover]:scale-110",
            ].join(" ")}
          />
        </div>

        {/* Scale labels */}
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[10px] text-gray-400">{formatBDT(PRICE_MIN)}</span>
          <span className="text-[10px] text-gray-400">{formatBDT(PRICE_MAX)}</span>
        </div>

        {/* Apply button — active only when there are uncommitted changes */}
        <button
          disabled={!hasPending}
          onClick={() => onPriceCommit(priceRange)}
          className={[
            "mt-4 w-full rounded-lg py-2 text-sm font-semibold transition-all duration-150",
            hasPending
              ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm cursor-pointer"
              : "bg-gray-100 text-gray-400 cursor-not-allowed",
          ].join(" ")}
        >
          Apply Price Filter
        </button>
      </div>

      {/* ── Brand Filter ─────────────────────────────────────────── */}
      {availableBrands.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base text-gray-900">Brands</h3>
            {selectedBrands.length > 0 && (
              <button
                onClick={onClearBrands}
                className="text-xs text-orange-500 hover:text-orange-600 font-medium"
              >
                Clear ({selectedBrands.length})
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {availableBrands.map((brand) => {
              const isChecked = selectedBrands.includes(brand);
              return (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand}`}
                    checked={isChecked}
                    onCheckedChange={() => onToggleBrand(brand)}
                    className={isChecked ? "border-orange-500 data-[state=checked]:bg-orange-500" : ""}
                  />
                  <Label
                    htmlFor={`brand-${brand}`}
                    className={`text-sm cursor-pointer leading-none select-none ${
                      isChecked ? "font-semibold text-gray-900" : "font-normal text-gray-700"
                    }`}
                  >
                    {brand}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CategoryPage ─────────────────────────────────────────────────────────────
export default function CategoryPage() {
  const { slug } = useParams();
  const searchString = useSearch();                          // reads ?tag=headphones etc.
  const urlParams    = new URLSearchParams(searchString);
  const urlTag       = urlParams.get("tag") ?? undefined;   // e.g. "headphones"

  const safeSlug = slug || "all";
  const isAll    = safeSlug === "all";

  // ── Filter / sort state ──────────────────────────────────────────────────
  const [priceRange,     setPriceRange]     = useState<[number, number]>([PRICE_MIN, PRICE_MAX]);
  const [committedPrice, setCommittedPrice] = useState<[number, number]>([PRICE_MIN, PRICE_MAX]);
  const [sortBy,         setSortBy]         = useState("newest");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [currentPage,    setCurrentPage]    = useState(1);

  // Reset when slug or tag changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedBrands([]);
    setPriceRange([PRICE_MIN, PRICE_MAX]);
    setCommittedPrice([PRICE_MIN, PRICE_MAX]);
    setSortBy("newest");
  }, [safeSlug, urlTag]);

  // ── Category name ────────────────────────────────────────────────────────
  const { data: categoriesData } = useListCategories();
  const categories      = toArray<CategoryItem>(categoriesData);
  const currentCategory = categories.find((c) => c.slug === safeSlug);

  // When a tag is active, display it in the heading
  const baseLabel = isAll ? "All Categories" : currentCategory?.name || safeSlug;
  const catName   = urlTag
    ? `${baseLabel} — ${urlTag.charAt(0).toUpperCase() + urlTag.slice(1)}`
    : baseLabel;

  // ── Server-side fetch ─────────────────────────────────────────────────────
  const brandParam = selectedBrands.length > 0 ? selectedBrands.join(",") : undefined;

  const { data: productsData, isLoading, isFetching } = useListProducts({
    category:  isAll ? undefined : safeSlug,
    tag:       urlTag,
    sort:      sortBy,
    minPrice:  committedPrice[0] > PRICE_MIN ? committedPrice[0] : undefined,
    maxPrice:  committedPrice[1] < PRICE_MAX ? committedPrice[1] : undefined,
    brand:     brandParam,
    page:      currentPage,
    limit:     PRODUCTS_PER_PAGE,
  });

  // ── Parse response ────────────────────────────────────────────────────────
  const products         = toArray(productsData);
  const serverPagination = (productsData as any)?.pagination;
  const totalCount       = serverPagination?.total     ?? products.length;
  const totalPages       = serverPagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE));
  const safePage         = serverPagination?.page       ?? currentPage;

  // ── Available brands — unfiltered fetch for sidebar list ──────────────────
  const { data: allForBrands } = useListProducts({
    category: isAll ? undefined : safeSlug,
    tag:      urlTag,
    limit:    500,
  });
  const availableBrands = useMemo(() => {
    const set = new Set(
      toArray(allForBrands)
        .map((p: any) => p.brand)
        .filter(Boolean) as string[]
    );
    return Array.from(set).sort();
  }, [allForBrands]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleBrand = (brand: string) => {
    setCurrentPage(1);
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setPriceRange([PRICE_MIN, PRICE_MAX]);
    setCommittedPrice([PRICE_MIN, PRICE_MAX]);
    setSelectedBrands([]);
    setSortBy("newest");
    setCurrentPage(1);
  };

  const handlePriceCommit = (v: [number, number]) => {
    setCommittedPrice(v);
    setCurrentPage(1);
  };

  const handleResetPrice = () => {
    setPriceRange([PRICE_MIN, PRICE_MAX]);
    setCommittedPrice([PRICE_MIN, PRICE_MAX]);
    setCurrentPage(1);
  };

  const activeFilterCount =
    selectedBrands.length +
    (committedPrice[0] > PRICE_MIN || committedPrice[1] < PRICE_MAX ? 1 : 0);

  const filterProps: FilterContentProps = {
    priceRange,
    committedPrice,
    availableBrands,
    selectedBrands,
    onPriceChange:  setPriceRange,
    onPriceCommit:  handlePriceCommit,
    onResetPrice:   handleResetPrice,
    onToggleBrand:  toggleBrand,
    onClearBrands:  () => { setSelectedBrands([]); setCurrentPage(1); },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <a href="/" className="hover:text-primary">Home</a>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">{baseLabel}</span>
          {urlTag && (
            <>
              <ChevronRight size={14} />
              <span className="text-gray-900 font-medium capitalize">{urlTag}</span>
            </>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border p-6 sticky top-32">
              <div className="flex items-center gap-2 mb-6 text-gray-900">
                <Filter size={20} />
                <h2 className="font-bold text-lg">Filters</h2>
              </div>
              <FilterContent {...filterProps} />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header & Controls */}
            <div className="bg-white rounded-xl border p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{catName}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {isLoading || isFetching
                    ? "Loading..."
                    : `${totalCount.toLocaleString()} product${totalCount !== 1 ? "s" : ""}`}
                </p>

                {/* Tag pill — click to remove */}
                {urlTag && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {urlTag}
                      <a href={`/category/${safeSlug}`} className="ml-1 hover:text-orange-900">
                        <X size={11} />
                      </a>
                    </span>
                  </div>
                )}

                {/* Active brand pills */}
                {selectedBrands.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedBrands.map((b) => (
                      <span
                        key={b}
                        onClick={() => toggleBrand(b)}
                        className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer hover:bg-orange-200"
                      >
                        {b} ✕
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile filter sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="md:hidden flex items-center gap-2">
                      <SlidersHorizontal size={16} />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="ml-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px]">
                    <SheetHeader className="mb-6">
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <FilterContent {...filterProps} />
                  </SheetContent>
                </Sheet>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                  <Select
                    value={sortBy}
                    onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}
                  >
                    <SelectTrigger className="w-[170px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest Arrivals</SelectItem>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Top Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-[340px] w-full rounded-xl" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className={`relative transition-opacity ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product: any) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                <div className="bg-white rounded-xl border mt-6 px-4 py-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Page {safePage} of {totalPages}</span>
                    <span>
                      {((safePage - 1) * PRODUCTS_PER_PAGE) + 1}–
                      {Math.min(safePage * PRODUCTS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} products
                    </span>
                  </div>
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <Filter size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your filters or search criteria</p>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
