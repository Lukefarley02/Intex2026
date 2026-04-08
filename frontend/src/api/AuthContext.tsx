import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

const API_BASE =
  import.meta.env.VITE_API_URL ??
  "https://ember-api-frbhh6fka2anfnac.francecentral-01.azurewebsites.net";

// ---- Types ----

interface User {
  email: string;
  roles: string[];
  adminScope?: "founder" | "region" | "location" | null;
  region?: string | null;
  city?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  /** True only for top-level admins (Admin role with no Region/City scope). */
  isFounder: boolean;
}

interface LoginResponse {
  token: string;
  expiration: string;
  email: string;
  roles: string[];
}

// ---- Context ----

const AuthContext = createContext<AuthState | null>(null);

// ---- Provider ----

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if we have a stored token and validate it
  useEffect(() => {
    const stored = sessionStorage.getItem("jwt");
    if (stored) {
      setToken(stored);
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Token expired");
          return res.json();
        })
        .then(
          (data: {
            email: string;
            roles: string[];
            adminScope?: "founder" | "region" | "location" | null;
            region?: string | null;
            city?: string | null;
          }) => {
            setUser({
              email: data.email,
              roles: data.roles,
              adminScope: data.adminScope ?? null,
              region: data.region ?? null,
              city: data.city ?? null,
            });
          },
        )
        .catch(() => {
          sessionStorage.removeItem("jwt");
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Login failed." }));
      throw new Error(err.message ?? "Login failed.");
    }

    const data: LoginResponse = await res.json();
    sessionStorage.setItem("jwt", data.token);
    setToken(data.token);

    // Fetch scope info (region/city/adminScope) so UI can gate founder-only features.
    let scope: {
      adminScope?: "founder" | "region" | "location" | null;
      region?: string | null;
      city?: string | null;
    } = {};
    try {
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      if (meRes.ok) scope = await meRes.json();
    } catch {
      /* non-fatal — scope stays empty */
    }

    const nextUser: User = {
      email: data.email,
      roles: data.roles,
      adminScope: scope.adminScope ?? null,
      region: scope.region ?? null,
      city: scope.city ?? null,
    };
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Registration failed." }));
      const messages = Object.values(err)
        .flat()
        .filter((v): v is string => typeof v === "string");
      throw new Error(messages.join(" ") || "Registration failed.");
    }
  }, []);

  const logout = useCallback(() => {
    if (token) {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("jwt");
  }, [token]);

  const hasRole = useCallback(
    (role: string) => user?.roles.includes(role) ?? false,
    [user],
  );

  const isFounder = user?.adminScope === "founder";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        hasRole,
        isFounder,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---- Hook ----

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}

// Pick the right landing page for a user based on their roles.
// Admin and Staff land on the admin/staff dashboard; donors (without an
// elevated role) land on their donor portal. Unauthenticated / unknown
// falls back to the public home page.
export function landingFor(roles: string[] | undefined): string {
  if (!roles || roles.length === 0) return "/";
  if (roles.includes("Admin") || roles.includes("Staff")) return "/dashboard";
  if (roles.includes("Donor")) return "/my-impact";
  return "/";
}
