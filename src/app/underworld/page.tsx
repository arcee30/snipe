"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SnipeNotFound } from "@/components/SnipeNotFound";
import { useSession } from "@/hooks/useSession";
import {
  auctionImage,
  formatCoins,
  timeLeft,
  watcherCount
} from "@/lib/auction-ui";
import { underworldStorageKeys } from "@/lib/underworld-access";
import type { Auction } from "@/lib/auction-ui";

type UnderworldAsset = Auction & {
  cleanValue: number;
  launderingQuote: {
    fee: number;
    durationMs: number;
  };
};

type UnderworldDashboard = {
  auctions: Auction[];
  stash: UnderworldAsset[];
  laundering: UnderworldAsset[];
  records: UnderworldAsset[];
  summary: {
    dirtyValue: number;
    launderingValue: number;
    cleanedValue: number;
    potentialCleanValue: number;
  };
};

const tabs = ["market", "stash", "laundering", "records"] as const;
type Tab = (typeof tabs)[number];
type AccessStatus = "checking" | "locked" | "unlocked";

function UnderworldLogoMark() {
  return (
    <svg
      className="h-12 w-12 shrink-0 drop-shadow-[0_0_18px_rgba(255,45,55,0.28)]"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="12"
        fill="#191314"
        stroke="rgba(255,65,76,0.55)"
      />
      <path
        d="M32 13c-11.1 0-18.7 8.6-18.7 20.5 0 6.8 2.9 12.8 7.5 16.4 3 2.4 6.8 3.7 11.2 3.7s8.2-1.3 11.2-3.7c4.6-3.6 7.5-9.6 7.5-16.4C50.7 21.6 43.1 13 32 13Z"
        fill="#f5f0eb"
      />
      <path
        d="M32 13c11.1 0 18.7 8.6 18.7 20.5 0 6.8-2.9 12.8-7.5 16.4-3 2.4-6.8 3.7-11.2 3.7V13Z"
        fill="#d9d2cd"
      />
      <path
        d="M19.5 36.8c2.9-3 7.2-3.1 10.5-.5-3.4 4.2-7.3 4.3-10.5.5Zm25 0c-2.9-3-7.2-3.1-10.5-.5 3.4 4.2 7.3 4.3 10.5.5Z"
        fill="#120f10"
      />
      <path
        d="M32 11v9m0 24v9M11 32h9m24 0h9"
        stroke="#ff3040"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle
        cx="32"
        cy="32"
        r="12"
        fill="none"
        stroke="#ff3040"
        strokeWidth="2.8"
      />
      <circle
        cx="32"
        cy="32"
        r="5.2"
        fill="#ff3040"
      />
    </svg>
  );
}

