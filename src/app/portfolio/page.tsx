"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { formatCoins } from "@/lib/auction-ui";
import type { PortfolioAsset, PortfolioLeader } from "@/lib/auction-ui";

type CategoryBreakdown = {
  category: string;
  count: number;
  worth: number;
};

type PortfolioResponse = {
  assets: PortfolioAsset[];
  totalWorth: number;
  assetCount: number;
  totalSpent: number;
  unrealizedGain: number;
  bestAsset: PortfolioAsset | null;
  categoryBreakdown: CategoryBreakdown[];
  leaderboard: PortfolioLeader[];
  currentUserRank: number | null;
};

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshPortfolio() {
    const response = await fetch("/api/portfolio");
    const data = await response.json();
    setPortfolio(data);
    setIsLoading(false);
  }

  useEffect(() => {
    refreshPortfolio().catch(() => setIsLoading(false));
  }, []);

  const assets = portfolio?.assets ?? [];
  const topCategory = portfolio?.categoryBreakdown[0];

  return (
    <PageFrame>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="ink-surface relative overflow-hidden rounded-xl p-6 text-white md:p-8">
            <img
              src={portfolio?.bestAsset?.imageUrl ?? "/auction-assets/generated/skyscraper-penthouse.png"}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-[0.26]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/72 to-black/35" />
            <div className="relative z-10">
              <h1 className="display-serif text-5xl font-semibold leading-none md:text-7xl">
                Portfolio
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-white/68">
                Acquired lots are tracked here as portfolio assets. Follow
                estimated value, category exposure, and your position against
                the top collectors.
              </p>

              <div className="mt-8">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#f2c85b]">
                  Estimated portfolio worth
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight md:text-7xl">
                  {isLoading ? "..." : formatCoins(portfolio?.totalWorth ?? 0)}
                </p>
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-3">
                <HeroMetric label="Assets owned" value={String(portfolio?.assetCount ?? 0)} />
                <HeroMetric
                  label="Unrealized gain"
                  value={formatCoins(portfolio?.unrealizedGain ?? 0)}
                />
                <HeroMetric
                  label="Leaderboard rank"
                  value={
                    portfolio?.currentUserRank ? `#${portfolio.currentUserRank}` : "-"
                  }
                />
              </div>
            </div>
          </div>

          <div className="premium-surface rounded-xl p-6 ring-1 ring-black/10 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="display-serif text-4xl font-semibold leading-none">Top collectors</h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6f80]">
                  The board ranks the largest portfolios by estimated value. If
                  your collection clears the threshold, your name moves in.
                </p>
              </div>
              <button
                onClick={refreshPortfolio}
                className="interactive-lift rounded-full border border-black/15 px-4 py-2 text-sm font-bold"
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {(portfolio?.leaderboard ?? []).map((leader, index) => (
                <div
                  key={`${leader.username}-${index}`}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-3 py-3 ${
                    leader.isCurrentUser
                      ? "bg-[#fff2c5] ring-1 ring-[#d0a02e]/45"
                      : "bg-black/[0.035]"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#151515] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {leader.displayName ?? leader.username}
                    </p>
                    <p className="text-xs font-semibold text-[#5f6f80]">
                      {leader.assetCount} assets
                    </p>
                  </div>
                  <p className="font-semibold">{formatCompactCoins(leader.totalWorth)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Acquisition cost"
            value={formatCoins(portfolio?.totalSpent ?? 0)}
            text="Total paid across settled acquisitions."
          />
          <SummaryCard
            label="Strongest category"
            value={topCategory ? topCategory.category : "-"}
            text={
              topCategory
                ? `${formatCoins(topCategory.worth)} estimated value across ${topCategory.count} lots.`
                : "Acquire assets to build category exposure."
            }
          />
          <SummaryCard
            label="Crown asset"
            value={portfolio?.bestAsset?.title ?? "-"}
            text={
              portfolio?.bestAsset
                ? `${formatCoins(portfolio.bestAsset.estimatedValue)} estimated value.`
                : "Your highest-value acquisition will appear here."
            }
          />
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="display-serif text-5xl font-semibold leading-none">
                  Owned assets
                </h2>
                <p className="mt-2 text-[#5f6f80]">
                  Settled wins and buyouts are displayed as your collection.
                </p>
              </div>
              <a
                href="/auctions"
                className="interactive-lift inline-flex w-fit rounded-full bg-[#151515] px-5 py-3 text-sm font-bold text-white"
              >
                Find more lots
              </a>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {isLoading ? (
                <p className="rounded-lg bg-white p-5 text-[#5f6f80] shadow-sm ring-1 ring-black/10">
                  Loading portfolio...
                </p>
              ) : assets.length > 0 ? (
                assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)
              ) : (
                <div className="premium-surface rounded-xl p-8 ring-1 ring-black/10">
                  <h3 className="text-2xl font-semibold">No assets owned yet</h3>
                  <p className="mt-3 max-w-xl leading-7 text-[#5f6f80]">
                    Secure a lot outright or hold the leading bid until close.
                    Once it settles, it moves here and begins counting toward
                    portfolio value.
                  </p>
                  <a
                    href="/auctions"
                    className="interactive-lift mt-6 inline-flex rounded-full bg-[#d0a02e] px-5 py-3 text-sm font-bold text-[#151515]"
                  >
                    Browse live auctions
                  </a>
                </div>
              )}
            </div>
          </div>

          <aside className="premium-surface rounded-xl p-6 ring-1 ring-black/10">
            <h2 className="display-serif text-4xl font-semibold leading-none">Allocation</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f6f80]">
              A fast read on where your collection is concentrated.
            </p>
            <div className="mt-5 grid gap-4">
              {(portfolio?.categoryBreakdown ?? []).length > 0 ? (
                portfolio?.categoryBreakdown.map((category) => {
                  const share =
                    portfolio.totalWorth > 0
                      ? Math.round((category.worth / portfolio.totalWorth) * 100)
                      : 0;

                  return (
                    <div key={category.category}>
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span className="capitalize">{category.category}</span>
                        <span>{share}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
                        <div
                          className="h-full rounded-full bg-[#d0a02e]"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#5f6f80]">
                        {category.count} lots | {formatCoins(category.worth)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-md bg-black/[0.035] px-4 py-3 text-sm text-[#5f6f80]">
                  Allocation appears after your first settled win.
                </p>
              )}
            </div>
          </aside>
        </section>
      </section>
    </PageFrame>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  text
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="premium-surface interactive-lift rounded-xl p-5 ring-1 ring-black/10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a20]">
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#5f6f80]">{text}</p>
    </div>
  );
}

function formatCompactCoins(value: number) {
  if (value >= 1_000_000_000) {
    return `${trimCompact(value / 1_000_000_000)}B`;
  }

  if (value >= 1_000_000) {
    return `${trimCompact(value / 1_000_000)}M`;
  }

  if (value >= 1_000) {
    return `${trimCompact(value / 1_000)}K`;
  }

  return String(value);
}

function trimCompact(value: number) {
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

function AssetCard({ asset }: { asset: PortfolioAsset }) {
  return (
    <article className="premium-surface interactive-lift overflow-hidden rounded-xl ring-1 ring-black/10">
      <div className="relative aspect-[16/10] overflow-hidden bg-black">
        <img
          src={asset.imageUrl ?? "/auction-assets/asset.png"}
          alt={`${asset.title} portfolio asset`}
          className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 to-transparent p-4 text-white">
          <span className="rounded bg-white/90 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6a20]">
            {asset.category}
          </span>
          <span className="rounded bg-black/55 px-3 py-2 text-sm font-bold">
            +{formatCoins(asset.appreciation)}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-2xl font-semibold tracking-tight">{asset.title}</h3>
        <p className="mt-2 line-clamp-2 leading-7 text-[#5f6f80]">
          {asset.description}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <AssetMetric label="Acquired" value={formatCoins(asset.acquiredFor)} />
          <AssetMetric label="Est. value" value={formatCoins(asset.estimatedValue)} />
        </div>
        <p className="mt-4 text-sm text-[#5f6f80]">
          Seller: <span className="font-semibold">{asset.seller.username}</span>
        </p>
      </div>
    </article>
  );
}

function AssetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/[0.04] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5f6f80]">
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
