import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi, type ProductInput } from "@/lib/admin";
import { parseCsv, rowToProductInput, CSV_TEMPLATE } from "@/lib/import";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdminGuard } from "./guard";
import { AdminNav } from "./nav";
import { toast } from "sonner";
import { Upload, FileDown, CheckCircle2, AlertTriangle, Loader2, Database } from "lucide-react";

interface ParsedRow {
  rowNum: number;
  product?: ProductInput;
  error?: string;
}

function ImportInner() {
  const queryClient = useQueryClient();
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: { row: number; name: string; error: string }[] } | null>(null);

  const valid = parsed?.filter((r) => r.product) ?? [];
  const invalid = parsed?.filter((r) => r.error) ?? [];

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setCsvText(String(reader.result || "")); setParsed(null); setResult(null); };
    reader.readAsText(file);
  };

  const handleParse = () => {
    setResult(null);
    if (!csvText.trim()) { toast.error("Paste CSV or choose a file first."); return; }
    try {
      const { rows } = parseCsv(csvText);
      if (rows.length === 0) { toast.error("No data rows found."); return; }
      const out: ParsedRow[] = rows.map((row, i) => {
        const { product, error } = rowToProductInput(row);
        return { rowNum: i + 1, product, error };
      });
      setParsed(out);
      toast.success(`Parsed ${out.length} rows — ${out.filter((r) => r.product).length} ready`);
    } catch (e) {
      toast.error("Could not parse CSV. Check the format.");
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mysha-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (valid.length === 0) { toast.error("No valid rows to import."); return; }
    setImporting(true);
    setResult(null);
    const BATCH = 15;
    const products = valid.map((r) => r.product!);
    const agg = { created: 0, failed: [] as { row: number; name: string; error: string }[] };
    try {
      for (let i = 0; i < products.length; i += BATCH) {
        const slice = products.slice(i, i + BATCH);
        const res = await adminApi.bulkCreate(slice);
        agg.created += res.created;
        // remap row numbers to the overall position
        res.failed.forEach((f) => agg.failed.push({ ...f, row: i + f.row }));
      }
      setResult(agg);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(`Imported ${agg.created} product(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <AdminNav />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center"><Database size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Import Products</h1>
            <p className="text-sm text-gray-500">Upload a CSV from your distributor to add many products at once.</p>
          </div>
        </div>

        {/* How-to */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 text-sm text-gray-600">
          <p className="mb-3">
            Use the template so the columns match. Cells can hold lists using <code className="bg-gray-100 px-1 rounded">|</code> as a separator:
          </p>
          <ul className="space-y-1 list-disc pl-5 mb-3">
            <li><b>images</b>: extra photo URLs — <code className="bg-gray-100 px-1 rounded">url1|url2</code></li>
            <li><b>colors</b>: <code className="bg-gray-100 px-1 rounded">Name;#hex;imageURL|Name2;#hex;imageURL</code></li>
            <li><b>storage</b>: <code className="bg-gray-100 px-1 rounded">Label;price;oldPrice;stock|...</code></li>
            <li><b>specs</b>: <code className="bg-gray-100 px-1 rounded">Label:Value|Label:Value</code></li>
          </ul>
          <p className="mb-3">Required columns: <b>name, brand, category, price, image</b>. Category must be one of: phones, tablets, laptops, gadgets, home-appliances.</p>
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
            <FileDown size={15} /> Download CSV template
          </Button>
        </div>

        {/* Input */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium">
              <Upload size={15} /> Choose CSV file
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
            <span className="text-xs text-gray-400">or paste below</span>
          </div>
          <Textarea
            value={csvText}
            onChange={(e) => { setCsvText(e.target.value); setParsed(null); setResult(null); }}
            placeholder="Paste CSV content here…"
            rows={6}
            className="bg-white font-mono text-xs"
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={handleParse} className="gap-2"><CheckCircle2 size={16} /> Preview</Button>
            {parsed && valid.length > 0 && (
              <Button onClick={handleImport} disabled={importing} variant="default" className="gap-2 bg-green-600 hover:bg-green-700">
                {importing ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : <>Import {valid.length} product(s)</>}
              </Button>
            )}
          </div>
        </div>

        {/* Parse preview */}
        {parsed && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-4 mb-4 text-sm">
              <span className="inline-flex items-center gap-1.5 text-green-700 font-medium"><CheckCircle2 size={15} /> {valid.length} ready</span>
              {invalid.length > 0 && <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium"><AlertTriangle size={15} /> {invalid.length} need fixing</span>}
            </div>

            {invalid.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1.5">Rows skipped (fix and re-import):</p>
                <ul className="text-xs text-amber-700 space-y-0.5 max-h-40 overflow-y-auto">
                  {invalid.map((r) => <li key={r.rowNum}>Row {r.rowNum}: {r.error}</li>)}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Brand</th>
                    <th className="py-2 pr-3 font-medium">Category</th>
                    <th className="py-2 pr-3 font-medium">Price</th>
                    <th className="py-2 pr-3 font-medium">Colors</th>
                  </tr>
                </thead>
                <tbody>
                  {valid.slice(0, 50).map((r) => (
                    <tr key={r.rowNum} className="border-b border-gray-50">
                      <td className="py-2 pr-3 text-gray-800">{r.product!.name}</td>
                      <td className="py-2 pr-3 text-gray-600">{r.product!.brand}</td>
                      <td className="py-2 pr-3 text-gray-600">{r.product!.category}</td>
                      <td className="py-2 pr-3 text-gray-800">{formatBDT(r.product!.price)}</td>
                      <td className="py-2 pr-3 text-gray-500">{(r.product!.colors ?? []).map((c) => c.name).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {valid.length > 50 && <p className="text-xs text-gray-400 mt-2">…and {valid.length - 50} more</p>}
            </div>
          </div>
        )}

        {/* Import result */}
        {result && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-600" /> {result.created} product(s) imported</p>
            {result.failed.length > 0 ? (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-2">
                <p className="text-xs font-semibold text-amber-800 mb-1.5">{result.failed.length} could not be saved:</p>
                <ul className="text-xs text-amber-700 space-y-0.5 max-h-40 overflow-y-auto">
                  {result.failed.map((f, i) => <li key={i}>{f.name}: {f.error}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500">All rows imported successfully. They're now in your catalog and editable from the Products tab.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminImport() {
  return (
    <AdminGuard>
      <ImportInner />
    </AdminGuard>
  );
}
