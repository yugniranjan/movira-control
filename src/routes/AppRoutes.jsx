import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Loader from "../components/Loader";
import ControlAdminLayout from "../layouts/ControlAdminLayout";
import AccessDenied from "../pages/AccessDenied";
import NotFound from "../pages/NotFound";
import { firstAccessiblePath } from "../auth/access";
import { isValidParkSection } from "./routeConfig";
import { useSelector } from "react-redux";

const Login = lazy(() => import("../pages/auth/Login"));
const PlansPage = lazy(() =>
  import("../pages/saas/MoviraControl").then((module) => ({ default: module.PlansManager }))
);
const ParksPage = lazy(() =>
  import("../pages/saas/MoviraControl").then((module) => ({ default: module.ParksList }))
);
const ParkFormPage = lazy(() =>
  import("../pages/saas/MoviraControl").then((module) => ({ default: module.ParkForm }))
);
const ParkDetailPage = lazy(() =>
  import("../pages/saas/MoviraControl").then((module) => ({ default: module.ParkDetail }))
);
const PaymentOverviewPage = lazy(() => import("../paymentConsole/pages/OverviewPage"));
const PaymentVenuesPage = lazy(() => import("../paymentConsole/pages/VenuesPage"));
const PaymentVenueDetailPage = lazy(() => import("../paymentConsole/pages/VenueDetailPage"));
const PaymentPaymentsPage = lazy(() => import("../paymentConsole/pages/PaymentsPage"));
const PaymentPlatformBillingPage = lazy(() => import("../paymentConsole/pages/PlatformBillingPage"));

function ControlGuard() {
  return (
    <ProtectedRoute>
      <ControlAdminLayout />
    </ProtectedRoute>
  );
}

function PolicyRoute({ policy, children }) {
  return <ProtectedRoute policy={policy}>{children}</ProtectedRoute>;
}

function HomeRoute() {
  const auth = useSelector((state) => state.auth);
  const path = firstAccessiblePath(auth);
  return path ? <Navigate to={path} replace /> : <AccessDenied />;
}

function ParkDetailRoute() {
  const { section } = useParams();
  return isValidParkSection(section) ? <ParkDetailPage /> : <NotFound />;
}

export default function AppRoutes() {
  return (
    <Router>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ControlGuard />}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/movira-control" element={<Navigate to="/movira-control/parks" replace />} />
            <Route path="/movira-control/plans" element={<PolicyRoute policy="plans"><PlansPage /></PolicyRoute>} />
            <Route path="/movira-control/parks" element={<PolicyRoute policy="control"><ParksPage /></PolicyRoute>} />
            <Route path="/movira-control/parks/new" element={<PolicyRoute policy="control"><ParkFormPage /></PolicyRoute>} />
            <Route path="/movira-control/parks/:parkId/edit" element={<PolicyRoute policy="control"><ParkFormPage /></PolicyRoute>} />
            <Route path="/movira-control/parks/:parkId" element={<PolicyRoute policy="control"><ParkDetailRoute /></PolicyRoute>} />
            <Route path="/movira-control/parks/:parkId/:section" element={<PolicyRoute policy="control"><ParkDetailRoute /></PolicyRoute>} />

            <Route path="/payment-console" element={<PolicyRoute policy="payments"><PaymentOverviewPage /></PolicyRoute>} />
            <Route path="/payment-console/platform-billing" element={<PolicyRoute policy="billing"><PaymentPlatformBillingPage /></PolicyRoute>} />
            <Route path="/payment-console/venues" element={<PolicyRoute policy="venues"><PaymentVenuesPage /></PolicyRoute>} />
            <Route path="/payment-console/venues/:id" element={<PolicyRoute policy="venues"><PaymentVenueDetailPage /></PolicyRoute>} />
            <Route path="/payment-console/payments" element={<PolicyRoute policy="gateways"><PaymentPaymentsPage /></PolicyRoute>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
