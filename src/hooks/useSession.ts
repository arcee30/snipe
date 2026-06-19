"use client";

import { useCallback, useEffect, useState } from "react";
import type { User, Wallet } from "@/lib/auction-ui";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const response = await fetch("/api/me");
    const data = await response.json();
    setUser(data.user);
    setWallet(data.wallet);
    setIsLoading(false);
    return data;
  }, []);

  useEffect(() => {
    refreshSession().catch(() => {
      setUser(null);
      setWallet(null);
      setIsLoading(false);
    });

    function refresh() {
      refreshSession().catch(() => undefined);
    }

    window.addEventListener("snipe-session-change", refresh);
    return () => window.removeEventListener("snipe-session-change", refresh);
  }, [refreshSession]);

  return { user, wallet, isLoading, refreshSession };
}
