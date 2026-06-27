import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type Policy } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AdminGuard } from "./guard";
import { AdminNav } from "./nav";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Save, ExternalLink, X } from "lucide-react";

function PolicyEditor({ policy, onClose }: { policy: Policy | "new"; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isNew = policy === "new";
  const [title, setTitle] = useState(isNew ? "" : policy.title);
  const [content, setContent] = useState(isNew ? "" : policy.content);
  const [enabled, setEnabled] = useState(isNew ? true : policy.enabled);
  const [sortOrder, setSortOrder] = useState(isNew ? 0 : policy.sortOrder);

  const save = useMutation({
    mutationFn: () => {
      const body = { title, content, enabled, sortOrder: Number(sortOrder) || 0 };
      return isNew ? adminApi.createPolicy(body) : adminApi.updatePolicy((policy as Policy).id, body);
    },
    onSuccess: () => { toast.success("Policy saved"); queryClient.invalidateQueries({ queryKey: ["admin-policies"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900">{isNew ? "New policy" : `Edit: ${(policy as Policy).title}`}</h2>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}><X size={16} /></Button>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2"><Label className="mb-1.5 block">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Refund Policy" /></div>
          <div><Label className="mb-1.5 block">Order</Label><Input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} /></div>
        </div>
        <div>
          <Label className="mb-1.5 block">Content (English / বাংলা)</Label>
          <Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the policy text here. Bengali and English are both supported." className="resize-y" />
          <p className="text-xs text-gray-400 mt-1">Tip: leave blank to show nothing; press Enter for new paragraphs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-sm text-gray-600">{enabled ? "Visible on the website" : "Hidden (disabled)"}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending || title.trim().length < 2} className="gap-2"><Save size={16} /> {save.isPending ? "Saving…" : "Save policy"}</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function PoliciesInner() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-policies"], queryFn: () => adminApi.listPolicies() });
  const policies = data?.policies ?? [];
  const [editing, setEditing] = useState<Policy | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);

  const del = useMutation({
    mutationFn: (id: number) => adminApi.deletePolicy(id),
    onSuccess: () => { toast.success("Policy deleted"); queryClient.invalidateQueries({ queryKey: ["admin-policies"] }); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (p: Policy) => adminApi.updatePolicy(p.id, { title: p.title, content: p.content, enabled: !p.enabled, sortOrder: p.sortOrder }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-policies"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <AdminNav />
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center"><FileText size={22} /></div>
            <div><h1 className="text-2xl font-bold text-gray-900">Policies</h1><p className="text-sm text-gray-500">Add, edit, disable or remove your store policies (English & Bengali).</p></div>
          </div>
          {!editing && <Button className="gap-2" onClick={() => setEditing("new")}><Plus size={16} /> New policy</Button>}
        </div>

        {editing && <PolicyEditor policy={editing} onClose={() => setEditing(null)} />}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading…</div>
          ) : policies.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No policies yet.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {policies.map((p) => (
                <li key={p.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      {p.title}
                      {!p.enabled && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Hidden</span>}
                    </p>
                    <p className="text-xs text-gray-400">/{p.slug}{p.content ? "" : " · empty"}</p>
                  </div>
                  {p.enabled && <Link href={`/policy/${p.slug}`} className="text-gray-400 hover:text-primary" title="View"><ExternalLink size={15} /></Link>}
                  <div className="flex items-center gap-1.5"><Switch checked={p.enabled} onCheckedChange={() => toggle.mutate(p)} /></div>
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => setEditing(p)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => setDeleteTarget(p)}><Trash2 size={15} /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {deleteTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-gray-900 mb-2">Delete "{deleteTarget.title}"?</h3>
              <p className="text-sm text-gray-500 mb-5">This permanently removes the policy page. This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => del.mutate(deleteTarget.id)} disabled={del.isPending}>{del.isPending ? "Deleting…" : "Delete"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPolicies() {
  return <AdminGuard permission="policies"><PoliciesInner /></AdminGuard>;
}
