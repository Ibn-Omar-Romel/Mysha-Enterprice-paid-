import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminGuard } from "./guard";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Search, Package, ExternalLink, LayoutDashboard,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function DashboardInner() {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => adminApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.remove(id),
    onSuccess: () => {
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const products = data?.products ?? [];
  const filtered = search
    ? products.filter((p) =>
        `${p.name} ${p.brand} ${p.category} ${p.code ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin · Products</h1>
              <p className="text-sm text-gray-500">{products.length} products in your catalog</p>
            </div>
          </div>
          <Link href="/admin/products/new">
            <Button className="gap-2"><Plus size={17} /> Add New Product</Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search products by name, brand, code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading products…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">{search ? "No products match your search." : "No products yet."}</p>
              {!search && (
                <Link href="/admin/products/new">
                  <Button className="gap-2"><Plus size={16} /> Add Your First Product</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="py-3 px-4 font-medium">Product</th>
                    <th className="py-3 px-4 font-medium hidden md:table-cell">Brand</th>
                    <th className="py-3 px-4 font-medium hidden sm:table-cell">Category</th>
                    <th className="py-3 px-4 font-medium">Price</th>
                    <th className="py-3 px-4 font-medium hidden sm:table-cell">Stock</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-lg border bg-gray-50 p-1 flex-shrink-0 flex items-center justify-center">
                            <img src={p.image} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[220px]">{p.name}</p>
                            {p.code && <p className="text-xs text-gray-400">Code: {p.code}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-gray-600">{p.brand}</td>
                      <td className="py-3 px-4 hidden sm:table-cell text-gray-600 capitalize">{p.category}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{formatBDT(p.price)}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {p.inStock ? (
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">In Stock</span>
                        ) : (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Out</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/product/${p.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700" title="View on store">
                              <ExternalLink size={15} />
                            </Button>
                          </Link>
                          <Link href={`/admin/products/${p.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-primary" title="Edit">
                              <Pencil size={15} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                            title="Delete"
                            onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-semibold">{deleteTarget?.name}</span> from your store. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <DashboardInner />
    </AdminGuard>
  );
}
