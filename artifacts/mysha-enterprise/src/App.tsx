import { AppLayout } from "@/components/layout/AppLayout";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import HomePage from "@/pages/home";
import CategoryPage from "@/pages/category";
import ProductPage from "@/pages/product";
import SearchPage from "@/pages/search";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import OrderDetailPage from "@/pages/order-detail";
import TrackPage from "@/pages/track";
import WishlistPage from "@/pages/wishlist";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import NotFound from "@/pages/not-found";
import ComparePage from "@/pages/compare";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProductForm from "@/pages/admin/product-form";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/category/:slug" component={CategoryPage} />
        <Route path="/product/:id" component={ProductPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/orders/:id" component={OrderDetailPage} />
        <Route path="/track" component={TrackPage} />
        <Route path="/wishlist" component={WishlistPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/compare" component={ComparePage} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/products/new" component={AdminProductForm} />
        <Route path="/admin/products/:id/edit" component={AdminProductForm} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
