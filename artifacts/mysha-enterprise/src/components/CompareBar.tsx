import { useCompare } from "@/hooks/useCompare";
import { useLocation } from "wouter";
import { X, BarChart2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/format";

export function CompareBar() {
  const { items, removeFromCompare, clearCompare } = useCompare();
  const [, setLocation] = useLocation();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl shadow-black/20 animate-in slide-in-from-bottom-2 duration-300">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Header label */}
          <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-700 flex-shrink-0">
            <BarChart2 size={18} className="text-primary" />
            Compare
            <span className="bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {items.length}
            </span>
          </div>

          <div className="hidden sm:block w-px h-8 bg-gray-200 flex-shrink-0" />

          {/* Product slots */}
          <div className="flex items-center gap-3 flex-1 overflow-x-auto">
            {items.map(product => (
              <div
                key={product.id}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex-shrink-0 group"
              >
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center border flex-shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{product.name}</p>
                  <p className="text-xs text-primary font-bold">{formatBDT(product.price)}</p>
                </div>
                <button
                  onClick={() => removeFromCompare(product.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-28 h-11 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0"
              >
                <span className="text-xs text-gray-300">+ Add</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={clearCompare}
              className="hidden sm:flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={13} /> Clear
            </button>
            <Button
              size="sm"
              className="gap-2 font-semibold"
              onClick={() => setLocation("/compare")}
              disabled={items.length < 2}
            >
              <BarChart2 size={15} />
              <span className="hidden sm:inline">Compare Now</span>
              <span className="sm:hidden">Compare</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
