import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);
const STORAGE_KEY = "movira.superadmin.auth";
const ADMIN_STORAGE_KEY = "authState";

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const adminRaw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!adminRaw) return null;
    const adminAuth = JSON.parse(adminRaw);
    const user = adminAuth.user || {};
    return {
      token: adminAuth.token,
      user: {
        name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || user.name,
        email: user.email,
        role: user.role,
        roleId: user.role_id,
        userId: user.user_id || user.id,
        organizationId: null,
        organizationName: "Movira",
      },
      locations: adminAuth.locations || [],
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      return readStoredAuth();
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(true);

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  }, [auth]);

  async function login(credentials) {
    const result = await api.login(credentials);
    setAuth(result);
    return result;
  }

  function logout() {
    setAuth(null);
  }

  return (
    <AuthContext.Provider value={{ auth, user: auth?.user || null, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
