/**
 * Safe array extractor — handles every API response shape the backend may return.
 *
 * Use this before calling .map / .filter / .find / .slice / .length on any
 * value that comes from an API hook. Never rely on optional-chaining alone.
 *
 * @example
 *   const products   = toArray(productsData);   // always Product[]
 *   const categories = toArray(categoriesData); // always Category[]
 */
export function toArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const v = value as Record<string, unknown>;
  if (Array.isArray(v.data))        return v.data        as T[];
  if (Array.isArray(v.items))       return v.items       as T[];
  if (Array.isArray(v.products))    return v.products    as T[];
  if (Array.isArray(v.categories))  return v.categories  as T[];
  if (Array.isArray(v.deals))       return v.deals       as T[];
  if (Array.isArray(v.trends))      return v.trends      as T[];
  if (Array.isArray(v.selling))     return v.selling     as T[];
  if (Array.isArray(v.arrival))     return v.arrival     as T[];
  if (Array.isArray(v.topSelling))  return v.topSelling  as T[];
  if (Array.isArray(v.newArrivals)) return v.newArrivals as T[];
  if (Array.isArray(v.cartItems))   return v.cartItems   as T[];
  if (Array.isArray(v.results))     return v.results     as T[];
  return [];
}

/**
 * Safely pick the first matching array property from a featured API response
 * that varies between environments (trends | deals | selling | arrival).
 */
export function extractFeaturedSection(
  featured: unknown,
  keys: string[],
  fallback: unknown[] = [],
): any[] {
  if (!featured || typeof featured !== "object") return fallback as any[];
  const f = featured as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(f[key]) && (f[key] as unknown[]).length > 0) {
      return f[key] as any[];
    }
  }
  return fallback as any[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Safely extract pagination metadata from any API response shape.
 *
 * Handles:
 *   { pagination: { page, limit, total, totalPages } }  ← preferred backend shape
 *   { meta: { ... } }
 *   { page, limit, total, totalPages }                  ← flat shape
 *
 * @example
 *   const pagination = toPagination(productsData);
 *   // → { page: 1, limit: 24, total: 120, totalPages: 5 }
 */
export function toPagination(value: unknown, limitFallback = 24): PaginationMeta {
  const defaults: PaginationMeta = { page: 1, limit: limitFallback, total: 0, totalPages: 0 };
  if (!value || typeof value !== "object") return defaults;
  const v = value as Record<string, unknown>;

  // Unwrap nested pagination / meta block if present
  const src = (
    (v.pagination && typeof v.pagination === "object" ? v.pagination : null) ??
    (v.meta       && typeof v.meta       === "object" ? v.meta       : null) ??
    v
  ) as Record<string, unknown>;

  const page       = toSafeInt(src.page,       defaults.page);
  const limit      = toSafeInt(src.limit,      defaults.limit);
  const total      = toSafeInt(src.total,      defaults.total);
  // Derive totalPages if the backend omitted it
  const totalPages = toSafeInt(
    src.totalPages ?? src.total_pages ?? src.pages,
    total > 0 && limit > 0 ? Math.ceil(total / limit) : defaults.totalPages,
  );

  return { page, limit, total, totalPages };
}

// ─────────────────────────────────────────────────────────────────────────────
// Number helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an unknown value to a safe integer >= 0.
 * Returns `fallback` when the value is missing, NaN, Infinity, or negative.
 */
export function toSafeInt(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/**
 * Parse an unknown value to a safe finite number >= 0.
 * Returns `fallback` when the value is missing, NaN, Infinity, or negative.
 */
export function toSafeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}