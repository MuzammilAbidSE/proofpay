"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { api } from "./api";

type AuthContextValue = {
  authed: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "proofpay_token";
const ADDRESS_KEY = "proofpay_address";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [authed, setAuthed] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A stored session only counts if it matches the currently connected wallet —
  // switching accounts (or disconnecting) invalidates it since the JWT subject won't match.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem(TOKEN_KEY);
    const storedAddress = window.localStorage.getItem(ADDRESS_KEY);
    const matches = !!token && !!isConnected && storedAddress === address?.toLowerCase();
    setAuthed(matches);
    if (!matches && (token || storedAddress)) {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(ADDRESS_KEY);
    }
  }, [address, isConnected]);

  const signIn = useCallback(async () => {
    if (!address) return;
    setError(null);
    setSigningIn(true);
    try {
      const { message } = await api.requestNonce(address);
      const signature = await signMessageAsync({ message });
      const { accessToken } = await api.verify(address, signature);
      window.localStorage.setItem(TOKEN_KEY, accessToken);
      window.localStorage.setItem(ADDRESS_KEY, address.toLowerCase());
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSigningIn(false);
    }
  }, [address, signMessageAsync]);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ADDRESS_KEY);
    setAuthed(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authed, signingIn, error, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
