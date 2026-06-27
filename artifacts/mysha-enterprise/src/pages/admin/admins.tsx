import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, ADMIN_PERMISSIONS, PERMISSION_LABELS, type AdminPermission, type AdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminGuard } from "./guard";
import { AdminNav } from "./nav";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Shield, Save } from "lucide-react";

function PermissionChecks({ value, onChange }: { value: AdminPermission[]; onChange: (v: AdminPermission[]) => void }) {
  const toggle = (p: AdminPermission) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <div className="flex flex-wrap gap-3">
      {ADMIN_PERMISSIONS.map((p) => (
        <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={value.includes(p)} onCheckedChange={() => toggle(p)} />
          {PERMISSION_LABELS[p]}
        </label>
      ))}
    </div>
  );
}

function AdminsInner() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-admins"], queryFn: () => adminApi.listAdmins() });
  const admins = data?.admins ?? [];

  const [form, setForm] = useState<{ name: string; email: string; password: string; permissions: AdminPermission[] }>({
    name: "", email: "", password: "", permissions: ["reviews"],
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-admins"] });

  const create = useMutation({
    mutationFn: () => adminApi.createAdmin(form),
    onSuccess: () => { toast.success("Admin added"); setForm({ name: "", email: "", password: "", permissions: ["reviews"] }); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: AdminPermission[] }) => adminApi.updateAdmin(id, permissions),
    onSuccess: () => { toast.success("Permissions updated"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: number) => adminApi.removeAdmin(id),
    onSuccess: () => { toast.success("Admin removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <AdminNav />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center"><Users size={22} /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">Admins</h1><p className="text-sm text-gray-500">Add admins and choose what each can access.</p></div>
        </div>

        {/* Add admin */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><UserPlus size={18} /> Add a new admin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div><Label className="mb-1.5 block">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></div>
            <div><Label className="mb-1.5 block">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@email.com" /></div>
            <div><Label className="mb-1.5 block">Password</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" /></div>
          </div>
          <Label className="mb-2 block">Can access</Label>
          <PermissionChecks value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
          <div className="mt-4">
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name || !form.email || form.password.length < 8} className="gap-2">
              <UserPlus size={16} /> {create.isPending ? "Adding…" : "Add admin"}
            </Button>
          </div>
        </div>

        {/* Existing admins */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading…</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {admins.map((a) => <AdminRow key={a.id} admin={a} onSave={(perms) => update.mutate({ id: a.id, permissions: perms })} onRemove={() => remove.mutate(a.id)} saving={update.isPending} />)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminRow({ admin, onSave, onRemove, saving }: { admin: AdminUser; onSave: (p: AdminPermission[]) => void; onRemove: () => void; saving: boolean }) {
  const [perms, setPerms] = useState<AdminPermission[]>(admin.permissions);
  const changed = JSON.stringify([...perms].sort()) !== JSON.stringify([...admin.permissions].sort());
  return (
    <li className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-semibold text-gray-900 flex items-center gap-2">
            {admin.name}
            {admin.isSuperAdmin && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full"><Shield size={11} /> Owner</span>}
          </p>
          <p className="text-sm text-gray-500">{admin.email}</p>
        </div>
        {!admin.isSuperAdmin && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400 hover:text-red-600 gap-1" onClick={onRemove}><Trash2 size={14} /> Remove</Button>
        )}
      </div>
      {admin.isSuperAdmin ? (
        <p className="text-xs text-gray-400">Full access to everything.</p>
      ) : (
        <>
          <PermissionChecks value={perms} onChange={setPerms} />
          {changed && (
            <Button size="sm" className="mt-3 h-8 text-xs gap-1" onClick={() => onSave(perms)} disabled={saving}><Save size={13} /> Save changes</Button>
          )}
        </>
      )}
    </li>
  );
}

export default function AdminAdmins() {
  return <AdminGuard superAdmin><AdminsInner /></AdminGuard>;
}
