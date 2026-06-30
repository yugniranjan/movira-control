import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Loader from "../components/Loader";
import MoviraControl from "../pages/saas/MoviraControl";
import ControlAdminLayout from "../layouts/ControlAdminLayout";
import { AuthProvider as PaymentAuthProvider } from "../paymentConsole/auth/AuthContext";
import PaymentProtectedRoute from "../paymentConsole/components/ProtectedRoute";
import PaymentOverviewPage from "../paymentConsole/pages/OverviewPage";
import PaymentVenuesPage from "../paymentConsole/pages/VenuesPage";
import PaymentVenueDetailPage from "../paymentConsole/pages/VenueDetailPage";
import PaymentPaymentsPage from "../paymentConsole/pages/PaymentsPage";

const Login = lazy(() => import("../pages/auth/Login"));

function ControlGuard() {
  return (
    <ProtectedRoute>
      <ControlAdminLayout />
    </ProtectedRoute>
  );
}

function PaymentConsoleGuard() {
  return (
    <PaymentAuthProvider>
      <PaymentProtectedRoute>
        <Outlet />
      </PaymentProtectedRoute>
    </PaymentAuthProvider>
  );
}

export default function AppRoutes() {
  return (
    <Router>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ControlGuard />}>
            <Route path="/" element={<Navigate to="/movira-control/parks" replace />} />
            <Route path="/movira-control" element={<MoviraControl />} />
            <Route path="/movira-control/parks" element={<MoviraControl />} />
            <Route path="/movira-control/parks/new" element={<MoviraControl />} />
            <Route path="/movira-control/parks/:parkId" element={<MoviraControl />} />
            <Route path="/movira-control/parks/:parkId/:section" element={<MoviraControl />} />

            <Route path="/payment-console" element={<PaymentConsoleGuard />}>
              <Route index element={<PaymentOverviewPage />} />
              <Route path="venues" element={<PaymentVenuesPage />} />
              <Route path="venues/:id" element={<PaymentVenueDetailPage />} />
              <Route path="payments" element={<PaymentPaymentsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/movira-control/parks" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
