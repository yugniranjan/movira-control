// src/routes/ProtectedRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import AccessDenied from "../pages/AccessDenied";
import { canAccessPolicy } from "../auth/access";

export default function ProtectedRoute({ children, policy }) {
  const auth = useSelector((state) => state.auth);
  if (!auth.token) return <Navigate to="/login" replace />;
  if (policy && !canAccessPolicy(auth, policy)) return <AccessDenied />;
  return children;
}
