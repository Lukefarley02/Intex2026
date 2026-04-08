import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/api/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Donate from "./pages/Donate";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Privacy from "./pages/Privacy";
import Dashboard from "./pages/Dashboard";
import Donors from "./pages/Donors";
import Safehouses from "./pages/Safehouses";
import Residents from "./pages/Residents";
import Reports from "./pages/Reports";
import StaffPortal from "./pages/StaffPortal";
import DonorPortal from "./pages/DonorPortal";
import TaxReceipt from "./pages/TaxReceipt";
import Admin from "./pages/Admin";
import ProcessRecording from "./pages/ProcessRecording";
import HomeVisitation from "./pages/HomeVisitation";
import MLInsights from "./pages/MLInsights";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CookieConsent />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Admin + Staff */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <Dashboard />
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
            <Route
              path="/safehouses"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
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
              path="/reports"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
                  <StaffPortal />
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

            <Route
              path="/ml-insights"
              element={
                <ProtectedRoute roles={["Admin", "Staff"]}>
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
  </QueryClientProvider>
);

export default App;