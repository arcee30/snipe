"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { useSession } from "@/hooks/useSession";
import {
  auctionImage,
  estimateValue,
  formatCoins,
  timeLeft,
  watcherCount
} from "@/lib/auction-ui";
import type { Auction } from "@/lib/auction-ui";

export default function AuctionsPage() {
  const { user, refreshSession } = useSession();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [notice, setNotice] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refreshAuctions() {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/auctions");
      const data = await response.json();
      setAuctions(data.auctions ?? []);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    refreshAuctions();
    const timer = window.setInterval(refreshAuctions, 5_000);
    return () => window.clearInterval(timer);
  }, []);

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

    setNotice("Bid placed. Your credits are held until you are outbid or the auction closes.");
    await Promise.all([refreshAuctions(), refreshSession()]);
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

    setNotice("Buyout complete. The lot is now in your auction history.");
    await Promise.all([refreshAuctions(), refreshSession()]);
    window.dispatchEvent(new Event("snipe-session-change"));
  }

  return (
    <PageFrame>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              Live auctions
            </h1>
            <p className="mt-3 max-w-2xl text-[#5f6f80]">
              Limited drops from bot sellers and players. Bid above the current
              price, or buy out before someone else takes the lot.
            </p>
          </div>
          <button
            onClick={refreshAuctions}
            disabled={isRefreshing}
            className="w-fit rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-bold shadow-sm disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing..." : "Refresh market"}
          </button>
        </div>

        {notice ? (
          <div className="mt-5 rounded-md border border-[#c99a2e]/30 bg-[#fff7df] px-4 py-3 text-sm font-semibold text-[#6f5418]">
            {notice}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {auctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              isSignedIn={Boolean(user)}
              onBid={handleBid}
              onBuyout={handleBuyout}
            />
          ))}
        </div>
      </section>
    </PageFrame>
  );
}

function AuctionCard({
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
      setError(error instanceof Error ? error.message : "Unable to buy out auction");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/10">
      <div className="relative aspect-[16/9] overflow-hidden bg-black">
        <img
          src={auctionImage(auction)}
          alt={`${auction.item.title} auction lot`}
          className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 to-transparent p-4 text-white">
          <span className="rounded bg-white/90 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6a20]">
            {auction.item.category}
          </span>
          <span className="rounded bg-black/55 px-3 py-2 text-sm font-bold">
            {timeLeft(auction.endsAt)}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {auction.item.title}
            </h2>
            <p className="mt-2 leading-7 text-[#5f6f80]">
              {auction.item.description}
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-full bg-[#fff2c5] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a20]">
            {auction.highestBidder ? "Bid active" : "Fresh lot"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Metric label="Current" value={formatCoins(auction.currentPrice)} />
          <Metric label="Buyout" value={formatCoins(auction.buyoutPrice)} />
          <Metric label="Estimate" value={formatCoins(estimateValue(auction))} />
          <Metric label="Watching" value={String(watcherCount(auction.id))} />
        </div>

        <p className="mt-4 text-sm text-[#5f6f80]">
          Seller: <span className="font-semibold">{auction.seller.username}</span>
          {auction.highestBidder
            ? ` | Leader: ${auction.highestBidder.username}`
            : ""}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <form onSubmit={submitBid} className="flex gap-2">
            <input
              value={bidAmount}
              onChange={(event) => setBidAmount(event.target.value)}
              inputMode="numeric"
              className="min-w-0 flex-1 rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
            />
            <button
              disabled={!isSignedIn || isBusy}
              className="rounded-md bg-[#151515] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Bid
            </button>
          </form>
          <button
            onClick={submitBuyout}
            disabled={!isSignedIn || isBusy}
            className="rounded-md bg-[#d0a02e] px-4 py-2 text-sm font-bold text-[#151515] disabled:opacity-50"
          >
            Buyout
          </button>
        </div>

        {!isSignedIn ? (
          <p className="mt-3 text-sm font-semibold text-[#8a6a20]">
            Sign in from the navbar to bid.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm font-semibold text-[#a33131]">{error}</p> : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/[0.04] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5f6f80]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
