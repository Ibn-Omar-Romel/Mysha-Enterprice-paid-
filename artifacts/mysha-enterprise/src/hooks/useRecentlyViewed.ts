import { useState, useEffect, useCallback } from "react";

const KEY = "mysha_recently_viewed";
const MAX = 8;

export function useRecentlyViewed() {
  const [ids, setIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(ids));
  }, [ids]);

  const addViewed = useCallback((id: number) => {
    setIds(prev => {
      const filtered = prev.filter(i => i !== id);
      return [id, ...filtered].slice(0, MAX);
    });
  }, []);

  return { ids, addViewed };
}
