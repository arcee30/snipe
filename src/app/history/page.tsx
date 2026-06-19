"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import {
  auctionImage,
  formatCoins
} from "@/lib/auction-ui";
import type { Auction, LedgerEntry } from "@/lib/auction-ui";

type HistoryAuction = Auction & {
  outcome: "WON" | "LOST" | "SOLD" | "EXPIRED";
  userBid: number | null;
  finalPrice: number;
  updatedAt: string;
};

export default function HistoryPage() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [auctions, setAuctions] = useState<HistoryAuction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshHistory() {
    const response = await fetch("/api/history");
    const data = await response.json();
    setLedger(data.ledger ?? []);
    setAuctions(data.auctions ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    refreshHistory().catch(() => setIsLoading(false));
  }, []);

  return (
    <PageFrame>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="border-b border-black/10 pb-6">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Auction history
          </h1>
          <p className="mt-3 max-w-2xl text-[#5f6f80]">
            Review what you won, lost, sold, and where your credits moved.
          </p>
        </div>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Past auctions</h2>
            <button
              onClick={refreshHistory}
              className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-bold"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {isLoading ? (
              <p className="rounded-lg bg-white p-5 text-[#5f6f80] shadow-sm ring-1 ring-black/10">
                Loading history...
              </p>
            ) : auctions.length > 0 ? (
              auctions.map((auction) => (
                <article
                  key={auction.id}
                  className="grid overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/10 sm:grid-cols-[180px_1fr]"
                >
                  <div className="aspect-[16/10] bg-black sm:aspect-auto">
                    <img
                      src={auctionImage(auction)}
                      alt={`${auction.item.title} history lot`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a20]">
                          {auction.item.category}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold">
                          {auction.item.title}
                        </h3>
                      </div>
                      <OutcomeBadge outcome={auction.outcome} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5f6f80]">
                      {auction.item.description}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <HistoryMetric
                        label="Final price"
                        value={formatCoins(auction.finalPrice)}
                      />
                      <HistoryMetric
                        label="Your bid"
                        value={
                          auction.userBid
                            ? formatCoins(auction.userBid)
                            : auction.outcome === "WON"
                              ? formatCoins(auction.finalPrice)
                              : "-"
                        }
                      />
                    </div>
                    <p className="mt-3 text-xs text-[#5f6f80]">
                      Seller: {auction.seller.username}
                      {auction.highestBidder
                        ? ` | Winner: ${auction.highestBidder.username}`
                        : ""}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg bg-white p-5 text-[#5f6f80] shadow-sm ring-1 ring-black/10">
                No completed auctions yet. Bid on a live lot or buy one out to
                start building history.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/10 md:p-6">
          <h2 className="text-2xl font-semibold">Transactions</h2>
          <div className="mt-4 grid gap-2">
            {ledger.length > 0 ? (
              ledger.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-md bg-black/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{entry.type}</p>
                    <p className="text-sm text-[#5f6f80]">
                      {entry.auction?.item
                        ? `${entry.description} | ${entry.auction.item.title}`
                        : entry.description}
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
                No transactions yet.
              </p>
            )}
          </div>
        </section>
      </section>
    </PageFrame>
  );
}

function OutcomeBadge({ outcome }: { outcome: HistoryAuction["outcome"] }) {
  const styles = {
    WON: "bg-[#e9f7e9] text-[#2f7d32]",
    LOST: "bg-[#fff0f0] text-[#a33131]",
    SOLD: "bg-[#fff7df] text-[#8a6a20]",
    EXPIRED: "bg-black/5 text-[#5f6f80]"
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[outcome]}`}>
      {outcome}
    </span>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/[0.04] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5f6f80]">
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
