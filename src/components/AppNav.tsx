"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { NotificationBell } from "@/components/NotificationBell";
import { formatCoins } from "@/lib/auction-ui";
import type { User, Wallet } from "@/lib/auction-ui";

const navItems = [
  { href: "/auctions", label: "Auctions" },
  { href: "/sell", label: "Sell" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/wallet", label: "Wallet" },
  { href: "/history", label: "History" },
  { href: "/contact", label: "Contact" }
];

export function AppNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const visibleNavItems = user?.isAdmin
    ? [...navItems, { href: "/admin", label: "Admin" }]
    : navItems;

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
    <header className="sticky top-0 z-30 border-b border-[#d0a02e]/20 bg-[#10100f]/95 text-white shadow-2xl shadow-black/15 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <LogoMark />
          <span className="text-2xl font-semibold tracking-tight transition group-hover:text-[#f2c85b]">
            Snipe
          </span>
        </Link>

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
          <nav className="flex w-full max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.045] p-1 text-sm font-semibold text-white/70 md:w-auto">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-2 transition ${
                    isActive
                      ? "bg-[#d0a02e] text-[#151515] shadow-sm shadow-black/20"
                      : "hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {user && wallet ? (
            <div className="flex shrink-0 items-center gap-2 pl-0 md:pl-2">
              <NotificationBell isSignedIn={Boolean(user)} />
              <Link
                href="/wallet"
                className="rounded-full border border-[#d0a02e]/45 bg-[#d0a02e]/15 px-3 py-2 text-sm font-bold text-[#f2c85b]"
              >
                {formatCoins(wallet.balance)} credits
              </Link>
              <button
                onClick={signOut}
                disabled={isBusy}
                className="rounded-full border border-white/15 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="shrink-0 pl-0 md:pl-2">
              <Link
                href="/signin"
                className="inline-flex rounded-full bg-[#d0a02e] px-4 py-2 text-sm font-bold text-[#151515] shadow-sm shadow-black/20 transition hover:bg-[#e4b645]"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
