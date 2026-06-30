// src/routes/ProtectedRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = useSelector((state) => state.auth.token);
  return token ? children : <Navigate to="/login" replace />;
}
