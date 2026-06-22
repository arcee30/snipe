"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { useSession } from "@/hooks/useSession";
import {
  formatCoins,
  ledgerDescription,
  ledgerTypeLabel
} from "@/lib/auction-ui";
import type { LedgerEntry } from "@/lib/auction-ui";

const balanceIncrements = [100_000, 500_000, 1_000_000, 2_500_000, 5_000_000];

export default function WalletPage() {
  const { user, wallet, refreshSession } = useSession();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function refreshLedger() {
    const response = await fetch("/api/me");
    const data = await response.json();
    setLedger(data.ledger ?? []);
  }

  useEffect(() => {
    refreshLedger().catch(() => setLedger([]));
  }, []);

  async function addCredits(amount: number) {
    setIsBusy(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update balance");
      }

      setNotice(`${formatCoins(amount)} credits added to your balance.`);
      await Promise.all([refreshSession(), refreshLedger()]);
      window.dispatchEvent(new Event("snipe-session-change"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <PageFrame>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg bg-[#151515] p-6 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d0a02e]">
              Account balance
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
              {wallet ? formatCoins(wallet.balance) : "0"}
            </h1>
            <p className="mt-2 text-lg font-semibold text-white/70">credits</p>
            <p className="mt-5 leading-7 text-white/62">
              {user
                ? `Signed in as ${user.username}.`
                : "Sign in to activate your account balance."} Manage your
              available balance here and keep enough liquidity for the next lot.
            </p>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/10 md:p-6">
            <h2 className="text-2xl font-semibold">Increase balance</h2>
            <p className="mt-2 text-[#5f6f80]">
              Increase your available balance before placing larger bids or
              taking a lot off the board.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {balanceIncrements.map((amount) => (
                <button
                  key={amount}
                  onClick={() => addCredits(amount)}
                  disabled={!user || isBusy}
                  className="rounded-lg border border-black/10 bg-[#f6f2e9] p-4 text-left transition hover:border-[#c99a2e] hover:bg-[#fff7df] disabled:opacity-50"
                >
                  <p className="text-2xl font-semibold">
                    +{formatCoins(amount)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#8a6a20]">
                    Balance increment
                  </p>
                </button>
              ))}
            </div>
            {notice ? (
              <p className="mt-4 rounded-md bg-[#fff7df] px-3 py-2 text-sm font-semibold text-[#6f5418]">
                {notice}
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-md bg-[#fff0f0] px-3 py-2 text-sm font-semibold text-[#a33131]">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <section className="mt-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/10 md:p-6">
          <h2 className="text-2xl font-semibold">Recent wallet activity</h2>
          <div className="mt-4 grid gap-2">
            {ledger.length > 0 ? (
              ledger.slice(0, 12).map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-md bg-black/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{ledgerTypeLabel(entry.type)}</p>
                    <p className="text-sm text-[#5f6f80]">
                      {ledgerDescription(entry.description)}
                    </p>
                  </div>
                  <span
                    className={
                      entry.amount >= 0
                        ? "font-semibold text-[#2f7d32]"
                        : "font-semibold text-[#a33131]"
                    }
                  >
                    {entry.amount >= 0 ? "+" : ""}
                    {formatCoins(entry.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-md bg-black/[0.03] px-4 py-3 text-[#5f6f80]">
                No wallet activity yet.
              </p>
            )}
          </div>
        </section>
      </section>
    </PageFrame>
  );
}
