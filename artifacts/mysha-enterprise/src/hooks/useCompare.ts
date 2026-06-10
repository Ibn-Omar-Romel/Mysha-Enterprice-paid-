import { useState, useEffect, useCallback } from "react";

export interface CompareProduct {
  id: number;
  name: string;
  price: number;
  oldPrice: number | null;
  discount: number;
  image: string;
  rating: number;
  category: string;
  brand: string;
  inStock: boolean;
  description: string;
}

const STORAGE_KEY = "mysha_compare";
const MAX_COMPARE = 4;

function load(): CompareProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items: CompareProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type Listener = (items: CompareProduct[]) => void;
const listeners = new Set<Listener>();
let globalItems: CompareProduct[] = load();

function notify() {
  listeners.forEach(fn => fn([...globalItems]));
}

export function useCompare() {
  const [items, setItems] = useState<CompareProduct[]>(() => [...globalItems]);

  useEffect(() => {
    const handler: Listener = (updated) => setItems(updated);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const addToCompare = useCallback((product: CompareProduct) => {
    if (globalItems.some(p => p.id === product.id)) return;
    if (globalItems.length >= MAX_COMPARE) {
      return "max";
    }
    globalItems = [...globalItems, product];
    save(globalItems);
    notify();
    return "added";
  }, []);

  const removeFromCompare = useCallback((id: number) => {
    globalItems = globalItems.filter(p => p.id !== id);
    save(globalItems);
    notify();
  }, []);

  const clearCompare = useCallback(() => {
    globalItems = [];
    save(globalItems);
    notify();
  }, []);

  const isInCompare = useCallback((id: number) => {
    return globalItems.some(p => p.id === id);
  }, [items]);

  return { items, addToCompare, removeFromCompare, clearCompare, isInCompare, max: MAX_COMPARE };
}
