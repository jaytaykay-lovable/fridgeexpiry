import { useEffect, useMemo, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import InventoryPage from "@/pages/InventoryPage";
import CameraPage from "@/pages/CameraPage";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/AuthPage";
import { RecipeDiscoveryPage } from "@/pages/RecipeDiscoveryPage";
import RecipeDetailPage from "@/pages/RecipeDetailPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { registerServiceWorker } from "@/lib/pushNotifications";
import { AnimatePresence, motion } from "framer-motion";

const queryClient = new QueryClient();

const NAV_ROUTE_ORDER = ["/", "/recipes", "/camera", "/analytics", "/profile"] as const;

const getRouteIndex = (pathname: string) => {
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return NAV_ROUTE_ORDER.indexOf(normalizedPath as (typeof NAV_ROUTE_ORDER)[number]);
};

const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? '100%' : direction < 0 ? '-100%' : 0,
    opacity: 0.5,
  }),
  animate: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : direction < 0 ? '100%' : 0,
    opacity: 0.5,
  }),
};

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const previousRouteIndex = useRef(getRouteIndex(location.pathname));

  const direction = useMemo(() => {
    const currentRouteIndex = getRouteIndex(location.pathname);

    if (currentRouteIndex === -1 || previousRouteIndex.current === -1) {
      return 0;
    }

    if (currentRouteIndex === previousRouteIndex.current) {
      return 0;
    }

    return currentRouteIndex > previousRouteIndex.current ? 1 : -1;
  }, [location.pathname]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    previousRouteIndex.current = getRouteIndex(location.pathname);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <>
      <div className="relative min-h-screen overflow-x-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.main
            key={location.pathname}
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full will-change-transform"
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 40,
              mass: 0.95,
            }}
          >
            <Routes location={location}>
              <Route path="/" element={<InventoryPage />} />
              <Route path="/recipes" element={<RecipeDiscoveryPage />} />
              <Route path="/recipes/:id" element={<RecipeDetailPage />} />
              <Route path="/camera" element={<CameraPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.main>
        </AnimatePresence>
      </div>
      <BottomNav />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
