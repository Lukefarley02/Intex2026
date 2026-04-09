import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/api/AuthContext";
import { ThemeProvider } from "@/api/ThemeContext";
import { RootkitProvider, useRootkit } from "@/api/RootkitContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";
import RootkitOverlay from "@/components/RootkitOverlay";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Donate from "./pages/Donate";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Dashboard from "./pages/Dashboard";
import StaffDashboard from "./pages/StaffDashboard";
import Donors from "./pages/Donors";
import Safehouses from "./pages/Safehouses";
import Residents from "./pages/Residents";
import Reports from "./pages/Reports";
import { useAuth } from "@/api/AuthContext";
import DonorPortal from "./pages/DonorPortal";
import TaxReceipt from "./pages/TaxReceipt";
import Admin from "./pages/Admin";
import ProcessRecording from "./pages/ProcessRecording";
import HomeVisitation from "./pages/HomeVisitation";
import MLInsights from "./pages/MLInsights";
import AccountSettings from "./pages/AccountSettings";
import MyReports from "./pages/MyReports";

const queryClient = new QueryClient();

// Role-based dashboard router. Admins get the full monetary dashboard;
// Staff get the case-worker dashboard (safehouse snapshot, upcoming visits,
// counseling history, weekly check-ins). Staff have no dedicated "portal"
// anymore — this is their landing page.
const DashboardRouter = () => {
  const { hasRole } = useAuth();
  if (hasRole("Admin")) return <Dashboard />;
  return <StaffDashboard />;
};

/** Renders the rootbeer rain when rootkit mode is active */
const RootkitLayer = () => {
  const { active } = useRootkit();
  if (!active) return null;
  return <RootkitOverlay />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <RootkitProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RootkitLayer />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthProvider>
          <CookieConsent />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Admin + Staff */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/donors"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <Donors />
                </ProtectedRoute>
              }
            />
            {/* Safehouses is Admin-only — Staff see their assigned safehouse
                on the Staff Dashboard instead. */}
            <Route
              path="/safehouses"
              element={
                <ProtectedRoute roles={["Admin"]}>
                  <Safehouses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/residents"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <Residents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/process-recording"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <ProcessRecording />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home-visitation"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <HomeVisitation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <MyReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            {/* Donor */}
            <Route
              path="/my-impact"
              element={
                <ProtectedRoute roles={["Admin", "Staff", "Donor"]}>
                  <DonorPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tax-receipt"
              element={
                <ProtectedRoute roles={["Admin", "Staff", "Donor"]}>
                  <TaxReceipt />
                </ProtectedRoute>
              }
            />

            {/* Any authenticated user can manage their own account */}
            <Route
              path="/account"
              element={
                <ProtectedRoute roles={["Admin", "Staff", "Donor"]}>
                  <AccountSettings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ml-insights"
              element={
                <ProtectedRoute roles={["Admin"]} founderOnly>
                  <MLInsights />
                </ProtectedRoute>
              }
            />

            {/* Admin only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["Admin"]}>
                  <Admin />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </RootkitProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;