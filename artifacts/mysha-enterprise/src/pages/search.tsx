import { useSearch, Link } from "wouter";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, SlidersHorizontal, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useMemo } from "react";
import { formatBDT } from "@/lib/format";
import { toArray } from "@/lib/data";

export default function SearchPage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const query = searchParams.get("q") || "";

  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const { data: productsRaw, isLoading } = useListProducts(
    {
      search: query,
      sort: sortBy,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
    },
    { query: { enabled: !!query } },
  );

  // Always a safe array — never call .filter directly on the raw response
  const products = toArray(productsRaw);

  const filteredProducts = useMemo(() => {
    if (selectedBrands.length === 0) return products;
    return products.filter(
      (p: any) => p.brand && selectedBrands.includes(p.brand),
    );
  }, [products, selectedBrands]);

  const availableBrands = useMemo(() => {
    const set = new Set(
      products.map((p: any) => p.brand).filter(Boolean) as string[],
    );
    return Array.from(set).sort();
  }, [products]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );
  };

  const clearFilters = () => {
    setPriceRange([0, 200000]);
    setSelectedBrands([]);
    setSortBy("newest");
  };

  const hasActiveFilters =
    priceRange[0] > 0 || priceRange[1] < 200000 || selectedBrands.length > 0;

  const FilterContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-base text-gray-900 mb-4">Price Range</h3>
        <Slider
          defaultValue={[0, 200000]}
          max={200000}
          step={1000}
          value={priceRange}
          onValueChange={setPriceRange}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{formatBDT(priceRange[0])}</span>
          <span>{formatBDT(priceRange[1])}</span>
        </div>
      </div>

      {availableBrands.length > 0 && (
        <div>
          <h3 className="font-semibold text-base text-gray-900 mb-4">Brands</h3>
          <div className="space-y-3">
            {availableBrands.map((brand) => (
              <div key={brand} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand}`}
                  checked={selectedBrands.includes(brand)}
                  onCheckedChange={() => toggleBrand(brand)}
                />
                <Label
                  htmlFor={`brand-${brand}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {brand}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
          Clear Filters
        </Button>
      )}
    </div>
  );

  if (!query) {
    return (
      <div className="bg-gray-50 min-h-screen py-16">
        <div className="container mx-auto px-4 text-center max-w-lg">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
            <SearchIcon size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Search Products</h1>
          <p className="text-gray-500 mb-8">
            Use the search bar above to find products, brands, and more.
          </p>
          <Link href="/category/all">
            <Button className="px-8">Browse All Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-xl border p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
              <SearchIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Results for <span className="text-primary">&ldquo;{query}&rdquo;</span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isLoading
                  ? "Searching..."
                  : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden flex items-center gap-2">
                  <SlidersHorizontal size={16} />
                  Filters{" "}
                  {hasActiveFilters && (
                    <span className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px]">
                <SheetHeader className="mb-6">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <FilterContent />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 hidden sm:inline">Sort:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {!isLoading && availableBrands.length > 0 && (
            <aside className="hidden md:block w-56 flex-shrink-0">
              <div className="bg-white rounded-xl border p-6 sticky top-32">
                <div className="flex items-center gap-2 mb-6 text-gray-900">
                  <Filter size={18} />
                  <h2 className="font-bold">Filters</h2>
                  {hasActiveFilters && (
                    <span
                      className="ml-auto text-xs text-primary font-medium cursor-pointer hover:underline"
                      onClick={clearFilters}
                    >
                      Clear
                    </span>
                  )}
                </div>
                <FilterContent />
              </div>
            </aside>
          )}

          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-[340px] w-full rounded-xl" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-16 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                  <SearchIcon size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">No results found</h2>
                <p className="text-gray-500 mb-8">
                  {hasActiveFilters
                    ? "No products match your current filters. Try adjusting them."
                    : `We couldn't find any products matching "${query}". Try a different search term.`}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                  <Link href="/">
                    <Button variant="outline">Return Home</Button>
                  </Link>
                  <Link href="/category/all">
                    <Button>Browse All Products</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
