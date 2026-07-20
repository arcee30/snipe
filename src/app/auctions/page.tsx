"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

const priceBands = [
  { label: "Any value", value: "all", min: 0, max: Number.POSITIVE_INFINITY },
  { label: "Under 1M", value: "under-1m", min: 0, max: 1_000_000 },
  { label: "1M to 5M", value: "1m-5m", min: 1_000_000, max: 5_000_000 },
  { label: "5M to 25M", value: "5m-25m", min: 5_000_000, max: 25_000_000 },
  { label: "25M+", value: "25m-plus", min: 25_000_000, max: Number.POSITIVE_INFINITY }
];

export default function AuctionsPage() {
  const { user, refreshSession } = useSession();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [priceBand, setPriceBand] = useState("all");
  const [sortMode, setSortMode] = useState("closing-soon");
  const [notice, setNotice] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refreshAuctions(showRefreshingState = false) {
    if (showRefreshingState) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch("/api/auctions");
      const data = await response.json();
      setAuctions(data.auctions ?? []);
    } finally {
      if (showRefreshingState) {
        setIsRefreshing(false);
      }
    }
  }

  useEffect(() => {
    refreshAuctions();
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        refreshAuctions();
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(auctions.map((auction) => auction.item.category)))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  }, [auctions]);

  const filteredAuctions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedBand = priceBands.find((band) => band.value === priceBand) ?? priceBands[0];

    return auctions
      .filter((auction) => {
        const searchableText = [
          auction.item.title,
          auction.item.category,
          auction.item.description,
          auction.seller.username,
          auction.highestBidder?.username ?? ""
        ]
          .join(" ")
          .toLowerCase();

        const matchesQuery = normalizedQuery ? searchableText.includes(normalizedQuery) : true;
        const matchesCategory = category === "all" || auction.item.category === category;
        const matchesPrice =
          auction.buyoutPrice >= selectedBand.min && auction.buyoutPrice < selectedBand.max;

        return matchesQuery && matchesCategory && matchesPrice;
      })
      .sort((left, right) => {
        if (sortMode === "highest-buyout") {
          return right.buyoutPrice - left.buyoutPrice;
        }

        if (sortMode === "lowest-buyout") {
          return left.buyoutPrice - right.buyoutPrice;
        }

        if (sortMode === "most-watched") {
          return watcherCount(right.id) - watcherCount(left.id);
        }

        return new Date(left.endsAt).getTime() - new Date(right.endsAt).getTime();
      });
  }, [auctions, category, priceBand, query, sortMode]);

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

    setNotice("Bid placed. The amount is reserved until you are outbid or the listing closes.");
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

    setNotice("Buyout complete. The lot has moved into your records.");
    await Promise.all([refreshAuctions(), refreshSession()]);
    window.dispatchEvent(new Event("snipe-session-change"));
  }

  return (
    <PageFrame>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="display-serif text-5xl font-semibold leading-none md:text-7xl">
              Live auctions
            </h1>
            <p className="mt-3 max-w-2xl text-[#5f6f80]">
              A live board of limited listings. Raise the current bid, or secure
              the lot immediately at the buyout price.
            </p>
          </div>
          <button
            onClick={() => refreshAuctions(true)}
            disabled={isRefreshing}
            className="interactive-lift w-fit rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-bold shadow-sm disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing..." : "Refresh market"}
          </button>
        </div>

        {notice ? (
          <div className="mt-5 rounded-md border border-[#c99a2e]/30 bg-[#fff7df] px-4 py-3 text-sm font-semibold text-[#6f5418]">
            {notice}
          </div>
        ) : null}

        <div className="premium-surface mt-6 rounded-xl border border-black/10 p-4 backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a20]">
                Market view
              </p>
              <h2 className="display-serif mt-1 text-4xl font-semibold leading-none">
                Find the right lot before the board turns over.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(18rem,1.4fr)_1fr_1fr_1fr] xl:min-w-[56rem]">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-[#5f6f80]">
                  Search
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, seller, category..."
                  className="h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-[#c99a2e] focus:ring-2 focus:ring-[#c99a2e]/20"
                />
              </label>

              <FilterSelect
                label="Category"
                value={category}
                onChange={setCategory}
                options={[
                  { value: "all", label: "All categories" },
                  ...categories.map((category) => ({
                    value: category,
                    label: titleCase(category)
                  }))
                ]}
              />

              <FilterSelect
                label="Buyout"
                value={priceBand}
                onChange={setPriceBand}
                options={priceBands.map((band) => ({ value: band.value, label: band.label }))}
              />

              <FilterSelect
                label="Sort"
                value={sortMode}
                onChange={setSortMode}
                options={[
                  { value: "closing-soon", label: "Closing soon" },
                  { value: "highest-buyout", label: "Highest buyout" },
                  { value: "lowest-buyout", label: "Lowest buyout" },
                  { value: "most-watched", label: "Most watched" }
                ]}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-black/10 pt-4 text-sm text-[#5f6f80] md:flex-row md:items-center md:justify-between">
            <p>
              Showing{" "}
              <span className="font-bold text-[#151515]">
                {filteredAuctions.length}
              </span>{" "}
              matching lots
            </p>
            <button
              onClick={() => {
                setQuery("");
                setCategory("all");
                setPriceBand("all");
                setSortMode("closing-soon");
              }}
              className="interactive-lift w-fit rounded-full border border-black/15 px-3 py-2 text-sm font-bold text-[#151515] transition hover:bg-black/[0.04]"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {filteredAuctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              isSignedIn={Boolean(user)}
              onBid={handleBid}
              onBuyout={handleBuyout}
            />
          ))}
        </div>

        {filteredAuctions.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-black/20 bg-white/70 px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">No matching lots</h2>
            <p className="mx-auto mt-2 max-w-xl text-[#5f6f80]">
              The live board is limited. Widen the filters or refresh the market to catch the
              next rotation.
            </p>
          </div>
        ) : null}
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
    <article className="premium-surface interactive-lift overflow-hidden rounded-xl ring-1 ring-black/10 [contain-intrinsic-size:720px] [content-visibility:auto]">
      <div className="relative aspect-[16/9] overflow-hidden bg-black">
        <img
          src={auctionImage(auction)}
          alt={`${auction.item.title} auction lot`}
          loading="lazy"
          decoding="async"
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
            Sign in to bid.
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

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-[#5f6f80]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#c99a2e] focus:ring-2 focus:ring-[#c99a2e]/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}
