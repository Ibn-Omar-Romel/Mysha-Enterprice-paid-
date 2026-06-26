/**
 * Seeds the sample "Google Pixel 9 Pro XL" product so you can see the new
 * product page design and admin fields immediately.
 *
 * Run from the repo root after the schema is pushed:
 *   DATABASE_URL=... pnpm --filter @workspace/db seed:sample
 *
 * Safe to run more than once — it skips insertion if the product already exists.
 */
import { db, productsTable } from "../src/index";
import { eq } from "drizzle-orm";

const SAMPLE = {
  name: "Google Pixel 9 Pro XL",
  brand: "Google",
  model: "Pixel 9 Pro XL",
  category: "phones",
  code: "1-15",
  price: "78999",
  oldPrice: "105000",
  cashPrice: "78999",
  discount: 25,
  rating: "4.8",
  tag: "Best Seller",
  inStock: true,
  description:
    "Premium smartphone with a modern design, strong camera performance, a smooth 120Hz LTPO display, and reliable all-day battery life. Powered by Google Tensor G4 with 7 years of Android updates.",
  image:
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=80",
  images: [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=80",
    "https://images.unsplash.com/photo-1592286927505-1def25e0c1c9?w=900&q=80",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=900&q=80",
  ],
  colors: [
    { name: "Hazel", hex: "#9b9586", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=80" },
    { name: "Obsidian", hex: "#1c1c1c", image: "https://images.unsplash.com/photo-1592286927505-1def25e0c1c9?w=900&q=80" },
    { name: "Porcelain", hex: "#ece9e2", image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=900&q=80" },
    { name: "Rose Quartz", hex: "#f6cdd6", image: "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=900&q=80" },
  ],
  storageOptions: [
    { label: "16/128GB", price: 78999, oldPrice: 105000, stock: 12 },
    { label: "16/256GB", price: 84999, oldPrice: 110000, stock: 9 },
    { label: "16/512GB", price: 94999, oldPrice: 120000, stock: 6 },
    { label: "16GB/1TB", price: 109999, oldPrice: 135000, stock: 3 },
  ],
  specifications: [
    { label: "Brand", value: "Google" },
    { label: "Model", value: "Pixel 9 Pro XL" },
    { label: "Network", value: "GSM / HSPA / LTE / 5G" },
    { label: "Dimensions", value: "162.8 × 76.6 × 8.5 mm | IP68 dust/water resistant (up to 1.5m for 30 min)" },
    { label: "SIM", value: "Nano-SIM and eSIM" },
    { label: "Display Type", value: "LTPO OLED, 120Hz, HDR10+, 2000 nits (HBM), 3000 nits (peak)" },
    { label: "Display Size", value: "6.8 inches" },
    { label: "Chipset", value: "Google Tensor G4 (4 nm)" },
    { label: "CPU", value: "Octa-core" },
    { label: "Display Resolution", value: "1344 × 2992 pixels" },
    { label: "OS", value: "Android 14, up to 7 major Android upgrades" },
    { label: "Memory", value: "128GB 16GB RAM, 256GB 16GB RAM, 512GB 16GB RAM, 1TB 16GB RAM | UFS" },
    { label: "Main Camera", value: "50 MP, f/1.7, 25mm (wide) | 48 MP, f/2.8, 113mm (telephoto) | 48 MP, f/1.7, 123˚ (ultrawide) | LED flash, Pixel Shift, Ultra-HDR, panorama, Best Take | 8K@30fps, 4K@24/30/60fps, 1080p@24/30/60/120/240fps; gyro-EIS, OIS, 10-bit HDR" },
    { label: "Weight", value: "221 g" },
    { label: "Selfie Camera", value: "42 MP, f/2.2, 17mm (ultrawide), PDAF | Auto-HDR, panorama | 4K@30/60fps, 1080p@30/60fps" },
    { label: "Sound", value: "Stereo Loudspeaker" },
    { label: "Battery Info", value: "Li-Ion 5060 mAh, non-removable | 27W wired | USB Type-C 3.2" },
    { label: "Sensors", value: "Fingerprint (under display, ultrasonic), accelerometer, gyro, proximity, compass, barometer, thermometer (skin temperature) | Ultra Wideband (UWB) support | Satellite SOS service" },
  ],
  deliveryTime: "3-5 Days",
  whatsappNumber: null,
};

async function main() {
  const existing = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.name, SAMPLE.name))
    .limit(1);

  if (existing.length > 0) {
    // Refresh the existing sample so updates (category, colour images, etc.)
    // land on an already-seeded database without creating a duplicate.
    await db.update(productsTable).set(SAMPLE as any).where(eq(productsTable.id, existing[0].id));
    console.log(`Updated existing sample (id ${existing[0].id}). View it at /product/${existing[0].id}`);
    process.exit(0);
  }

  const [row] = await db.insert(productsTable).values(SAMPLE as any).returning({ id: productsTable.id });
  console.log(`Seeded "${SAMPLE.name}" with id ${row.id}. View it at /product/${row.id}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
