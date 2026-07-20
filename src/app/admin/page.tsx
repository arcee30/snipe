"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { formatCoins } from "@/lib/auction-ui";

type AdminUser = {
  id: string;
  username: string;
  email?: string | null;
  displayName?: string | null;
};

type DashboardUser = AdminUser & {
  authProvider: string;
  isBot: boolean;
  isAdmin: boolean;
  createdAt: string;
  walletBalance: number;
  counts: {
    sellingAuctions: number;
    winningAuctions: number;
    bids: number;
    ledgerEntries: number;
  };
};

type DashboardAuction = {
  id: string;
  status: string;
  startingPrice: number;
  currentPrice: number;
  buyoutPrice: number;
  endsAt: string;
  updatedAt: string;
  item: {
    id: string;
    title: string;
    category: string;
    description: string;
    imageUrl?: string | null;
  };
  seller: AdminUser;
  highestBidder: AdminUser | null;
  bidCount: number;
  flagCount: number;
};

type DashboardFlag = {
  id: string;
  isSystem: boolean;
  kind: string;
  status: string;
  severity: string;
  reason: string;
  notes?: string | null;
  createdAt: string;
  auction?: {
    id: string;
    status: string;
    item: {
      title: string;
      category: string;
    };
  } | null;
  item?: {
    title: string;
    category: string;
  } | null;
  user?: AdminUser | null;
  createdBy?: AdminUser | null;
};

type Dashboard = {
  admin: AdminUser;
  dashboard: {
    stats: {
      userCount: number;
      activeAuctionCount: number;
      openFlagCount: number;
      totalWalletBalance: number;
      bidCount: number;
    };
    users: DashboardUser[];
    auctions: DashboardAuction[];
    flags: DashboardFlag[];
  };
};

