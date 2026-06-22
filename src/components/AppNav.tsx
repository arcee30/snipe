"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { formatCoins } from "@/lib/auction-ui";
import type { User, Wallet } from "@/lib/auction-ui";

const navItems = [
  { href: "/auctions", label: "Auctions" },
  { href: "/sell", label: "Sell" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/wallet", label: "Wallet" },
  { href: "/history", label: "History" },
  { href: "/#contact", label: "Contact" }
];

export function AppNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function refreshSession() {
    const response = await fetch("/api/me");
    const data = await response.json();
    setUser(data.user);
    setWallet(data.wallet);
  }

  useEffect(() => {
    refreshSession().catch(() => {
      setUser(null);
      setWallet(null);
    });

    function refresh() {
      refreshSession().catch(() => undefined);
    }

    window.addEventListener("snipe-session-change", refresh);
    return () => window.removeEventListener("snipe-session-change", refresh);
  }, []);

  async function signOut() {
    setIsBusy(true);

    try {
      const response = await fetch("/api/session", { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to sign out");
      }

      setUser(null);
      setWallet(null);
      window.dispatchEvent(new Event("snipe-session-change"));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#10100f]/95 text-white shadow-lg shadow-black/10 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <a href="/" className="flex items-center gap-3">
          <LogoMark />
          <span className="text-2xl font-semibold tracking-tight">Snipe</span>
        </a>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <nav className="flex gap-1 overflow-x-auto text-sm font-semibold text-white/70">
            {navItems.map((item) => {
              const isActive =
                item.href !== "/#contact" && pathname === item.href;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 transition ${
                    isActive
                      ? "bg-white/12 text-white"
                      : "hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {user && wallet ? (
            <div className="flex items-center gap-2 pl-0 md:pl-2">
              <a
                href="/wallet"
                className="rounded-md border border-[#d0a02e]/45 bg-[#d0a02e]/15 px-3 py-2 text-sm font-bold text-[#f2c85b]"
              >
                {formatCoins(wallet.balance)} credits
              </a>
              <button
                onClick={signOut}
                disabled={isBusy}
                className="rounded-md border border-white/15 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="pl-0 md:pl-2">
              <a
                href="/signin"
                className="inline-flex rounded-md bg-[#d0a02e] px-4 py-2 text-sm font-bold text-[#151515] transition hover:bg-[#e4b645]"
              >
                Sign in
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
