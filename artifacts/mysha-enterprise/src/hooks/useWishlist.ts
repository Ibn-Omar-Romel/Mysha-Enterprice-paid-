import { useState, useEffect, useCallback } from "react";

const WISHLIST_KEY = "mysha_wishlist";

export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      // Normalize to numbers — guards against previously stored string IDs
      return Array.isArray(parsed)
        ? parsed.map(Number).filter(Number.isFinite)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  // Accept number | string so callers passing a DB-returned string ID still work
  const toggleWishlist = useCallback((id: number | string) => {
    const numId = Number(id);
    setWishlistIds(prev =>
      prev.some(i => i === numId)
        ? prev.filter(i => i !== numId)
        : [...prev, numId],
    );
  }, []);

  const isWishlisted = useCallback(
    (id: number | string) => wishlistIds.some(i => i === Number(id)),
    [wishlistIds],
  );

  const clearWishlist = useCallback(() => setWishlistIds([]), []);

  return { wishlistIds, toggleWishlist, isWishlisted, clearWishlist, count: wishlistIds.length };
}
