'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AuthState = {
  token: string | null;
  role: string | null;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({
  token: null,
  role: null,
  login: () => {},
  logout: () => {},
});

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() ||
  "https://poliq-production.up.railway.app";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const fetchRole = async (t: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRole(data.role || 'individual');
        localStorage.setItem('pv_role', data.role || 'individual');
      }
    } catch {
      // Silently fail — role stays null
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('pv_token');
    if (stored) {
      setToken(stored);
      const cachedRole = localStorage.getItem('pv_role');
      if (cachedRole) setRole(cachedRole);
      fetchRole(stored);
    }
  }, []);

  const login = (t: string) => {
    localStorage.setItem('pv_token', t);
    setToken(t);
    fetchRole(t);
  };

  const logout = () => {
    localStorage.removeItem('pv_token');
    localStorage.removeItem('pv_role');
    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
