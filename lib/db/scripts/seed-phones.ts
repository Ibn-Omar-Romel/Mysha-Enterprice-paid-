/**
 * Seeds a starter catalog of popular phones with factual specifications.
 *
 * These are public technical facts (display, chipset, RAM, battery, cameras) — no
 * copyrighted descriptions or images are used. Each product gets a neutral "Add
 * image" placeholder and placeholder prices for you to edit in the admin panel.
 *
 * Run:  DATABASE_URL=... pnpm --filter @workspace/db seed:phones
 * Safe to run repeatedly — skips any phone whose name already exists.
 */
import { db, productsTable } from "../src/index";
import { eq } from "drizzle-orm";

const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#f1f5f9"/><text x="200" y="205" font-family="Arial,sans-serif" font-size="22" fill="#94a3b8" text-anchor="middle">Add image</text></svg>';
const PLACEHOLDER_IMAGE = "data:image/svg+xml;base64," + Buffer.from(PLACEHOLDER_SVG).toString("base64");

type Phone = {
  name: string;
  brand: string;
  model: string;
  rating?: string;
  tag?: string;
  colors: { name: string; hex: string }[];
  storage: { label: string; price: number }[]; // price = placeholder BDT, edit later
  specs: { label: string; value: string }[];
};

const PHONES: Phone[] = [
  {
    name: "Apple iPhone 16 Pro Max", brand: "Apple", model: "iPhone 16 Pro Max", rating: "4.9", tag: "Best Seller",
    colors: [
      { name: "Desert Titanium", hex: "#c8a97e" }, { name: "Natural Titanium", hex: "#b6b2a8" },
      { name: "White Titanium", hex: "#e8e6e1" }, { name: "Black Titanium", hex: "#2b2b2b" },
    ],
    storage: [{ label: "256GB", price: 185000 }, { label: "512GB", price: 210000 }, { label: "1TB", price: 240000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.9 inch LTPO Super Retina XDR OLED, 120Hz" },
      { label: "Chipset", value: "Apple A18 Pro" }, { label: "Memory", value: "8GB RAM" },
      { label: "Main Camera", value: "48 MP + 48 MP ultrawide + 12 MP periscope telephoto (5x)" },
      { label: "Selfie Camera", value: "12 MP" }, { label: "Battery", value: "4685 mAh, USB Type-C" }, { label: "OS", value: "iOS 18" },
    ],
  },
  {
    name: "Apple iPhone 16 Pro", brand: "Apple", model: "iPhone 16 Pro", rating: "4.9", tag: "Best Seller",
    colors: [{ name: "Desert Titanium", hex: "#c8a97e" }, { name: "Natural Titanium", hex: "#b6b2a8" }, { name: "Black Titanium", hex: "#2b2b2b" }],
    storage: [{ label: "128GB", price: 155000 }, { label: "256GB", price: 168000 }, { label: "512GB", price: 192000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.3 inch LTPO Super Retina XDR OLED, 120Hz" },
      { label: "Chipset", value: "Apple A18 Pro" }, { label: "Memory", value: "8GB RAM" },
      { label: "Main Camera", value: "48 MP + 48 MP ultrawide + 12 MP telephoto (5x)" }, { label: "Battery", value: "3582 mAh, USB Type-C" }, { label: "OS", value: "iOS 18" },
    ],
  },
  {
    name: "Apple iPhone 16", brand: "Apple", model: "iPhone 16", rating: "4.8", tag: "New",
    colors: [{ name: "Ultramarine", hex: "#4f6bd8" }, { name: "Teal", hex: "#7fb0a8" }, { name: "Pink", hex: "#f3d0d8" }, { name: "Black", hex: "#1c1c1c" }],
    storage: [{ label: "128GB", price: 125000 }, { label: "256GB", price: 138000 }, { label: "512GB", price: 162000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.1 inch Super Retina XDR OLED, 60Hz" },
      { label: "Chipset", value: "Apple A18" }, { label: "Memory", value: "8GB RAM" },
      { label: "Main Camera", value: "48 MP + 12 MP ultrawide" }, { label: "Battery", value: "3561 mAh, USB Type-C" }, { label: "OS", value: "iOS 18" },
    ],
  },
  {
    name: "Apple iPhone 15", brand: "Apple", model: "iPhone 15", rating: "4.7",
    colors: [{ name: "Blue", hex: "#cdd9df" }, { name: "Pink", hex: "#f3d0d8" }, { name: "Green", hex: "#cdd8c4" }, { name: "Black", hex: "#1c1c1c" }],
    storage: [{ label: "128GB", price: 110000 }, { label: "256GB", price: 123000 }, { label: "512GB", price: 147000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.1 inch Super Retina XDR OLED, 60Hz" },
      { label: "Chipset", value: "Apple A16 Bionic" }, { label: "Memory", value: "6GB RAM" },
      { label: "Main Camera", value: "48 MP + 12 MP ultrawide" }, { label: "Battery", value: "3349 mAh, USB Type-C" }, { label: "OS", value: "iOS 17" },
    ],
  },
  {
    name: "Apple iPhone 14", brand: "Apple", model: "iPhone 14", rating: "4.6",
    colors: [{ name: "Midnight", hex: "#1c1c2e" }, { name: "Starlight", hex: "#e8e2d0" }, { name: "Blue", hex: "#a7c1d9" }, { name: "Purple", hex: "#d8d0e8" }],
    storage: [{ label: "128GB", price: 95000 }, { label: "256GB", price: 108000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.1 inch Super Retina XDR OLED, 60Hz" },
      { label: "Chipset", value: "Apple A15 Bionic" }, { label: "Memory", value: "6GB RAM" },
      { label: "Main Camera", value: "12 MP + 12 MP ultrawide" }, { label: "Battery", value: "3279 mAh, Lightning" }, { label: "OS", value: "iOS 16" },
    ],
  },
  {
    name: "Samsung Galaxy S24 Ultra", brand: "Samsung", model: "Galaxy S24 Ultra", rating: "4.8", tag: "Best Seller",
    colors: [{ name: "Titanium Black", hex: "#3a3a3a" }, { name: "Titanium Gray", hex: "#8a8a8a" }, { name: "Titanium Violet", hex: "#cfc6dd" }, { name: "Titanium Yellow", hex: "#e7d9a8" }],
    storage: [{ label: "256GB", price: 165000 }, { label: "512GB", price: 178000 }, { label: "1TB", price: 205000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.8 inch QHD+ Dynamic AMOLED 2X, 120Hz" },
      { label: "Chipset", value: "Snapdragon 8 Gen 3 for Galaxy" }, { label: "Memory", value: "12GB RAM" },
      { label: "Main Camera", value: "200 MP + 50 MP + 12 MP ultrawide + 10 MP" }, { label: "Battery", value: "5000 mAh, 45W wired" }, { label: "OS", value: "Android 14, One UI 6.1" },
    ],
  },
  {
    name: "Samsung Galaxy S24", brand: "Samsung", model: "Galaxy S24", rating: "4.7",
    colors: [{ name: "Onyx Black", hex: "#2b2b2b" }, { name: "Marble Gray", hex: "#9a9a9a" }, { name: "Cobalt Violet", hex: "#b7add4" }, { name: "Amber Yellow", hex: "#e7d9a8" }],
    storage: [{ label: "128GB", price: 95000 }, { label: "256GB", price: 105000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.2 inch FHD+ Dynamic AMOLED 2X, 120Hz" },
      { label: "Chipset", value: "Exynos 2400 / Snapdragon 8 Gen 3" }, { label: "Memory", value: "8GB RAM" },
      { label: "Main Camera", value: "50 MP + 12 MP ultrawide + 10 MP telephoto" }, { label: "Battery", value: "4000 mAh, 25W wired" }, { label: "OS", value: "Android 14, One UI 6.1" },
    ],
  },
  {
    name: "Samsung Galaxy A55", brand: "Samsung", model: "Galaxy A55", rating: "4.5",
    colors: [{ name: "Awesome Iceblue", hex: "#bcd6e3" }, { name: "Awesome Lilac", hex: "#cfc1e0" }, { name: "Awesome Navy", hex: "#2c3550" }, { name: "Awesome Lemon", hex: "#e8e09a" }],
    storage: [{ label: "8GB/128GB", price: 47000 }, { label: "8GB/256GB", price: 52000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.6 inch FHD+ Super AMOLED, 120Hz" },
      { label: "Chipset", value: "Exynos 1480" }, { label: "Memory", value: "8GB RAM" },
      { label: "Main Camera", value: "50 MP + 12 MP ultrawide + 5 MP macro" }, { label: "Battery", value: "5000 mAh, 25W wired" }, { label: "OS", value: "Android 14, One UI 6.1" },
    ],
  },
  {
    name: "Samsung Galaxy A35", brand: "Samsung", model: "Galaxy A35", rating: "4.4",
    colors: [{ name: "Awesome Iceblue", hex: "#bcd6e3" }, { name: "Awesome Lilac", hex: "#cfc1e0" }, { name: "Awesome Navy", hex: "#2c3550" }],
    storage: [{ label: "8GB/128GB", price: 38000 }, { label: "8GB/256GB", price: 43000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.6 inch FHD+ Super AMOLED, 120Hz" },
      { label: "Chipset", value: "Exynos 1380" }, { label: "Memory", value: "8GB RAM" },
      { label: "Main Camera", value: "50 MP + 8 MP ultrawide + 5 MP macro" }, { label: "Battery", value: "5000 mAh, 25W wired" }, { label: "OS", value: "Android 14, One UI 6.1" },
    ],
  },
  {
    name: "Samsung Galaxy A15", brand: "Samsung", model: "Galaxy A15", rating: "4.3",
    colors: [{ name: "Blue Black", hex: "#2a2f3a" }, { name: "Blue", hex: "#7fa8d0" }, { name: "Yellow", hex: "#e8d98a" }],
    storage: [{ label: "6GB/128GB", price: 22000 }, { label: "8GB/256GB", price: 26000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.5 inch FHD+ Super AMOLED, 90Hz" },
      { label: "Chipset", value: "MediaTek Helio G99 / Dimensity 6100+" }, { label: "Memory", value: "6/8GB RAM" },
      { label: "Main Camera", value: "50 MP + 5 MP ultrawide + 2 MP macro" }, { label: "Battery", value: "5000 mAh, 25W wired" }, { label: "OS", value: "Android 14, One UI 6" },
    ],
  },
  {
    name: "Google Pixel 9 Pro", brand: "Google", model: "Pixel 9 Pro", rating: "4.7",
    colors: [{ name: "Obsidian", hex: "#1c1c1c" }, { name: "Porcelain", hex: "#ece9e2" }, { name: "Hazel", hex: "#9b9586" }, { name: "Rose Quartz", hex: "#f6cdd6" }],
    storage: [{ label: "128GB", price: 135000 }, { label: "256GB", price: 145000 }, { label: "512GB", price: 165000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.3 inch LTPO OLED, 120Hz" },
      { label: "Chipset", value: "Google Tensor G4" }, { label: "Memory", value: "16GB RAM" },
      { label: "Main Camera", value: "50 MP + 48 MP ultrawide + 48 MP telephoto (5x)" }, { label: "Battery", value: "4700 mAh, USB Type-C" }, { label: "OS", value: "Android 14" },
    ],
  },
  {
    name: "Google Pixel 9", brand: "Google", model: "Pixel 9", rating: "4.6",
    colors: [{ name: "Obsidian", hex: "#1c1c1c" }, { name: "Porcelain", hex: "#ece9e2" }, { name: "Wintergreen", hex: "#bcd3c3" }, { name: "Peony", hex: "#f3c9d6" }],
    storage: [{ label: "128GB", price: 105000 }, { label: "256GB", price: 118000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.3 inch Actua OLED, 120Hz" },
      { label: "Chipset", value: "Google Tensor G4" }, { label: "Memory", value: "12GB RAM" },
      { label: "Main Camera", value: "50 MP + 48 MP ultrawide" }, { label: "Battery", value: "4700 mAh, USB Type-C" }, { label: "OS", value: "Android 14" },
    ],
  },
  {
    name: "Google Pixel 8a", brand: "Google", model: "Pixel 8a", rating: "4.5",
    colors: [{ name: "Obsidian", hex: "#1c1c1c" }, { name: "Porcelain", hex: "#ece9e2" }, { name: "Bay", hex: "#9fb8d8" }, { name: "Aloe", hex: "#bcd3a8" }],
    storage: [{ label: "128GB", price: 62000 }, { label: "256GB", price: 70000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.1 inch Actua OLED, 120Hz" },
      { label: "Chipset", value: "Google Tensor G3" }, { label: "Memory", value: "8GB RAM" },
      { label: "Main Camera", value: "64 MP + 13 MP ultrawide" }, { label: "Battery", value: "4492 mAh, USB Type-C" }, { label: "OS", value: "Android 14" },
    ],
  },
  {
    name: "Xiaomi 14", brand: "Xiaomi", model: "Xiaomi 14", rating: "4.6",
    colors: [{ name: "Black", hex: "#1c1c1c" }, { name: "White", hex: "#ece9e2" }, { name: "Jade Green", hex: "#bcd3c3" }],
    storage: [{ label: "12GB/256GB", price: 92000 }, { label: "12GB/512GB", price: 102000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.36 inch LTPO AMOLED, 120Hz" },
      { label: "Chipset", value: "Snapdragon 8 Gen 3" }, { label: "Memory", value: "12GB RAM" },
      { label: "Main Camera", value: "50 MP Leica + 50 MP ultrawide + 50 MP telephoto" }, { label: "Battery", value: "4610 mAh, 90W wired" }, { label: "OS", value: "Android 14, HyperOS" },
    ],
  },
  {
    name: "Xiaomi Redmi Note 13 Pro", brand: "Xiaomi", model: "Redmi Note 13 Pro", rating: "4.5",
    colors: [{ name: "Midnight Black", hex: "#1c1c1c" }, { name: "Ocean Teal", hex: "#5e8e96" }, { name: "Lavender Purple", hex: "#cfc1e0" }],
    storage: [{ label: "8GB/256GB", price: 33000 }, { label: "12GB/512GB", price: 40000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.67 inch FHD+ AMOLED, 120Hz" },
      { label: "Chipset", value: "Snapdragon 7s Gen 2" }, { label: "Memory", value: "8/12GB RAM" },
      { label: "Main Camera", value: "200 MP + 8 MP ultrawide + 2 MP macro" }, { label: "Battery", value: "5100 mAh, 67W wired" }, { label: "OS", value: "Android 13, MIUI 14" },
    ],
  },
  {
    name: "Xiaomi Redmi Note 13", brand: "Xiaomi", model: "Redmi Note 13", rating: "4.4",
    colors: [{ name: "Midnight Black", hex: "#1c1c1c" }, { name: "Ice Blue", hex: "#bcd6e3" }, { name: "Mint Green", hex: "#bcd3c3" }],
    storage: [{ label: "6GB/128GB", price: 22000 }, { label: "8GB/256GB", price: 26000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE" }, { label: "Display", value: "6.67 inch FHD+ AMOLED, 120Hz" },
      { label: "Chipset", value: "Snapdragon 685" }, { label: "Memory", value: "6/8GB RAM" },
      { label: "Main Camera", value: "108 MP + 8 MP ultrawide + 2 MP macro" }, { label: "Battery", value: "5000 mAh, 33W wired" }, { label: "OS", value: "Android 13, MIUI 14" },
    ],
  },
  {
    name: "Xiaomi Poco X6 Pro", brand: "Xiaomi", model: "Poco X6 Pro", rating: "4.5",
    colors: [{ name: "Black", hex: "#1c1c1c" }, { name: "Grey", hex: "#9a9a9a" }, { name: "Yellow", hex: "#e8d98a" }],
    storage: [{ label: "8GB/256GB", price: 34000 }, { label: "12GB/512GB", price: 41000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.67 inch FHD+ AMOLED, 120Hz" },
      { label: "Chipset", value: "MediaTek Dimensity 8300 Ultra" }, { label: "Memory", value: "8/12GB RAM" },
      { label: "Main Camera", value: "64 MP + 8 MP ultrawide + 2 MP macro" }, { label: "Battery", value: "5000 mAh, 67W wired" }, { label: "OS", value: "Android 14, HyperOS" },
    ],
  },
  {
    name: "OnePlus 12", brand: "OnePlus", model: "OnePlus 12", rating: "4.6",
    colors: [{ name: "Silky Black", hex: "#1c1c1c" }, { name: "Flowy Emerald", hex: "#2f7d62" }, { name: "White", hex: "#ece9e2" }],
    storage: [{ label: "12GB/256GB", price: 95000 }, { label: "16GB/512GB", price: 108000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.82 inch QHD+ LTPO AMOLED, 120Hz" },
      { label: "Chipset", value: "Snapdragon 8 Gen 3" }, { label: "Memory", value: "12/16GB RAM" },
      { label: "Main Camera", value: "50 MP + 48 MP ultrawide + 64 MP periscope telephoto (3x)" }, { label: "Battery", value: "5400 mAh, 100W wired" }, { label: "OS", value: "Android 14, OxygenOS 14" },
    ],
  },
  {
    name: "OnePlus 12R", brand: "OnePlus", model: "OnePlus 12R", rating: "4.5",
    colors: [{ name: "Cool Blue", hex: "#7fa8d0" }, { name: "Iron Gray", hex: "#5a5a5a" }],
    storage: [{ label: "8GB/128GB", price: 58000 }, { label: "16GB/256GB", price: 68000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.78 inch FHD+ LTPO AMOLED, 120Hz" },
      { label: "Chipset", value: "Snapdragon 8 Gen 2" }, { label: "Memory", value: "8/16GB RAM" },
      { label: "Main Camera", value: "50 MP + 8 MP ultrawide + 2 MP macro" }, { label: "Battery", value: "5500 mAh, 100W wired" }, { label: "OS", value: "Android 14, OxygenOS 14" },
    ],
  },
  {
    name: "OnePlus Nord 4", brand: "OnePlus", model: "OnePlus Nord 4", rating: "4.4",
    colors: [{ name: "Mercurial Silver", hex: "#c5c5c5" }, { name: "Obsidian Midnight", hex: "#1c1c1c" }, { name: "Oasis Green", hex: "#bcd3a8" }],
    storage: [{ label: "8GB/256GB", price: 45000 }, { label: "12GB/256GB", price: 50000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.74 inch FHD+ AMOLED, 120Hz" },
      { label: "Chipset", value: "Snapdragon 7+ Gen 3" }, { label: "Memory", value: "8/12GB RAM" },
      { label: "Main Camera", value: "50 MP + 8 MP ultrawide" }, { label: "Battery", value: "5500 mAh, 100W wired" }, { label: "OS", value: "Android 14, OxygenOS 14.1" },
    ],
  },
  {
    name: "Realme 12 Pro+", brand: "Realme", model: "Realme 12 Pro+", rating: "4.4",
    colors: [{ name: "Submarine Blue", hex: "#3a5a8a" }, { name: "Navigator Beige", hex: "#d8cbb0" }],
    storage: [{ label: "8GB/256GB", price: 42000 }, { label: "12GB/512GB", price: 50000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.7 inch FHD+ curved AMOLED, 120Hz" },
      { label: "Chipset", value: "Snapdragon 7s Gen 2" }, { label: "Memory", value: "8/12GB RAM" },
      { label: "Main Camera", value: "50 MP + 64 MP periscope telephoto (3x) + 8 MP ultrawide" }, { label: "Battery", value: "5000 mAh, 67W wired" }, { label: "OS", value: "Android 14, Realme UI 5.0" },
    ],
  },
  {
    name: "Realme C67", brand: "Realme", model: "Realme C67", rating: "4.2",
    colors: [{ name: "Sunny Oasis", hex: "#e0c98a" }, { name: "Dark Purple", hex: "#4a3a5a" }],
    storage: [{ label: "6GB/128GB", price: 19000 }, { label: "8GB/256GB", price: 23000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE" }, { label: "Display", value: "6.72 inch FHD+ IPS LCD, 90Hz" },
      { label: "Chipset", value: "Snapdragon 685" }, { label: "Memory", value: "6/8GB RAM" },
      { label: "Main Camera", value: "108 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 33W wired" }, { label: "OS", value: "Android 14, Realme UI 5.0" },
    ],
  },
  {
    name: "Vivo V30", brand: "Vivo", model: "Vivo V30", rating: "4.3",
    colors: [{ name: "Peacock Green", hex: "#2f7d6e" }, { name: "Classic Black", hex: "#1c1c1c" }, { name: "Andaman Blue", hex: "#3a5a8a" }],
    storage: [{ label: "8GB/256GB", price: 42000 }, { label: "12GB/512GB", price: 50000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.78 inch FHD+ AMOLED, 120Hz" },
      { label: "Chipset", value: "Snapdragon 7 Gen 3" }, { label: "Memory", value: "8/12GB RAM" },
      { label: "Main Camera", value: "50 MP + 50 MP ultrawide" }, { label: "Battery", value: "5000 mAh, 80W wired" }, { label: "OS", value: "Android 14, Funtouch OS 14" },
    ],
  },
  {
    name: "Oppo Reno 11", brand: "Oppo", model: "Oppo Reno 11", rating: "4.3",
    colors: [{ name: "Wave Green", hex: "#3a7d6e" }, { name: "Rock Grey", hex: "#5a5a5a" }],
    storage: [{ label: "8GB/256GB", price: 40000 }, { label: "12GB/256GB", price: 45000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE / 5G" }, { label: "Display", value: "6.7 inch FHD+ AMOLED, 120Hz" },
      { label: "Chipset", value: "MediaTek Dimensity 8200" }, { label: "Memory", value: "8/12GB RAM" },
      { label: "Main Camera", value: "50 MP + 32 MP telephoto (2x) + 8 MP ultrawide" }, { label: "Battery", value: "5000 mAh, 67W wired" }, { label: "OS", value: "Android 14, ColorOS 14" },
    ],
  },
  {
    name: "Infinix Note 40", brand: "Infinix", model: "Infinix Note 40", rating: "4.2",
    colors: [{ name: "Obsidian Black", hex: "#1c1c1c" }, { name: "Titan Gold", hex: "#cbb07a" }, { name: "Vintage Green", hex: "#6e8a6a" }],
    storage: [{ label: "8GB/256GB", price: 23000 }, { label: "12GB/256GB", price: 26000 }],
    specs: [
      { label: "Network", value: "GSM / HSPA / LTE" }, { label: "Display", value: "6.78 inch FHD+ AMOLED, 120Hz" },
      { label: "Chipset", value: "MediaTek Helio G99 Ultimate" }, { label: "Memory", value: "8/12GB RAM" },
      { label: "Main Camera", value: "108 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 45W wired" }, { label: "OS", value: "Android 14, XOS 14" },
    ],
  },
];

function toRow(p: Phone) {
  const base = p.storage[0]?.price ?? 0;
  return {
    name: p.name,
    brand: p.brand,
    model: p.model,
    category: "phones",
    price: String(base),
    cashPrice: String(base),
    oldPrice: null,
    discount: 0,
    rating: p.rating ?? "4.5",
    tag: p.tag ?? null,
    image: PLACEHOLDER_IMAGE,
    images: [],
    inStock: true,
    description: "",
    colors: p.colors,
    storageOptions: p.storage.map((s) => ({ label: s.label, price: s.price, oldPrice: null, stock: 10 })),
    specifications: p.specs,
    deliveryTime: "3-5 Days",
    whatsappNumber: null,
  };
}

async function main() {
  let created = 0;
  let skipped = 0;
  for (const p of PHONES) {
    const existing = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.name, p.name)).limit(1);
    if (existing.length > 0) { skipped++; continue; }
    await db.insert(productsTable).values(toRow(p) as any);
    created++;
  }
  console.log(`Phones seed complete: ${created} added, ${skipped} already existed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Phones seed failed:", err);
  process.exit(1);
});
