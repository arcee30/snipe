"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { useSession } from "@/hooks/useSession";
import {
  formatCoins,
  ledgerDescription,
  ledgerTypeLabel
} from "@/lib/auction-ui";
import type { DailyRewardState, LedgerEntry } from "@/lib/auction-ui";

const adminQuickAmounts = [
  500_000,
  1_000_000,
  5_000_000,
  25_000_000,
  100_000_000,
  500_000_000
];

export default function WalletPage() {
  const { user, wallet, refreshSession } = useSession();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [rewardState, setRewardState] = useState<DailyRewardState | null>(null);
  const [adminAmount, setAdminAmount] = useState("1000000");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function refreshLedger() {
    const response = await fetch("/api/me");
    const data = await response.json();
    setLedger(data.ledger ?? []);
  }

  async function refreshRewardState() {
    const response = await fetch("/api/wallet/daily-reward");
    const data = await response.json();
    setRewardState(data.reward ?? null);
  }

  useEffect(() => {
    refreshLedger().catch(() => setLedger([]));
    refreshRewardState().catch(() => setRewardState(null));
  }, []);

  async function claimDailyReward() {
    setIsBusy(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/wallet/daily-reward", {
        method: "POST"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to claim reward");
      }

      const assetUnlocked = Boolean(data.claim?.assetAuctionId);
      setNotice(
        assetUnlocked
          ? "Daily reward claimed. Your seven-day asset has been added to your portfolio."
          : "Daily reward claimed. Credits have been added to your balance."
      );
      setRewardState(data.reward ?? null);
      await Promise.all([refreshSession(), refreshLedger()]);
      window.dispatchEvent(new Event("snipe-session-change"));
      window.dispatchEvent(new Event("snipe-notifications-change"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

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

      setNotice(`${formatCoins(amount)} admin credits added to your balance.`);
      await Promise.all([refreshSession(), refreshLedger()]);
      window.dispatchEvent(new Event("snipe-session-change"));
      window.dispatchEvent(new Event("snipe-notifications-change"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <PageFrame>
      <section className="mx-auto max-w-[92rem] px-5 py-10 md:px-8">
        <div className="ink-surface rounded-xl p-6 text-white md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d0a02e]">
                Account balance
              </p>
              <h1 className="display-serif mt-3 text-6xl font-semibold leading-none md:text-8xl">
                {wallet ? formatCoins(wallet.balance) : "0"}
              </h1>
              <p className="mt-2 text-lg font-semibold text-white/70">
                credits
              </p>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-white/62">
                {user
                  ? `Signed in as ${user.username}.`
                  : "Sign in to activate your account balance."}{" "}
                Manage your available balance here and keep enough liquidity for
                the next lot.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[24rem]">
              <div className="rounded-lg border border-white/12 bg-white/10 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d0a02e]">
                  Today
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {rewardState?.claimedToday ? "Claimed" : "Available"}
                </p>
              </div>
              <div className="rounded-lg border border-white/12 bg-white/10 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d0a02e]">
                  Next streak
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  Day {rewardState?.nextStreakDay ?? 1}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="premium-surface mt-6 rounded-xl p-5 ring-1 ring-black/10 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="display-serif text-5xl font-semibold leading-none md:text-6xl">
                Daily reward calendar
              </h2>
              <p className="mt-3 max-w-3xl text-lg leading-8 text-[#5f6f80]">
                Claim once per day. Consecutive claims build toward a
                portfolio asset on day seven.
              </p>
            </div>
            <button
              onClick={claimDailyReward}
              disabled={!user || isBusy || Boolean(rewardState?.claimedToday)}
              className="interactive-lift w-fit rounded-full bg-[#151515] px-6 py-4 text-sm font-bold text-white disabled:opacity-45"
            >
              {rewardState?.claimedToday
                ? "Claimed today"
                : "Claim today's reward"}
            </button>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(rewardState?.schedule ?? []).map((reward) => (
              <div
                key={reward.day}
                className={`min-h-[11rem] rounded-xl border p-5 ${
                  reward.isNext
                    ? "border-[#d0a02e] bg-[#fff7df] shadow-lg shadow-[#d0a02e]/10"
                    : reward.isClaimedInCurrentStreak
                      ? "border-[#d0a02e]/35 bg-[#f6f2e9]"
                      : "border-black/10 bg-white/70"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a20]">
                  Day {reward.day}
                </p>
                <p className="mt-4 text-3xl font-semibold">
                  {formatCoins(reward.credits)}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#5f6f80]">
                  {reward.asset ? "Credits + asset" : "Credits"}
                </p>
                {reward.asset ? (
                  <p className="mt-4 rounded-md bg-black/[0.04] px-3 py-2 text-xs font-semibold leading-5 text-[#5f6f80]">
                    Unlocks {reward.asset.title}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {user?.isAdmin ? (
            <div className="mt-6 rounded-xl border border-black/10 bg-black/[0.035] p-4">
              <p className="text-sm font-bold">Admin credit control</p>
              <p className="mt-1 text-sm text-[#5f6f80]">
                Admin accounts can add unrestricted credits to their own
                balance.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={adminAmount}
                  onChange={(event) => setAdminAmount(event.target.value)}
                  inputMode="numeric"
                  className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-[#c99a2e] focus:ring-2 focus:ring-[#c99a2e]/20"
                />
                <button
                  onClick={() => addCredits(Number(adminAmount))}
                  disabled={isBusy}
                  className="interactive-lift rounded-full bg-[#151515] px-5 py-2 text-sm font-bold text-white disabled:opacity-45"
                >
                  Add admin credits
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {adminQuickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setAdminAmount(String(amount))}
                    className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-bold"
                  >
                    {formatCoins(amount)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
        </section>

        <section className="premium-surface mt-6 rounded-xl p-5 ring-1 ring-black/10 md:p-6">
          <h2 className="display-serif text-4xl font-semibold leading-none">
            Recent wallet activity
          </h2>
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
