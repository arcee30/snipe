"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { formatCoins } from "@/lib/auction-ui";
import type { User, Wallet } from "@/lib/auction-ui";

const navItems = [
  { href: "/auctions", label: "Auctions" },
  { href: "/sell", label: "Sell" },
  { href: "/wallet", label: "Wallet" },
  { href: "/history", label: "History" },
  { href: "/#contact", label: "Contact" }
];

export function AppNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [username, setUsername] = useState("");
  const [showSignin, setShowSignin] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState("");

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

  async function submitUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to sign in");
      }

      setUser(data.user);
      setWallet(data.wallet);
      setUsername("");
      setShowSignin(false);
      window.dispatchEvent(new Event("snipe-session-change"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

  async function signOut() {
    setIsBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/session", { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to sign out");
      }

      setUser(null);
      setWallet(null);
      window.dispatchEvent(new Event("snipe-session-change"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
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
            <div className="relative pl-0 md:pl-2">
              <button
                onClick={() => setShowSignin((current) => !current)}
                className="rounded-md bg-[#d0a02e] px-4 py-2 text-sm font-bold text-[#151515] transition hover:bg-[#e4b645]"
              >
                Sign in
              </button>
              {showSignin ? (
                <form
                  onSubmit={submitUsername}
                  className="absolute right-0 top-12 w-72 rounded-lg border border-black/10 bg-white p-3 text-[#151515] shadow-xl"
                >
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-[#5f6f80]">
                    Username
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="choose a name"
                      className="min-w-0 flex-1 rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
                    />
                    <button
                      disabled={isBusy}
                      className="rounded-md bg-[#151515] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Enter
                    </button>
                  </div>
                  {notice ? (
                    <p className="mt-2 text-xs font-semibold text-[#a33131]">
                      {notice}
                    </p>
                  ) : null}
                </form>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
