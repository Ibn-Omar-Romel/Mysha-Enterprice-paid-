import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminProductListItem } from "@/lib/admin";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminGuard } from "./guard";
import { AdminNav } from "./nav";
import { toast } from "sonner";
import { Zap, Search, Plus, Trash2, Play, Square, Clock } from "lucide-react";

interface SelectedItem { productId: number; name: string; image: string; price: number; percent: number }

function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return <span className="text-red-600 font-semibold">Ended</span>;
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return <span className="font-mono font-semibold">{h}h {m}m {s}s</span>;
}

function FlashSaleInner() {
  const queryClient = useQueryClient();
  const { data: current } = useQuery({ queryKey: ["admin-flash-sale"], queryFn: () => adminApi.getFlashSale() });
  const { data: productData } = useQuery({ queryKey: ["admin-products"], queryFn: () => adminApi.list() });
  const products = productData?.products ?? [];

  const [search, setSearch] = useState("");
  const [defaultPercent, setDefaultPercent] = useState(10);
  const [hours, setHours] = useState(24);
  const [selected, setSelected] = useState<SelectedItem[]>([]);

  // Preload from an active sale.
  useEffect(() => {
    if (current?.items?.length && selected.length === 0) {
      setSelected(current.items.map((i) => ({ productId: i.productId, name: i.name, image: i.image, price: i.price, percent: i.percent })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const addProduct = (p: AdminProductListItem) => {
    if (selected.some((s) => s.productId === p.id)) return;
    setSelected([...selected, { productId: p.id, name: p.name, image: p.image, price: p.price, percent: defaultPercent }]);
  };
  const setPercent = (id: number, percent: number) => setSelected(selected.map((s) => s.productId === id ? { ...s, percent } : s));
  const removeItem = (id: number) => setSelected(selected.filter((s) => s.productId !== id));

  const start = useMutation({
    mutationFn: () => adminApi.setFlashSale(hours, selected.map((s) => ({ productId: s.productId, percent: Number(s.percent) || 0 }))),
    onSuccess: () => { toast.success("Flash sale started!"); queryClient.invalidateQueries({ queryKey: ["admin-flash-sale"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const end = useMutation({
    mutationFn: () => adminApi.endFlashSale(),
    onSuccess: () => { toast.success("Flash sale ended"); setSelected([]); queryClient.invalidateQueries({ queryKey: ["admin-flash-sale"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : products.slice(0, 8);

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <AdminNav />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center"><Zap size={22} fill="currentColor" /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">Flash Sale</h1><p className="text-sm text-gray-500">Pick products, set discounts and a duration. It ends automatically.</p></div>
        </div>

        {/* Active banner */}
        {current?.active && current.endsAt && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700"><Clock size={16} className="text-primary" /> Sale is live · ends in <Countdown endsAt={current.endsAt} /></div>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 gap-1" onClick={() => end.mutate()} disabled={end.isPending}><Square size={13} /> End now</Button>
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label className="mb-1.5 block">Default discount %</Label><Input type="number" min={1} max={95} value={defaultPercent} onChange={(e) => setDefaultPercent(Number(e.target.value) || 0)} /></div>
          <div><Label className="mb-1.5 block">Duration (hours)</Label><Input type="number" min={1} max={720} value={hours} onChange={(e) => setHours(Number(e.target.value) || 0)} /></div>
        </div>

        {/* Product picker */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
          <Label className="mb-2 block">Add products to the sale</Label>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {filtered.map((p) => {
              const added = selected.some((s) => s.productId === p.id);
              return (
                <button key={p.id} onClick={() => addProduct(p)} disabled={added}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm ${added ? "border-primary/30 bg-primary/5 opacity-60" : "border-gray-200 hover:bg-gray-50"}`}>
                  <img src={p.image} alt="" className="w-9 h-9 rounded border object-contain bg-white p-0.5 flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{p.name}</span>
                  {added ? <span className="text-xs text-primary">Added</span> : <Plus size={15} className="text-gray-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
          <h2 className="font-bold text-gray-900 mb-3">Sale items ({selected.length})</h2>
          {selected.length === 0 ? (
            <p className="text-sm text-gray-400">No products added yet.</p>
          ) : (
            <ul className="space-y-2">
              {selected.map((s) => (
                <li key={s.productId} className="flex items-center gap-3">
                  <img src={s.image} alt="" className="w-10 h-10 rounded border object-contain bg-white p-0.5 flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-sm">{s.name}</span>
                  <span className="text-xs text-gray-400 line-through">{formatBDT(s.price)}</span>
                  <span className="text-sm font-semibold text-primary">{formatBDT(Math.round(s.price * (1 - (Number(s.percent) || 0) / 100)))}</span>
                  <div className="flex items-center gap-1">
                    <Input type="number" min={1} max={95} value={s.percent} onChange={(e) => setPercent(s.productId, Number(e.target.value) || 0)} className="w-16 h-8 text-sm" />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => removeItem(s.productId)}><Trash2 size={15} /></Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5">
            <Button onClick={() => start.mutate()} disabled={start.isPending || selected.length === 0 || hours < 1} className="gap-2">
              <Play size={16} /> {start.isPending ? "Starting…" : current?.active ? "Update sale" : "Start flash sale"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminFlashSale() {
  return <AdminGuard permission="flash_sale"><FlashSaleInner /></AdminGuard>;
}
