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
  color?: string | null;
  storage?: string | null;
}

export interface AdminOrder {
  id: number;
  orderCode: string;
  status: OrderStatus;
  total: number;
  deliveryCharge: number;
  paymentMethod: string; // "cod" | "online"
  paymentChannel: string | null; // "bkash" | "nagad" | "rocket"
  transactionId: string | null;
  senderNumber: string | null;
  paymentStatus: "pending" | "verified" | "rejected";
  customerName: string;
  customerPhone: string;
  shippingAddress: Record<string, any>;
  items: AdminOrderItem[];
  notifiedAt?: string | null;
  createdAt?: string | null;
}

export interface PaymentMethodConfig { enabled: boolean; number?: string }
export interface PaymentsConfig {
  cod: { enabled: boolean };
  bkash: PaymentMethodConfig;
  nagad: PaymentMethodConfig;
  rocket: PaymentMethodConfig;
}
export interface AdminSettings {
  codChargeDhaka: number;
  codChargeOutside: number;
  payments: PaymentsConfig;
  whatsappNumber: string;
  email: string;
  address: string;
  smsSenderId: string;
  facebook: string;
  instagram: string;
  youtube: string;
  aboutUs: string;
  contactUs: string;
}

export const ADMIN_PERMISSIONS = ["products", "orders", "reviews", "flash_sale", "policies", "settings", "import"] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];
export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  products: "Products", orders: "Orders", reviews: "Reviews", flash_sale: "Flash Sale", policies: "Policies", settings: "Settings", import: "Import",
};

export interface Policy {
  id: number;
  slug: string;
  title: string;
  content: string;
  enabled: boolean;
  sortOrder: number;
  updatedAt?: string | null;
}
export interface PolicyInput { title: string; content: string; enabled: boolean; sortOrder: number }

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
  createdAt?: string | null;
}

export interface FlashSaleItemInput { productId: number; percent: number }
export interface FlashSaleAdmin {
  endsAt: string | null;
  active: boolean;
  items: { productId: number; percent: number; name: string; price: number; image: string }[];
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
  updatePaymentStatus: (id: number, paymentStatus: "pending" | "verified" | "rejected") =>
    jsonFetch<AdminOrder>(`/api/admin/orders/${id}/payment`, {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus }),
    }),
  deleteOrder: (id: number) =>
    jsonFetch<{ id: number }>(`/api/admin/orders/${id}`, { method: "DELETE" }),

  // Settings
  getSettings: () => jsonFetch<AdminSettings>(`/api/admin/settings`),
  updateSettings: (body: AdminSettings) =>
    jsonFetch<{ ok: boolean }>(`/api/admin/settings`, { method: "PUT", body: JSON.stringify(body) }),

  // Admin management (super admin only)
  listAdmins: () => jsonFetch<{ admins: AdminUser[] }>(`/api/admin/admins`),
  createAdmin: (body: { name: string; email: string; password: string; permissions: AdminPermission[] }) =>
    jsonFetch<AdminUser>(`/api/admin/admins`, { method: "POST", body: JSON.stringify(body) }),
  updateAdmin: (id: number, permissions: AdminPermission[]) =>
    jsonFetch<AdminUser>(`/api/admin/admins/${id}`, { method: "PATCH", body: JSON.stringify({ permissions }) }),
  removeAdmin: (id: number) =>
    jsonFetch<{ id: number }>(`/api/admin/admins/${id}`, { method: "DELETE" }),

  // Flash sale
  getFlashSale: () => jsonFetch<FlashSaleAdmin>(`/api/admin/flash-sale`),
  setFlashSale: (hours: number, items: FlashSaleItemInput[]) =>
    jsonFetch<{ ok: boolean; endsAt: string }>(`/api/admin/flash-sale`, { method: "PUT", body: JSON.stringify({ hours, items }) }),
  endFlashSale: () => jsonFetch<{ ok: boolean }>(`/api/admin/flash-sale`, { method: "DELETE" }),

  // Policies
  listPolicies: () => jsonFetch<{ policies: Policy[] }>(`/api/admin/policies`),
  createPolicy: (body: PolicyInput) => jsonFetch<Policy>(`/api/admin/policies`, { method: "POST", body: JSON.stringify(body) }),
  updatePolicy: (id: number, body: PolicyInput) => jsonFetch<Policy>(`/api/admin/policies/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePolicy: (id: number) => jsonFetch<{ id: number }>(`/api/admin/policies/${id}`, { method: "DELETE" }),
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
