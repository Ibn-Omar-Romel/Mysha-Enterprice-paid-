// Types + API helpers for the admin panel and the redesigned product page.
// Uses plain fetch with credentials so the session cookie is sent (same pattern
// the reviews feature already uses), avoiding the generated client codegen step.

export interface ProductColor {
  name: string;
  hex?: string;
  image?: string;
}

/** The store's real product categories (slug + display name). No "All Categories". */
export const CATEGORY_OPTIONS: { slug: string; name: string }[] = [
  { slug: "phones", name: "Phones" },
  { slug: "tablets", name: "Tablets & Accessories" },
  { slug: "laptops", name: "Computer & Laptops" },
  { slug: "gadgets", name: "Gadgets & Accessories" },
  { slug: "home-appliances", name: "Home Appliances" },
];

export interface ProductStorageOption {
  label: string;
  price: number;
  oldPrice?: number | null;
  stock?: number | null;
}

export interface ProductSpec {
  label: string;
  value: string;
}

/** Full product shape returned by GET /api/products/:id (extended fields). */
export interface ProductDetail {
  id: number;
  name: string;
  price: number;
  oldPrice?: number | null;
  cashPrice?: number | null;
  discount?: number;
  image: string;
  images?: string[];
  rating: number;
  tag?: string | null;
  category: string;
  brand: string;
  model?: string | null;
  code?: string | null;
  inStock: boolean;
  description?: string;
  colors?: ProductColor[];
  storageOptions?: ProductStorageOption[];
  specifications?: ProductSpec[];
  deliveryTime?: string;
  whatsappNumber?: string | null;
  createdAt?: string | null;
}

/** Payload sent to create/update a product from the admin form. */
export interface ProductInput {
  name: string;
  brand: string;
  model?: string;
  category: string;
  code?: string;
  price: number;
  oldPrice?: number | null;
  cashPrice?: number | null;
  discount?: number;
  rating?: number;
  tag?: string;
  image: string;
  images?: string[];
  inStock?: boolean;
  description?: string;
  colors?: ProductColor[];
  storageOptions?: ProductStorageOption[];
  specifications?: ProductSpec[];
  deliveryTime?: string;
  whatsappNumber?: string;
}

export interface AdminProductListItem {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  image: string;
  inStock: boolean;
  code?: string | null;
  createdAt?: string | null;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
      if (data.details?.fieldErrors) {
        const fields = Object.entries(data.details.fieldErrors)
          .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
          .join("; ");
        if (fields) message = `${message} — ${fields}`;
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface AdminReview {
  id: number;
  productId: number;
  productName: string;
  reviewerName: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  verified: boolean;
  createdAt?: string | null;
}

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "packed", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface AdminOrderItem {
  name: string;
  price: number;
  quantity: number;
  image: string;
  brand: string;
}

export interface AdminOrder {
  id: number;
  orderCode: string;
  status: OrderStatus;
  total: number;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: Record<string, any>;
  items: AdminOrderItem[];
  notifiedAt?: string | null;
  createdAt?: string | null;
}

export const adminApi = {
  list: (q?: string) =>
    jsonFetch<{ products: AdminProductListItem[] }>(
      `/api/admin/products${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),
  get: (id: number) => jsonFetch<ProductDetail>(`/api/admin/products/${id}`),
  create: (body: ProductInput) =>
    jsonFetch<{ id: number }>(`/api/admin/products`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: number, body: ProductInput) =>
    jsonFetch<{ id: number }>(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    jsonFetch<{ id: number }>(`/api/admin/products/${id}`, { method: "DELETE" }),

  bulkCreate: (products: ProductInput[]) =>
    jsonFetch<{ created: number; failed: { row: number; name: string; error: string }[] }>(
      `/api/admin/products/bulk`,
      { method: "POST", body: JSON.stringify({ products }) },
    ),

  // Reviews
  listReviews: () => jsonFetch<{ reviews: AdminReview[] }>(`/api/admin/reviews`),
  deleteReview: (id: number) =>
    jsonFetch<{ id: number }>(`/api/admin/reviews/${id}`, { method: "DELETE" }),

  // Orders
  listOrders: (status?: string) =>
    jsonFetch<{ orders: AdminOrder[] }>(
      `/api/admin/orders${status && status !== "all" ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  updateOrderStatus: (id: number, status: OrderStatus) =>
    jsonFetch<AdminOrder & { notification?: { sent: boolean; reason?: string } | null }>(
      `/api/admin/orders/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    ),
};

/** Default spec rows pre-filled when creating a new product (matches the brief). */
export const DEFAULT_SPEC_LABELS = [
  "Brand",
  "Model",
  "Network",
  "Dimensions",
  "SIM",
  "Display Type",
  "Display Size",
  "Chipset",
  "CPU",
  "Display Resolution",
  "OS",
  "Memory",
  "Main Camera",
  "Selfie Camera",
  "Sound",
  "Battery Info",
  "Sensors",
];
