import { Header } from "./Header";
import { CategoryNav } from "./CategoryNav";
import { Footer } from "./Footer";
import { BackToTop } from "@/components/BackToTop";
import { CompareBar } from "@/components/CompareBar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col font-sans bg-gray-50 text-gray-900">
      <Header />
      <CategoryNav />
      <main className="flex-1 w-full">
        {children}
      </main>
      <Footer />
      <BackToTop />
      <CompareBar />
    </div>
  );
}
