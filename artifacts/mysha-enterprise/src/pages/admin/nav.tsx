import { Link, useLocation } from "wouter";
import { Package, ShoppingBag, Star, Upload, Settings } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Products", icon: Package, match: (l: string) => l === "/admin" || l.startsWith("/admin/products") },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, match: (l: string) => l.startsWith("/admin/orders") },
  { href: "/admin/reviews", label: "Reviews", icon: Star, match: (l: string) => l.startsWith("/admin/reviews") },
  { href: "/admin/import", label: "Import", icon: Upload, match: (l: string) => l.startsWith("/admin/import") },
  { href: "/admin/settings", label: "Settings", icon: Settings, match: (l: string) => l.startsWith("/admin/settings") },
];

export function AdminNav() {
  const [location] = useLocation();
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm w-fit mb-6">
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = match(location);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              active ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon size={16} /> {label}
          </Link>
        );
      })}
    </div>
  );
}
