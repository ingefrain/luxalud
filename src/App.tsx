import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Booking from "./pages/Booking";
import Login from "./pages/Login";
import DashboardHome from "./pages/dashboard/DashboardHome";
import CalendarPage from "./pages/dashboard/CalendarPage";
import AppointmentsPage from "./pages/dashboard/AppointmentsPage";
import PatientsPage from "./pages/dashboard/PatientsPage";
import PatientDetailPage from "./pages/dashboard/PatientDetailPage";
import SchedulesPage from "./pages/dashboard/SchedulesPage";
import PaymentsPage from "./pages/dashboard/PaymentsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
          </Route>
          <Route path="/agendar" element={<Booking />} />
          <Route path="/login" element={<Login />} />

          {/* Dashboard Routes - Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="calendario" element={<CalendarPage />} />
              <Route path="citas" element={<AppointmentsPage />} />
              <Route path="pacientes" element={<PatientsPage />} />
              <Route path="pacientes/:id" element={<PatientDetailPage />} />
              <Route path="horarios" element={<SchedulesPage />} />
              <Route path="ingresos" element={<PaymentsPage />} />
              <Route path="configuracion" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
