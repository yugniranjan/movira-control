import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function ProtectedRoute({ children }) {
  const { auth } = useAuth();
  const location = useLocation();
  if (!auth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
