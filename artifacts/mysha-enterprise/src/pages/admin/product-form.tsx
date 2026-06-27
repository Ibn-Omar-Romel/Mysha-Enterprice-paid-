import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApi, DEFAULT_SPEC_LABELS, CATEGORY_OPTIONS,
  type ProductInput, type ProductColor, type ProductStorageOption, type ProductSpec,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AdminGuard } from "./guard";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, Image as ImageIcon, GripVertical } from "lucide-react";

// ── Small building blocks ──────────────────────────────────────────────────────
function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
      <div className="mb-4">
        <h2 className="font-bold text-gray-900">{title}</h2>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const EMPTY: ProductInput = {
  name: "", brand: "", model: "", category: "", code: "",
  price: 0, oldPrice: null, cashPrice: null, discount: 0, rating: 4.5,
  tag: "", image: "", images: [], inStock: true, description: "",
  colors: [], storageOptions: [], specifications: [],
  deliveryTime: "3-5 Days", whatsappNumber: "",
};

function FormInner() {
  const { id } = useParams();
  const editingId = id ? parseInt(id, 10) : null;
  const isEdit = editingId != null;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ProductInput>(() => ({
    ...EMPTY,
    specifications: DEFAULT_SPEC_LABELS.map((label) => ({ label, value: "" })),
  }));
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Reorder a spec row (drag-and-drop).
  const moveSpec = (from: number, to: number) =>
    setForm((f) => {
      const arr = [...(f.specifications ?? [])];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { ...f, specifications: arr };
    });

  const { data: existing, isLoading } = useQuery({
    queryKey: ["admin-product", editingId],
    queryFn: () => adminApi.get(editingId as number),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name ?? "",
        brand: existing.brand ?? "",
        model: existing.model ?? "",
        category: existing.category ?? "",
        code: existing.code ?? "",
        price: existing.price ?? 0,
        oldPrice: existing.oldPrice ?? null,
        cashPrice: existing.cashPrice ?? null,
        discount: existing.discount ?? 0,
        rating: existing.rating ?? 4.5,
        tag: existing.tag ?? "",
        image: existing.image ?? "",
        images: existing.images ?? [],
        inStock: existing.inStock ?? true,
        description: existing.description ?? "",
        colors: existing.colors ?? [],
        storageOptions: existing.storageOptions ?? [],
        specifications: existing.specifications ?? [],
        deliveryTime: existing.deliveryTime ?? "3-5 Days",
        whatsappNumber: existing.whatsappNumber ?? "",
      });
    }
  }, [existing]);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Dynamic list helpers ──────────────────────────────────────────────────
  const updateGallery = (i: number, value: string) =>
    set("images", (form.images ?? []).map((s, idx) => (idx === i ? value : s)));
  const addGallery = () => set("images", [...(form.images ?? []), ""]);
  const removeGallery = (i: number) => set("images", (form.images ?? []).filter((_, idx) => idx !== i));

  const updateColor = (i: number, patch: Partial<ProductColor>) =>
    set("colors", (form.colors ?? []).map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const addColor = () => set("colors", [...(form.colors ?? []), { name: "", hex: "#cccccc" }]);
  const removeColor = (i: number) => set("colors", (form.colors ?? []).filter((_, idx) => idx !== i));

  const updateStorage = (i: number, patch: Partial<ProductStorageOption>) =>
    set("storageOptions", (form.storageOptions ?? []).map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStorage = () => set("storageOptions", [...(form.storageOptions ?? []), { label: "", price: 0, oldPrice: null, stock: null }]);
  const removeStorage = (i: number) => set("storageOptions", (form.storageOptions ?? []).filter((_, idx) => idx !== i));

  const updateSpec = (i: number, patch: Partial<ProductSpec>) =>
    set("specifications", (form.specifications ?? []).map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSpec = () => set("specifications", [...(form.specifications ?? []), { label: "", value: "" }]);
  const removeSpec = (i: number) => set("specifications", (form.specifications ?? []).filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.brand.trim() || !form.category.trim() || !form.image.trim()) {
      toast.error("Name, brand, category and primary image are required.");
      return;
    }
    // Clean payload: drop empty rows, coerce numbers.
    const payload: ProductInput = {
      ...form,
      price: Number(form.price) || 0,
      oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
      cashPrice: form.cashPrice ? Number(form.cashPrice) : null,
      discount: Number(form.discount) || 0,
      rating: Number(form.rating) || 4.5,
      images: (form.images ?? []).map((s) => s.trim()).filter(Boolean),
      colors: (form.colors ?? []).filter((c) => c.name.trim()),
      storageOptions: (form.storageOptions ?? [])
        .filter((s) => s.label.trim())
        .map((s) => ({
          label: s.label.trim(),
          price: Number(s.price) || 0,
          oldPrice: s.oldPrice ? Number(s.oldPrice) : null,
          stock: s.stock != null && String(s.stock) !== "" ? Number(s.stock) : null,
        })),
      specifications: (form.specifications ?? []).filter((s) => s.label.trim() && s.value.trim()),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await adminApi.update(editingId as number, payload);
        toast.success("Product updated");
      } else {
        await adminApi.create(payload);
        toast.success("Product created");
      }
      // Refresh cached data so the list + product page show the new values
      // immediately (otherwise React Query serves stale data and the edit
      // looks like it didn't save).
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["admin-product", editingId] });
        queryClient.invalidateQueries({ queryKey: ["product-detail", editingId] });
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setLocation("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) {
    return <div className="container mx-auto px-4 py-24 text-center text-gray-400">Loading product…</div>;
  }

  const inputCls = "bg-white";

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <form onSubmit={handleSubmit} className="container mx-auto px-4 max-w-3xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0"><ArrowLeft size={18} /></Button>
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Product" : "Add New Product"}
            </h1>
          </div>
          <Button type="submit" disabled={saving} className="gap-2">
            <Save size={16} /> {saving ? "Saving…" : "Save Product"}
          </Button>
        </div>

        {/* Basic info */}
        <Section title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Product Name" required>
              <Input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Pixel 9 Pro XL" />
            </Field>
            <Field label="Brand" required>
              <Input className={inputCls} value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Google" />
            </Field>
            <Field label="Model" hint="Shown in the spec table">
              <Input className={inputCls} value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Pixel 9 Pro XL" />
            </Field>
            <Field label="Category" required hint="Pick the category this product belongs to">
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="" disabled>Select a category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Product Code / SKU" hint='Shown next to availability, e.g. "1-15"'>
              <Input className={inputCls} value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="1-15" />
            </Field>
            <Field label="Tag" hint='Optional badge, e.g. "Best Seller"'>
              <Input className={inputCls} value={form.tag} onChange={(e) => set("tag", e.target.value)} placeholder="Best Seller" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Description / Overview">
              <Textarea className={inputCls + " resize-none"} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short overview shown above the spec table." />
            </Field>
          </div>
        </Section>

        {/* Pricing */}
        <Section title="Pricing" desc="Base price is used in listings. Cash Price is highlighted on the product page. Per-storage prices (below) override these when a storage option is selected.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Price (৳)" required>
              <Input className={inputCls} type="number" min={0} value={form.price} onChange={(e) => set("price", e.target.value as any)} placeholder="78999" />
            </Field>
            <Field label="Old Price (৳)" hint="Strikethrough">
              <Input className={inputCls} type="number" min={0} value={form.oldPrice ?? ""} onChange={(e) => set("oldPrice", e.target.value as any)} placeholder="105000" />
            </Field>
            <Field label="Cash Price (৳)" hint="Falls back to Price">
              <Input className={inputCls} type="number" min={0} value={form.cashPrice ?? ""} onChange={(e) => set("cashPrice", e.target.value as any)} placeholder="78999" />
            </Field>
            <Field label="Discount (%)">
              <Input className={inputCls} type="number" min={0} max={100} value={form.discount ?? 0} onChange={(e) => set("discount", e.target.value as any)} placeholder="10" />
            </Field>
            <Field label="Rating (0–5)">
              <Input className={inputCls} type="number" min={0} max={5} step={0.1} value={form.rating ?? 4.5} onChange={(e) => set("rating", e.target.value as any)} />
            </Field>
            <Field label="Availability">
              <div className="flex items-center gap-2 h-10">
                <Switch checked={!!form.inStock} onCheckedChange={(v) => set("inStock", v)} />
                <span className="text-sm text-gray-600">{form.inStock ? "In Stock" : "Out of Stock"}</span>
              </div>
            </Field>
          </div>
        </Section>

        {/* Images */}
        <Section title="Images" desc="Paste image URLs (https://…). The primary image is used in listings; gallery images appear as thumbnails on the product page.">
          <Field label="Primary Image URL" required>
            <Input className={inputCls} value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://example.com/pixel-9-front.jpg" />
          </Field>
          {form.image && (
            <div className="mt-2 w-20 h-20 rounded-lg border bg-gray-50 p-1.5 flex items-center justify-center">
              <img src={form.image} alt="" className="w-full h-full object-contain" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")} />
            </div>
          )}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Gallery Images</span>
              <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8" onClick={addGallery}><Plus size={14} /> Add</Button>
            </div>
            {(form.images ?? []).length === 0 && <p className="text-xs text-gray-400">No gallery images yet.</p>}
            <div className="space-y-2">
              {(form.images ?? []).map((src, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-gray-300 flex-shrink-0" />
                  <Input className={inputCls} value={src} onChange={(e) => updateGallery(i, e.target.value)} placeholder="https://example.com/pixel-9-back.jpg" />
                  <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 flex-shrink-0" onClick={() => removeGallery(i)}><Trash2 size={15} /></Button>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Colors */}
        <Section title="Colors" desc="Selectable colour swatches. Add an optional image URL per colour — when a customer picks that colour, its image shows in the main image area.">
          <div className="flex justify-end mb-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8" onClick={addColor}><Plus size={14} /> Add Color</Button>
          </div>
          {(form.colors ?? []).length === 0 && <p className="text-xs text-gray-400">No colors added.</p>}
          <div className="space-y-3">
            {(form.colors ?? []).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="color" value={c.hex || "#cccccc"} onChange={(e) => updateColor(i, { hex: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 p-0.5 flex-shrink-0 cursor-pointer" title="Swatch colour" />
                <Input className={inputCls + " w-40 flex-shrink-0"} value={c.name} onChange={(e) => updateColor(i, { name: e.target.value })} placeholder="Rose Quartz" />
                <Input className={inputCls} value={c.image ?? ""} onChange={(e) => updateColor(i, { image: e.target.value })} placeholder="Image URL for this colour (optional)" />
                {c.image ? (
                  <div className="w-10 h-10 rounded-lg border bg-gray-50 p-1 flex-shrink-0 flex items-center justify-center">
                    <img src={c.image} alt="" className="w-full h-full object-contain" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")} />
                  </div>
                ) : null}
                <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 flex-shrink-0" onClick={() => removeColor(i)}><Trash2 size={15} /></Button>
              </div>
            ))}
          </div>
        </Section>

        {/* Storage options */}
        <Section title="Storage Options" desc="Each option can carry its own price, old price and stock. Selecting one updates the price shown.">
          <div className="flex justify-end mb-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8" onClick={addStorage}><Plus size={14} /> Add Option</Button>
          </div>
          {(form.storageOptions ?? []).length === 0 && <p className="text-xs text-gray-400">No storage options added.</p>}
          <div className="space-y-2">
            {(form.storageOptions ?? []).map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className={inputCls + " col-span-4"} value={s.label} onChange={(e) => updateStorage(i, { label: e.target.value })} placeholder="16/128GB" />
                <Input className={inputCls + " col-span-3"} type="number" min={0} value={s.price} onChange={(e) => updateStorage(i, { price: e.target.value as any })} placeholder="Price" />
                <Input className={inputCls + " col-span-2"} type="number" min={0} value={s.oldPrice ?? ""} onChange={(e) => updateStorage(i, { oldPrice: e.target.value as any })} placeholder="Old" />
                <Input className={inputCls + " col-span-2"} type="number" min={0} value={s.stock ?? ""} onChange={(e) => updateStorage(i, { stock: e.target.value as any })} placeholder="Stock" />
                <Button type="button" variant="ghost" size="sm" className="col-span-1 h-9 w-9 p-0 text-gray-400 hover:text-red-600" onClick={() => removeStorage(i)}><Trash2 size={15} /></Button>
              </div>
            ))}
          </div>
        </Section>

        {/* Specifications */}
        <Section title="Specification Table" desc="Rows shown in the spec table on the product page. Empty rows are ignored.">
          <div className="flex justify-end mb-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8" onClick={addSpec}><Plus size={14} /> Add Row</Button>
          </div>
          <div className="space-y-2">
            {(form.specifications ?? []).map((s, i) => (
              <div
                key={i}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdx !== null && dragIdx !== i) moveSpec(dragIdx, i); setDragIdx(null); }}
                className={`grid grid-cols-12 gap-2 items-start rounded-lg transition-colors ${dragIdx === i ? "opacity-40" : ""}`}
              >
                <button
                  type="button"
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragEnd={() => setDragIdx(null)}
                  className="col-span-1 hidden sm:flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing mt-2"
                  title="Drag to reorder"
                  aria-label="Drag to reorder"
                >
                  <GripVertical size={16} />
                </button>
                <Input className={inputCls + " col-span-12 sm:col-span-4"} value={s.label} onChange={(e) => updateSpec(i, { label: e.target.value })} placeholder="Chipset" />
                <Textarea className={inputCls + " col-span-10 sm:col-span-6 resize-none min-h-[40px]"} rows={1} value={s.value} onChange={(e) => updateSpec(i, { value: e.target.value })} placeholder="Google Tensor G4 (4 nm)" />
                <Button type="button" variant="ghost" size="sm" className="col-span-2 sm:col-span-1 h-9 w-9 p-0 text-gray-400 hover:text-red-600" onClick={() => removeSpec(i)}><Trash2 size={15} /></Button>
              </div>
            ))}
          </div>
        </Section>

        {/* Extras */}
        <Section title="Delivery & Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Delivery Timescale">
              <Input className={inputCls} value={form.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} placeholder="3-5 Days" />
            </Field>
            <Field label="WhatsApp Number" hint="Digits only with country code. Blank uses the store default.">
              <Input className={inputCls} value={form.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} placeholder="8801712345678" />
            </Field>
          </div>
        </Section>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Link href="/admin"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? "Saving…" : "Save Product"}</Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminProductForm() {
  return (
    <AdminGuard permission="products">
      <FormInner />
    </AdminGuard>
  );
}
