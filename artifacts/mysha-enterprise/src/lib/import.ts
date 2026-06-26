// CSV parsing + mapping for the admin bulk product import.
// The CSV your distributor gives you (or one you fill from their data) is parsed
// here into ProductInput rows. Nested fields (gallery images, colours, storage,
// specs) use simple in-cell encodings documented in CSV_TEMPLATE below.

import { CATEGORY_OPTIONS, type ProductInput, type ProductColor, type ProductStorageOption, type ProductSpec } from "./admin";

/** Minimal RFC-4180 CSV parser (handles quoted fields, commas and newlines in quotes). */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const cells: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); cells.push(row); row = []; };

  const t = text.replace(/^﻿/, ""); // strip BOM
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") pushField();
      else if (c === "\n") pushRow();
      else if (c === "\r") { /* ignore, handled by \n */ }
      else field += c;
    }
  }
  // last field/row if file doesn't end with newline
  if (field.length > 0 || row.length > 0) pushRow();

  const nonEmpty = cells.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h.toLowerCase()] = (r[idx] ?? "").trim(); });
    return obj;
  });
  return { headers, rows };
}

function num(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function splitList(v: string | undefined): string[] {
  if (!v) return [];
  return v.split("|").map((s) => s.trim()).filter(Boolean);
}

function normalizeCategory(v: string | undefined): string {
  const s = (v ?? "").trim().toLowerCase();
  const bySlug = CATEGORY_OPTIONS.find((c) => c.slug === s);
  if (bySlug) return bySlug.slug;
  const byName = CATEGORY_OPTIONS.find((c) => c.name.toLowerCase() === s);
  if (byName) return byName.slug;
  // common aliases
  if (["mobile", "mobile phone", "phone", "smartphone"].includes(s)) return "phones";
  if (["laptop", "computer", "computer & laptop"].includes(s)) return "laptops";
  if (["tablet"].includes(s)) return "tablets";
  if (["gadget", "accessories", "accessory"].includes(s)) return "gadgets";
  if (["home appliance", "appliance", "appliances"].includes(s)) return "home-appliances";
  return s;
}

/** Map one parsed CSV row to a ProductInput, or return an error string. */
export function rowToProductInput(row: Record<string, string>): { product?: ProductInput; error?: string } {
  const name = row["name"] || "";
  const brand = row["brand"] || "";
  const category = normalizeCategory(row["category"]);
  const image = row["image"] || "";
  const price = num(row["price"]);

  const missing: string[] = [];
  if (!name) missing.push("name");
  if (!brand) missing.push("brand");
  if (!category) missing.push("category");
  if (!image) missing.push("image");
  if (price == null) missing.push("price");
  if (missing.length) return { error: `Missing/invalid: ${missing.join(", ")}` };

  if (!CATEGORY_OPTIONS.some((c) => c.slug === category)) {
    return { error: `Unknown category "${row["category"]}" (use: ${CATEGORY_OPTIONS.map((c) => c.slug).join(", ")})` };
  }

  // colours: "Name;hex;imageUrl" entries separated by |
  const colors: ProductColor[] = splitList(row["colors"]).map((entry) => {
    const [cname, hex, img] = entry.split(";").map((s) => s.trim());
    return { name: cname, hex: hex || undefined, image: img || undefined };
  }).filter((c) => c.name);

  // storage: "Label;price;oldPrice;stock" entries separated by |
  const storageOptions: ProductStorageOption[] = splitList(row["storage"]).map((entry) => {
    const [label, p, op, st] = entry.split(";").map((s) => s.trim());
    return { label, price: num(p) ?? 0, oldPrice: num(op), stock: num(st) };
  }).filter((s) => s.label);

  // specs: "Label:Value" entries separated by |
  const specifications: ProductSpec[] = splitList(row["specs"]).map((entry) => {
    const idx = entry.indexOf(":");
    if (idx === -1) return { label: entry.trim(), value: "" };
    return { label: entry.slice(0, idx).trim(), value: entry.slice(idx + 1).trim() };
  }).filter((s) => s.label && s.value);

  const product: ProductInput = {
    name, brand, category,
    model: row["model"] || undefined,
    code: row["code"] || undefined,
    price: price!,
    oldPrice: num(row["oldprice"]),
    cashPrice: num(row["cashprice"]),
    discount: num(row["discount"]) ?? 0,
    rating: num(row["rating"]) ?? 4.5,
    tag: row["tag"] || undefined,
    image,
    images: splitList(row["images"]),
    inStock: /^(no|false|0|out)$/i.test(row["instock"] || "") ? false : true,
    description: row["description"] || undefined,
    colors,
    storageOptions,
    specifications,
    deliveryTime: row["deliverytime"] || undefined,
    whatsappNumber: row["whatsapp"] || undefined,
  };
  return { product };
}

/** Downloadable template with one example row. */
export const CSV_TEMPLATE = [
  "name,brand,category,model,code,price,oldPrice,cashPrice,discount,rating,tag,inStock,description,deliveryTime,image,images,colors,storage,specs",
  `Pixel 9 Pro XL,Google,phones,Pixel 9 Pro XL,1-15,78999,105000,78999,25,4.8,Best Seller,yes,Premium smartphone,3-5 Days,https://yourcdn.com/pixel-front.jpg,https://yourcdn.com/pixel-back.jpg|https://yourcdn.com/pixel-side.jpg,Hazel;#9b9586;https://yourcdn.com/pixel-hazel.jpg|Obsidian;#1c1c1c;https://yourcdn.com/pixel-obsidian.jpg,128GB;78999;105000;10|256GB;84999;110000;5,Network:5G|Display:6.8 inch LTPO OLED|Chipset:Google Tensor G4|Battery:5060 mAh`,
].join("\n");