export default function UnderworldPage() {
  const { user, wallet, isLoading, refreshSession } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [dashboard, setDashboard] = useState<UnderworldDashboard | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [underworldAlias, setUnderworldAlias] = useState("");
  const [aliasDraft, setAliasDraft] = useState("");
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("checking");

  async function refreshUnderworld(showBusy = false) {
    if (showBusy) {
      setIsBusy(true);
    }

    try {
      const response = await fetch("/api/underworld");
      const data = await response.json();
      setDashboard(data);
    } catch {
      setError("Unable to reach the underworld desk.");
    } finally {
      if (showBusy) {
        setIsBusy(false);
      }
    }
  }

  useEffect(() => {
    if (accessStatus !== "unlocked") {
      return;
    }

    refreshUnderworld();
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        refreshUnderworld();
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [accessStatus]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const storageKeys = underworldStorageKeys(user);
    let savedAlias = "";
    let hasSeenOnboarding = false;

    try {
      const isUnlocked = window.localStorage.getItem(storageKeys.unlock) === "true";

      if (!isUnlocked) {
        setAccessStatus("locked");
        setDashboard(null);
        setUnderworldAlias("");
        setAliasDraft("");
        setShowOnboarding(false);
        return;
      }

      savedAlias = window.localStorage.getItem(storageKeys.alias) ?? "";
      hasSeenOnboarding =
        window.localStorage.getItem(storageKeys.onboarding) === "true";
    } catch {
      setAccessStatus("locked");
      hasSeenOnboarding = false;
      return;
    }

    setAccessStatus("unlocked");
    setUnderworldAlias(savedAlias);
    setAliasDraft(savedAlias);
    setShowOnboarding(!hasSeenOnboarding || !savedAlias);
  }, [isLoading, user]);

  const categories = useMemo(() => {
    return Array.from(
      new Set((dashboard?.auctions ?? []).map((auction) => auction.item.category))
    ).sort((left, right) => left.localeCompare(right));
  }, [dashboard?.auctions]);

  async function handleBid(auctionId: string, amount: number) {
    const response = await fetch(`/api/auctions/${auctionId}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to place bid");
    }

    setNotice("Bid placed. Keep the window clean until the clock runs out.");
    await Promise.all([refreshUnderworld(), refreshSession()]);
    window.dispatchEvent(new Event("snipe-session-change"));
  }

  async function handleBuyout(auctionId: string) {
    const response = await fetch(`/api/auctions/${auctionId}/buyout`, {
      method: "POST"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to buy out auction");
    }

    setNotice("Buyout complete. The lot is now in your underworld stash.");
    setActiveTab("stash");
    await Promise.all([refreshUnderworld(), refreshSession()]);
    window.dispatchEvent(new Event("snipe-session-change"));
  }

  async function handleLaunder(auctionId: string) {
    setIsBusy(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/underworld/launder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionId })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to start clean-up");
      }

      setNotice("Clean-up started. The asset will stay locked until verification clears.");
      setActiveTab("laundering");
      await Promise.all([refreshUnderworld(), refreshSession()]);
      window.dispatchEvent(new Event("snipe-session-change"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to start clean-up");
    } finally {
      setIsBusy(false);
    }
  }

  function completeOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const alias = aliasDraft.trim() || "Nocturne";
    const storageKeys = underworldStorageKeys(user);

    try {
      window.localStorage.setItem(storageKeys.alias, alias);
      window.localStorage.setItem(storageKeys.onboarding, "true");
    } catch {
      // The session can proceed even if the browser blocks local storage.
    }

    setUnderworldAlias(alias);
    setAliasDraft(alias);
    setShowOnboarding(false);
  }

  const activeAuctions = dashboard?.auctions ?? [];
  const stash = dashboard?.stash ?? [];
  const laundering = dashboard?.laundering ?? [];
  const records = dashboard?.records ?? [];

  if (accessStatus === "locked") {
    return <SnipeNotFound />;
  }

  if (accessStatus === "checking") {
    return (
      <main className="min-h-screen bg-[#f7f3e9]" aria-busy="true">
        <span className="sr-only">Checking market access</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#120f10] text-[#f0e8e2]">
      <div className="mx-auto max-w-[92rem] px-5 py-6 md:px-8">
        <header className="flex flex-col gap-4 border-b border-red-500/20 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <UnderworldLogoMark />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-300">
                Snipe
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Underworld Market
              </h1>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Pill>
              Alias: {underworldAlias || user?.username || "unregistered"}
            </Pill>
            <Pill>{formatCoins(wallet?.balance ?? 0)} credits</Pill>
            <button
              onClick={() => refreshUnderworld(true)}
              disabled={isBusy}
              className="rounded-full border border-red-400/30 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-500/10 disabled:opacity-45"
            >
              Refresh
            </button>
            <Link
              href="/auctions"
              className="rounded-full bg-[#f0e8e2] px-4 py-2 text-sm font-bold text-[#120f10]"
            >
              Exit to Snipe
            </Link>
          </div>
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Private channel
            </p>
            <h2 className="mt-3 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
              Discounted lots. Dirty paper. Clean exits.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#b9aaa7]">
              The underworld board is isolated from the public market. Buy from
              the shadow catalog, hold assets in your stash, then pay for
              clean-up and wait for verification before they surface in your
              public portfolio.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Dirty value" value={formatCoins(dashboard?.summary.dirtyValue ?? 0)} />
            <StatCard
              label="In clean-up"
              value={formatCoins(dashboard?.summary.launderingValue ?? 0)}
            />
            <StatCard
              label="Cleaned value"
              value={formatCoins(dashboard?.summary.cleanedValue ?? 0)}
            />
            <StatCard
              label="Categories"
              value={formatCoins(categories.length)}
            />
          </div>
        </section>

        <nav className="flex flex-wrap gap-2 border-y border-red-500/20 py-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition ${
                activeTab === tab
                  ? "bg-red-500 text-white"
                  : "border border-red-400/20 text-[#d6c8c4] hover:bg-red-500/10"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {notice ? (
          <p className="mt-5 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-lg border border-red-400/35 bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-100">
            {error}
          </p>
        ) : null}

        {activeTab === "market" ? (
          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            {activeAuctions.map((auction) => (
              <UnderworldAuctionCard
                key={auction.id}
                auction={auction}
                isSignedIn={Boolean(user)}
                onBid={handleBid}
                onBuyout={handleBuyout}
              />
            ))}
          </section>
        ) : null}

        {activeTab === "stash" ? (
          <AssetGrid
            emptyTitle="No dirty assets held"
            emptyBody="Buy an underworld lot to hold it here before clean-up."
            assets={stash}
            action={(asset) => (
              <button
                onClick={() => handleLaunder(asset.id)}
                disabled={!user || isBusy}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
              >
                Clean for {formatCoins(asset.launderingQuote.fee)}
              </button>
            )}
          />
        ) : null}

        {activeTab === "laundering" ? (
          <AssetGrid
            emptyTitle="No clean-up jobs active"
            emptyBody="Assets being verified and appraised will appear here."
            assets={laundering}
            action={(asset) => (
              <span className="rounded-md border border-red-400/25 px-3 py-2 text-xs font-bold text-red-100">
                Clears in {durationLeft(asset.launderingCompletesAt)}
              </span>
            )}
          />
        ) : null}

        {activeTab === "records" ? (
          <AssetGrid
            emptyTitle="No underworld records"
            emptyBody="Your shadow purchases, clean-up jobs, and cleared assets will be listed here."
            assets={records}
            action={(asset) => (
              <span className="rounded-md border border-red-400/25 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-100">
                {asset.transferStatus?.toLowerCase()}
              </span>
            )}
          />
        ) : null}
      </div>

      {showOnboarding ? (
        <UnderworldOnboarding
          aliasDraft={aliasDraft}
          onAliasChange={setAliasDraft}
          onSubmit={completeOnboarding}
        />
      ) : null}
    </main>
  );
}

function UnderworldOnboarding({
  aliasDraft,
  onAliasChange,
  onSubmit
}: {
  aliasDraft: string;
  onAliasChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/86 px-5 backdrop-blur-md">
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-red-500/25 bg-[#151112] p-8 shadow-2xl shadow-black/60 md:p-10"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/70 to-transparent" />
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-300">
          Private channel opened
        </p>
        <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-[#f0e8e2] md:text-5xl">
          You found the door. Leave your public name outside.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#b9aaa7]">
          The underworld ledger runs separate from Snipe. Choose the name this
          room will know you by. It stays on this device and will not ask again.
        </p>

        <label
          className="mt-8 block text-sm font-bold text-[#f0e8e2]"
          htmlFor="underworld-alias"
        >
          Underworld alias
        </label>
        <input
          id="underworld-alias"
          value={aliasDraft}
          onChange={(event) => onAliasChange(event.target.value)}
          autoFocus
          maxLength={24}
          placeholder="Nocturne"
          className="mt-3 w-full rounded-lg border border-red-400/25 bg-black/35 px-4 py-3 text-lg font-semibold text-[#f0e8e2] outline-none transition placeholder:text-[#7f706d] focus:border-red-300 focus:bg-black/45"
        />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[#8f807d]">
            Overworld balances remain visible. Overworld assets do not enter
            this room until they are cleaned.
          </p>
          <button className="shrink-0 rounded-full bg-red-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/35 transition hover:bg-red-400">
            Enter underworld
          </button>
        </div>
      </form>
    </div>
  );
}

function UnderworldAuctionCard({
  auction,
  isSignedIn,
  onBid,
  onBuyout
}: {
  auction: Auction;
  isSignedIn: boolean;
  onBid: (auctionId: string, amount: number) => Promise<void>;
  onBuyout: (auctionId: string) => Promise<void>;
}) {
  const [bidAmount, setBidAmount] = useState(String(auction.currentPrice + 1));
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const cleanValue = auction.item.estimatedCleanValue ?? auction.buyoutPrice;
  const discount = Math.max(0, Math.round((1 - auction.buyoutPrice / cleanValue) * 100));

  useEffect(() => {
    setBidAmount(String(auction.currentPrice + 1));
  }, [auction.currentPrice]);

  async function submitBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError("");

    try {
      await onBid(auction.id, Number(bidAmount));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to place bid");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitBuyout() {
    setIsBusy(true);
    setError("");

    try {
      await onBuyout(auction.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to buy out");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-red-500/18 bg-[#1b1718] shadow-2xl shadow-black/20 [contain-intrinsic-size:720px] [content-visibility:auto]">
      <div className="relative aspect-[16/9] overflow-hidden bg-black">
        <img
          src={auctionImage(auction)}
          alt={`${auction.item.title} underworld lot`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-80 transition duration-500 hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent p-4">
          <span className="rounded bg-red-500 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
            {auction.item.category}
          </span>
          <span className="rounded bg-black/65 px-3 py-2 text-sm font-bold">
            {timeLeft(auction.endsAt)}
          </span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">
              {auction.item.title}
            </h3>
            <p className="mt-2 leading-7 text-[#b9aaa7]">
              {auction.item.description}
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-full bg-red-500/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-red-200">
            {discount}% below clean
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <DarkMetric label="Current" value={formatCoins(auction.currentPrice)} />
          <DarkMetric label="Buyout" value={formatCoins(auction.buyoutPrice)} />
          <DarkMetric label="Clean value" value={formatCoins(cleanValue)} />
          <DarkMetric label="Watching" value={String(watcherCount(auction.id))} />
        </div>
        <p className="mt-4 text-sm text-[#b9aaa7]">
          Broker: <span className="font-semibold text-[#f0e8e2]">{auction.seller.username}</span>
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <form onSubmit={submitBid} className="flex gap-2">
            <input
              value={bidAmount}
              onChange={(event) => setBidAmount(event.target.value)}
              inputMode="numeric"
              className="min-w-0 flex-1 rounded-md border border-red-400/20 bg-black/35 px-3 py-2 text-sm outline-none focus:border-red-400"
            />
            <button
              disabled={!isSignedIn || isBusy}
              className="rounded-md bg-[#f0e8e2] px-4 py-2 text-sm font-bold text-[#120f10] disabled:opacity-45"
            >
              Bid
            </button>
          </form>
          <button
            onClick={submitBuyout}
            disabled={!isSignedIn || isBusy}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
          >
            Buyout
          </button>
        </div>
        {!isSignedIn ? (
          <p className="mt-3 text-sm font-semibold text-red-200">
            Sign in before entering the room.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm font-semibold text-red-200">{error}</p> : null}
      </div>
    </article>
  );
}

function AssetGrid({
  assets,
  emptyTitle,
  emptyBody,
  action
}: {
  assets: UnderworldAsset[];
  emptyTitle: string;
  emptyBody: string;
  action: (asset: UnderworldAsset) => React.ReactNode;
}) {
  if (assets.length === 0) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-red-400/25 bg-[#1b1718] px-6 py-14 text-center">
        <h3 className="text-2xl font-semibold">{emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-xl text-[#b9aaa7]">{emptyBody}</p>
      </section>
    );
  }

  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-2">
      {assets.map((asset) => (
        <article
          key={asset.id}
          className="grid overflow-hidden rounded-xl border border-red-500/18 bg-[#1b1718] shadow-xl shadow-black/20 [contain-intrinsic-size:360px] [content-visibility:auto] md:grid-cols-[14rem_1fr]"
        >
          <div className="aspect-[16/11] bg-black md:aspect-auto">
            <img
              src={auctionImage(asset)}
              alt={`${asset.item.title} asset`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover opacity-80"
            />
          </div>
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">
              {asset.item.category}
            </p>
            <h3 className="mt-2 text-2xl font-semibold">{asset.item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#b9aaa7]">
              {asset.item.description}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <DarkMetric label="Paid" value={formatCoins(asset.currentPrice)} />
              <DarkMetric label="Clean value" value={formatCoins(asset.cleanValue)} />
              <DarkMetric label="Fee" value={formatCoins(asset.launderingQuote.fee)} />
            </div>
            <div className="mt-4">{action(asset)}</div>
          </div>
        </article>
      ))}
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-red-400/25 bg-red-500/8 px-4 py-2 text-sm font-bold text-red-100">
      {children}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-red-500/18 bg-[#1b1718] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/25 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b9aaa7]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-[#f0e8e2]">{value}</p>
    </div>
  );
}

function durationLeft(value?: string | null) {
  if (!value) {
    return "pending";
  }

  const diff = new Date(value).getTime() - Date.now();

  if (diff <= 0) {
    return "on refresh";
  }

  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.ceil((diff % 3_600_000) / 60_000);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
