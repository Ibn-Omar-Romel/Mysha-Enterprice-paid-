import { Link, useLocation } from "wouter";
import {
  Smartphone,
  Laptop,
  Headphones,
  Monitor,
  Home as HomeIcon,
  Tablet,
  Refrigerator,
  Watch,
  Camera,
} from "lucide-react";
import { useListCategories } from "@workspace/api-client-react";
import { toArray } from "@/lib/data";
import type { ReactNode } from "react";

type Category = {
  id: string | number;
  slug: string;
  name: string;
  icon?: string | null;
};

// Only show these when backend returns zero categories.
// These match your Replit category JSON and updated frontend structure.
const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "phones",
    slug: "phones",
    name: "Phones",
    icon: "smartphone",
  },
  {
    id: "tablets",
    slug: "tablets",
    name: "Tablets & Accessories",
    icon: "tablet-smartphone",
  },
  {
    id: "laptops",
    slug: "laptops",
    name: "Computer & Laptops",
    icon: "laptop",
  },
  {
    id: "gadgets",
    slug: "gadgets",
    name: "Gadgets & Accessories",
    icon: "headphones",
  },
  {
    id: "home-appliances",
    slug: "home-appliances",
    name: "Home Appliances",
    icon: "refrigerator",
  },
];

const iconMap: Record<string, ReactNode> = {
  smartphone: <Smartphone size={15} />,
  phone: <Smartphone size={15} />,
  laptop: <Laptop size={15} />,
  computer: <Laptop size={15} />,
  headphones: <Headphones size={15} />,
  gadgets: <Headphones size={15} />,
  watch: <Watch size={15} />,
  monitor: <Monitor size={15} />,
  home: <HomeIcon size={15} />,
  "home-appliances": <Refrigerator size={15} />,
  "tablet-smartphone": <Tablet size={15} />,
  tablet: <Tablet size={15} />,
  refrigerator: <Refrigerator size={15} />,
  camera: <Camera size={15} />,
};

function MenuIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

export function CategoryNav() {
  const { data } = useListCategories();
  const [location] = useLocation();

  const backendCategories = toArray<Category>(data).filter(
    (cat) => Boolean(cat?.slug) && Boolean(cat?.name)
  );

  const categories: Category[] =
    backendCategories.length > 0 ? backendCategories : FALLBACK_CATEGORIES;

  return (
    <nav className="bg-white border-b sticky top-16 z-40 hidden md:block shadow-sm">
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-center min-w-full px-4">
          <div className="inline-flex items-center gap-0 py-0">
            <Link
              href="/category/all"
              className={`
                group flex items-center gap-1.5 px-4 py-3 text-sm font-semibold
                whitespace-nowrap transition-colors border-b-2
                ${
                  location === "/category/all"
                    ? "text-orange-500 border-orange-500"
                    : "text-gray-800 border-transparent hover:text-orange-500 hover:border-orange-400"
                }
              `}
            >
              <MenuIcon size={15} />
              All Categories
              
            </Link>

            <span className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />

            {categories.map((cat) => {
              const isActive = location === `/category/${cat.slug}`;
              const normalizedIcon = (cat.icon || "").trim().toLowerCase();
              const icon = iconMap[normalizedIcon] || <Smartphone size={15} />;

              return (
                <Link
                  key={`${cat.id}-${cat.slug}`}
                  href={`/category/${cat.slug}`}
                  className={`
                    group flex items-center gap-1.5 px-4 py-3 text-sm font-medium
                    whitespace-nowrap transition-colors border-b-2
                    ${
                      isActive
                        ? "text-orange-500 border-orange-500"
                        : "text-gray-600 border-transparent hover:text-orange-500 hover:border-orange-400"
                    }
                  `}
                >
                  <span
                    className={
                      isActive
                        ? "text-orange-500"
                        : "text-gray-400 group-hover:text-orange-400 transition-colors"
                    }
                  >
                    {icon}
                  </span>

                  {cat.name}

                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}