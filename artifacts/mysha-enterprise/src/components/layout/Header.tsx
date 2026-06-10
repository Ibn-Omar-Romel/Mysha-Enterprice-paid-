import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Search, User, Menu, X, Package, Heart, LogOut, LogIn, ChevronDown, BarChart2 } from "lucide-react";
import { useGetCart, useListProducts } from "@workspace/api-client-react";
import { toArray } from "@/lib/data";
import { useWishlist } from "@/hooks/useWishlist";
import { useCompare } from "@/hooks/useCompare";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBDT } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: cart } = useGetCart();
  const { count: wishlistCount } = useWishlist();
  const { items: compareItems } = useCompare();
  const { user, signOut } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: suggestions, isLoading: isSuggestionsLoading } = useListProducts(
    { search: debouncedQuery, limit: 6 },
    { query: { enabled: debouncedQuery.length >= 2 } }
  );

  useEffect(() => {
    if (debouncedQuery.length >= 2) setDropdownOpen(true);
    else setDropdownOpen(false);
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setDropdownOpen(false);
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleSuggestionClick = (productId: number) => {
    setDropdownOpen(false);
    setSearchQuery("");
    setLocation(`/product/${productId}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0d1117] text-white border-b border-gray-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 -ml-2 text-gray-300 hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-lg text-white">M</div>
          <span className="text-xl font-bold tracking-tight hidden sm:block">Mysha<span className="text-primary">Enterprise</span></span>
        </Link>

        {/* Desktop Search with Live Dropdown */}
        <div className="hidden md:flex flex-1 max-w-2xl px-4 relative" ref={searchRef}>
          <form onSubmit={handleSearch} className="w-full relative group">
            <Input
              type="text"
              placeholder="Search for products, brands..."
              className="w-full bg-gray-900 border-gray-700 text-white placeholder:text-gray-400 focus-visible:ring-primary pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => debouncedQuery.length >= 2 && setDropdownOpen(true)}
              onKeyDown={(e) => e.key === "Escape" && setDropdownOpen(false)}
              autoComplete="off"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
              <Search size={18} />
            </button>
          </form>

          {/* Suggestions Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
              {isSuggestionsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : toArray(suggestions).length > 0 ? (
                <>
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Products ({toArray(suggestions).length})
                    </span>
                  </div>
                  <ul>
                    {toArray(suggestions).map((product: any) => (
                      <li key={product.id}>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors text-left group/item"
                          onClick={() => handleSuggestionClick(product.id)}
                        >
                          <div className="w-12 h-12 bg-gray-50 border rounded-lg p-1 flex-shrink-0 flex items-center justify-center">
                            <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover/item:text-primary transition-colors">{product.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{product.brand || product.category}</p>
                          </div>
                          <div className="text-sm font-bold text-primary flex-shrink-0">{formatBDT(product.price)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t">
                    <button
                      className="w-full px-4 py-3 text-sm text-center text-primary font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                      onClick={() => {
                        setDropdownOpen(false);
                        setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                    >
                      <Search size={14} /> See all results for "{searchQuery}"
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-500">No products found for "{debouncedQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          {/* User Account Menu */}
          <div className="relative hidden sm:block" ref={userMenuRef}>
            {user ? (
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 p-2 text-gray-300 hover:text-primary transition-colors rounded-lg hover:bg-gray-800"
                title="My Account"
              >
                <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <Link href="/signin" className="flex items-center gap-1.5 p-2 text-gray-300 hover:text-primary transition-colors" title="Sign In">
                <LogIn size={22} />
              </Link>
            )}

            {userMenuOpen && user && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary transition-colors">
                    <User size={15} /> My Profile
                  </Link>
                  <Link href="/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary transition-colors">
                    <Package size={15} /> My Orders
                  </Link>
                </div>
                <div className="border-t py-1">
                  <button
                    onClick={async () => { setUserMenuOpen(false); await signOut(); setLocation("/"); }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link href="/wishlist" className="p-2 text-gray-300 hover:text-primary transition-colors relative hidden sm:flex" title="Wishlist">
            <Heart size={22} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishlistCount > 9 ? "9+" : wishlistCount}
              </span>
            )}
          </Link>

          <Link href="/compare" className="p-2 text-gray-300 hover:text-primary transition-colors relative hidden sm:flex" title="Compare Products">
            <BarChart2 size={22} />
            {compareItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {compareItems.length}
              </span>
            )}
          </Link>

          <Link href="/cart" className="p-2 text-gray-300 hover:text-primary transition-colors relative flex items-center gap-1.5">
            <div className="relative">
              <ShoppingCart size={22} />
              {(cart?.itemCount || 0) > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0d1117]">
                  {cart?.itemCount}
                </span>
              )}
            </div>
            <span className="hidden lg:block font-medium text-sm">Cart</span>
          </Link>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden p-4 bg-gray-900 border-t border-gray-800">
          <form onSubmit={handleSearch} className="relative mb-4">
            <Input
              type="text"
              placeholder="Search products..."
              className="w-full bg-gray-800 border-gray-700 text-white focus-visible:ring-primary pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={18} />
            </button>
          </form>
          <div className="flex flex-col gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded bg-gray-800 text-white">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">{user.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
                  <User size={18} /> My Profile
                </Link>
              </>
            ) : (
              <>
                <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded bg-primary text-white hover:bg-orange-600 transition-colors font-semibold">
                  <LogIn size={18} /> Sign In
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
                  <User size={18} /> Create Account
                </Link>
              </>
            )}
            <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
              <Heart size={18} /> Wishlist {wishlistCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{wishlistCount}</span>}
            </Link>
            <Link href="/compare" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
              <BarChart2 size={18} /> Compare {compareItems.length > 0 && <span className="ml-auto bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{compareItems.length}</span>}
            </Link>
            <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
              <Package size={18} /> My Orders
            </Link>
            <Link href="/track" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
              <ShoppingCart size={18} /> Track Order
            </Link>
            {user && (
              <button
                onClick={async () => { setMobileMenuOpen(false); await signOut(); setLocation("/"); }}
                className="flex items-center gap-3 p-3 rounded bg-gray-800 text-red-400 hover:bg-gray-700 transition-colors w-full text-left"
              >
                <LogOut size={18} /> Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
