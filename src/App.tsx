import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

// Pages and components
import { LandingPage } from "@/features/landing/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { HsCodesPage } from "@/features/hs/HsCodesPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ShipmentsListPage } from "@/features/shipments/ShipmentsListPage";
import { ShipmentWizard } from "@/features/shipments/ShipmentWizard";
import { ShipmentDetailPage } from "@/features/shipments/ShipmentDetailPage";
import { DocumentsPage } from "@/features/documents/DocumentsPage";
import { IssuesPage } from "@/features/issues/IssuesPage";
import NotFound from "@/pages/NotFound";

// Auth store and query client
import { useAuthStore } from "@/stores/auth";
import { queryClient } from "@/lib/queryClient";

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    if (!user) {
      checkAuth();
    }
  }, [user, checkAuth]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes with app shell */}
            <Route path="/app" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
            </Route>
            
            {/* Shipments routes */}
            <Route path="/shipments" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<ShipmentsListPage />} />
              <Route path="new" element={<ShipmentWizard />} />
              <Route path=":id" element={<ShipmentDetailPage />} />
            </Route>
            
            {/* Placeholder routes (coming soon) */}
            
            <Route path="/hs" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<HsCodesPage />} />
            </Route>
            
            <Route path="/documents" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<DocumentsPage />} />
            </Route>
            
            <Route path="/issues" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<IssuesPage />} />
            </Route>
            
            <Route path="/reports" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<ReportsPage />} />
            </Route>
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<SettingsPage />} />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