export default function AdminPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [walletAmount, setWalletAmount] = useState("1000000");
  const [walletReason, setWalletReason] = useState("Moderation adjustment");
  const [auctionReason, setAuctionReason] = useState("Moderation review");
  const [isBusy, setIsBusy] = useState(false);

  async function refreshDashboard() {
    setError("");

    try {
      const response = await fetch("/api/admin/dashboard");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load admin dashboard");
      }

      setData(payload);
      setSelectedUserId((current) => current || payload.dashboard.users[0]?.id || "");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load admin dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshDashboard();
  }, []);

  const activeAuctions = useMemo(
    () => data?.dashboard.auctions.filter((auction) => auction.status === "ACTIVE") ?? [],
    [data]
  );
  const visibleFlags = data?.dashboard.flags.slice(0, 16) ?? [];
  const openFlags = data?.dashboard.flags.filter((flag) => flag.status === "OPEN").length ?? 0;

  async function postAction(url: string, body: Record<string, unknown>) {
    setIsBusy(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Admin action failed");
      }

      setNotice("Admin action completed.");
      await refreshDashboard();
      window.dispatchEvent(new Event("snipe-session-change"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Admin action failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitWalletAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUserId) {
      setError("Select a user first.");
      return;
    }

    await postAction(`/api/admin/users/${selectedUserId}/wallet`, {
      amount: Number(walletAmount),
      reason: walletReason
    });
  }

  async function updateAdminRole(userId: string, isAdmin: boolean) {
    await postAction(`/api/admin/users/${userId}/admin`, { isAdmin });
  }

  if (isLoading) {
    return (
      <PageFrame>
        <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
          <div className="premium-surface rounded-xl p-8 ring-1 ring-black/10">
            Loading admin desk...
          </div>
        </section>
      </PageFrame>
    );
  }

  if (!data) {
    return (
      <PageFrame>
        <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
          <div className="premium-surface rounded-xl p-8 ring-1 ring-black/10">
            <h1 className="display-serif text-5xl font-semibold leading-none">
              Admin access required
            </h1>
            <p className="mt-3 text-[#5f6f80]">{error || "This page is restricted."}</p>
          </div>
        </section>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a20]">
              Signed in as {data.admin.displayName ?? data.admin.username}
            </p>
            <h1 className="display-serif mt-2 text-5xl font-semibold leading-none md:text-7xl">
              Admin desk
            </h1>
            <p className="mt-3 max-w-2xl text-[#5f6f80]">
              Review users, moderate active listings, adjust balances, and clear
              flagged activity before it reaches the market.
            </p>
          </div>
          <button
            onClick={refreshDashboard}
            disabled={isBusy}
            className="interactive-lift w-fit rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-bold shadow-sm disabled:opacity-50"
          >
            Refresh desk
          </button>
        </div>

        {notice ? (
          <p className="mt-5 rounded-md bg-[#fff7df] px-3 py-2 text-sm font-semibold text-[#6f5418]">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-md bg-[#fff0f0] px-3 py-2 text-sm font-semibold text-[#a33131]">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <AdminMetric label="Real users" value={formatCoins(data.dashboard.stats.userCount)} />
          <AdminMetric
            label="Active auctions"
            value={formatCoins(data.dashboard.stats.activeAuctionCount)}
          />
          <AdminMetric label="Open flags" value={formatCoins(openFlags)} />
          <AdminMetric
            label="Wallet supply"
            value={compactCoins(data.dashboard.stats.totalWalletBalance)}
          />
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="premium-surface rounded-xl p-5 ring-1 ring-black/10 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="display-serif text-4xl font-semibold leading-none">
                  Users
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6f80]">
                  View accounts, balances, bidding activity, and listing counts.
                </p>
              </div>
            </div>

            <div className="mt-5 grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
              {data.dashboard.users.map((user) => {
                const isCurrentAdmin = user.id === data.admin.id;

                return (
                <div
                  key={user.id}
                  className="grid gap-3 rounded-lg bg-black/[0.035] px-4 py-3 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">
                        {user.displayName ?? user.username}
                      </p>
                      {user.isAdmin ? <Badge tone="gold">Admin</Badge> : null}
                      {user.isBot ? <Badge>Bot</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#5f6f80]">
                      @{user.username} | {user.email ?? user.authProvider}
                    </p>
                    <p className="mt-2 text-xs text-[#5f6f80]">
                      {user.counts.sellingAuctions} listings | {user.counts.bids} bids |{" "}
                      {user.counts.ledgerEntries} ledger entries
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <p className="mr-2 font-semibold">
                      {formatCoins(user.walletBalance)}
                    </p>
                    {!user.isBot ? (
                      <button
                        onClick={() => updateAdminRole(user.id, !user.isAdmin)}
                        disabled={isBusy || (isCurrentAdmin && user.isAdmin)}
                        className="interactive-lift rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {user.isAdmin ? "Revoke admin" : "Make admin"}
                      </button>
                    ) : null}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          <div className="premium-surface rounded-xl p-5 ring-1 ring-black/10 md:p-6">
            <h2 className="display-serif text-4xl font-semibold leading-none">
              Wallet adjustment
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5f6f80]">
              Add or remove credits with a ledger record and moderation note.
            </p>
            <form onSubmit={submitWalletAdjustment} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-bold">
                User
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="rounded-md border border-black/15 bg-white px-3 py-3 outline-none focus:border-[#c99a2e]"
                >
                  {data.dashboard.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName ?? user.username} ({formatCoins(user.walletBalance)})
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Credit delta
                  <input
                    value={walletAmount}
                    onChange={(event) => setWalletAmount(event.target.value)}
                    inputMode="numeric"
                    className="rounded-md border border-black/15 bg-white px-3 py-3 outline-none focus:border-[#c99a2e]"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Reason
                  <input
                    value={walletReason}
                    onChange={(event) => setWalletReason(event.target.value)}
                    className="rounded-md border border-black/15 bg-white px-3 py-3 outline-none focus:border-[#c99a2e]"
                  />
                </label>
              </div>
              <button
                disabled={isBusy}
                className="interactive-lift rounded-full bg-[#151515] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Apply wallet adjustment
              </button>
            </form>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="premium-surface rounded-xl p-5 ring-1 ring-black/10 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="display-serif text-4xl font-semibold leading-none">
                  Auctions
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6f80]">
                  Close clean auctions, cancel problematic ones, or remove bad listings.
                </p>
              </div>
              <input
                value={auctionReason}
                onChange={(event) => setAuctionReason(event.target.value)}
                className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
                placeholder="Moderation reason"
              />
            </div>

            <div className="mt-5 grid gap-3">
              {activeAuctions.slice(0, 30).map((auction) => (
                <article
                  key={auction.id}
                  className="grid gap-4 rounded-xl bg-black/[0.035] p-3 md:grid-cols-[8rem_1fr]"
                >
                  <div className="aspect-[16/10] overflow-hidden rounded-lg bg-black">
                    <img
                      src={auction.item.imageUrl ?? "/auction-assets/asset.png"}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a20]">
                          {auction.item.category}
                        </p>
                        <h3 className="truncate text-xl font-semibold">
                          {auction.item.title}
                        </h3>
                        <p className="mt-1 text-xs text-[#5f6f80]">
                          Seller: {auction.seller.username} | Bids: {auction.bidCount} |
                          Current: {formatCoins(auction.currentPrice)} | Buyout:{" "}
                          {formatCoins(auction.buyoutPrice)}
                        </p>
                      </div>
                      <Badge tone={auction.flagCount > 0 ? "red" : "neutral"}>
                        {auction.flagCount} flags
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          postAction(`/api/admin/auctions/${auction.id}/close`, {
                            reason: auctionReason
                          })
                        }
                        className="rounded-full border border-black/15 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        Close now
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          postAction(`/api/admin/auctions/${auction.id}/cancel`, {
                            reason: auctionReason,
                            removeListing: false
                          })
                        }
                        className="rounded-full border border-black/15 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        Cancel auction
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          postAction(`/api/admin/auctions/${auction.id}/cancel`, {
                            reason: auctionReason,
                            removeListing: true
                          })
                        }
                        className="rounded-full bg-[#a33131] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Remove listing
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="premium-surface rounded-xl p-5 ring-1 ring-black/10 md:p-6">
            <h2 className="display-serif text-4xl font-semibold leading-none">
              Flagged activity
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5f6f80]">
              System signals and moderation records that need review.
            </p>
            <div className="mt-5 grid gap-3">
              {visibleFlags.length > 0 ? (
                visibleFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="rounded-xl border border-black/10 bg-white/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={flag.severity === "HIGH" ? "red" : "gold"}>
                            {flag.severity}
                          </Badge>
                          <Badge>{flag.kind.replaceAll("_", " ")}</Badge>
                          {flag.isSystem ? <Badge>System</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold">{flag.reason}</p>
                        <p className="mt-1 text-xs text-[#5f6f80]">
                          {flag.user ? `User: ${flag.user.username}` : "Market signal"}
                          {flag.auction ? ` | Lot: ${flag.auction.item.title}` : ""}
                        </p>
                      </div>
                      <Badge tone={flag.status === "OPEN" ? "red" : "neutral"}>
                        {flag.status}
                      </Badge>
                    </div>
                    {!flag.isSystem && flag.status === "OPEN" ? (
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          postAction(`/api/admin/flags/${flag.id}/resolve`, {
                            notes: "Reviewed from admin desk"
                          })
                        }
                        className="mt-3 rounded-full border border-black/15 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        Mark reviewed
                      </button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-black/[0.035] px-4 py-3 text-sm text-[#5f6f80]">
                  No flagged activity right now.
                </p>
              )}
            </div>
          </div>
        </section>
      </section>
    </PageFrame>
  );
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="premium-surface rounded-xl p-5 ring-1 ring-black/10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a20]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Badge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "red";
}) {
  const styles = {
    neutral: "bg-black/5 text-[#5f6f80]",
    gold: "bg-[#fff2c5] text-[#8a6a20]",
    red: "bg-[#fff0f0] text-[#a33131]"
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${styles[tone]}`}>
      {children}
    </span>
  );
}

function compactCoins(value: number) {
  if (value >= 1_000_000_000) {
    return `${trimCompact(value / 1_000_000_000)}B`;
  }

  if (value >= 1_000_000) {
    return `${trimCompact(value / 1_000_000)}M`;
  }

  return formatCoins(value);
}

function trimCompact(value: number) {
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}
