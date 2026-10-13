"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, firebaseConfigured, SUPER_ADMIN_EMAIL } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  ready: boolean;
  /** Super admin: the fixed email, and it must be verified (Google sign-in always is). */
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ user: null, ready: false, isAdmin: false, logout: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth(), (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const isAdmin = !!user && user.emailVerified && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  return <Ctx.Provider value={{ user, ready, isAdmin, logout: () => signOut(auth()) }}>{children}</Ctx.Provider>;
}
