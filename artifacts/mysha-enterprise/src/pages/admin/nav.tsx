import { Link, useLocation } from "wouter";
import { Package, ShoppingBag, Star, Upload, Settings, Zap, Users, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Tab = { href: string; label: string; icon: any; match: (l: string) => boolean; perm?: string; superOnly?: boolean };

const TABS: Tab[] = [
  { href: "/admin", label: "Products", icon: Package, perm: "products", match: (l) => l === "/admin" || l.startsWith("/admin/products") },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, perm: "orders", match: (l) => l.startsWith("/admin/orders") },
  { href: "/admin/reviews", label: "Reviews", icon: Star, perm: "reviews", match: (l) => l.startsWith("/admin/reviews") },
  { href: "/admin/flash-sale", label: "Flash Sale", icon: Zap, perm: "flash_sale", match: (l) => l.startsWith("/admin/flash-sale") },
  { href: "/admin/import", label: "Import", icon: Upload, perm: "import", match: (l) => l.startsWith("/admin/import") },
  { href: "/admin/settings", label: "Settings", icon: Settings, perm: "settings", match: (l) => l.startsWith("/admin/settings") },
  { href: "/admin/admins", label: "Admins", icon: Users, superOnly: true, match: (l) => l.startsWith("/admin/admins") },
];

export function AdminNav() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const isSuper = !!user?.isSuperAdmin;
  const perms = user?.permissions ?? [];

  const visible = TABS.filter((t) => {
    if (isSuper) return true;
    if (t.superOnly) return false;
    return !t.perm || perms.includes(t.perm);
  });

  const handleLogout = async () => {
    await signOut();
    window.location.replace("/signin");
  };

  return (
    <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm mb-6 flex-wrap">
      {visible.map(({ href, label, icon: Icon, match }) => {
        const active = match(location);
        return (
          <Link key={href} href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"}`}>
            <Icon size={16} /> {label}
          </Link>
        );
      })}
      <button onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors ml-auto">
        <LogOut size={16} /> Log out
      </button>
    </div>
  );
}
