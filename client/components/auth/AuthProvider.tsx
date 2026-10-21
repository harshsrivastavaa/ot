'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, login as loginRequest } from '@/services/authService';
import type { User } from '@/types/api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = 'ot-hub-token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const clearSession = () => {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('ot-hub:session-expired', clearSession);

    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
    } else {
      getCurrentUser()
        .then((currentUser) => {
          if (active) setUser(currentUser);
        })
        .catch(() => {
          if (active) clearSession();
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
      window.removeEventListener('ot-hub:session-expired', clearSession);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
