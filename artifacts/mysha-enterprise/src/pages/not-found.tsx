import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, ShoppingBag, Phone, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-lg mx-auto">
        <div className="text-[120px] font-black text-gray-100 leading-none select-none mb-4">404</div>
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto -mt-8 mb-6">
          <Search size={28} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
          Oops! The page you're looking for doesn't exist or may have been moved.
          Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link href="/">
            <Button className="px-8 h-12 w-full sm:w-auto">
              <Home size={16} className="mr-2" /> Go to Homepage
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" className="px-8 h-12 w-full sm:w-auto">
              <Search size={16} className="mr-2" /> Search Products
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {[
            { href: "/category/phones", label: "Phones", icon: <ShoppingBag size={18} /> },
            { href: "/orders", label: "My Orders", icon: <ShoppingBag size={18} /> },
            { href: "/contact", label: "Contact Us", icon: <Phone size={18} /> },
          ].map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex flex-col items-center gap-2 p-4 bg-white border rounded-xl text-sm text-gray-600 hover:border-primary hover:text-primary hover:shadow-sm transition-all"
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
