"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  username: string;
};

type Wallet = {
  balance: number;
};

type LedgerEntry = {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
};

type Auction = {
  id: string;
  startingPrice: number;
  currentPrice: number;
  buyoutPrice: number;
  highestBidderId: string | null;
  status: string;
  endsAt: string;
  item: {
    title: string;
    category: string;
    description: string;
  };
  seller: User;
  highestBidder: User | null;
};

const categories = ["car", "house", "boat", "asset"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [notice, setNotice] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [listing, setListing] = useState({
    title: "",
    category: "car",
    description: "",
    startingPrice: "100000",
    buyoutPrice: "250000"
  });

  const selectedAuction = useMemo(
    () => auctions.find((auction) => auction.id === selectedId) ?? auctions[0],
    [auctions, selectedId]
  );

  async function refresh() {
    const [meResponse, auctionsResponse] = await Promise.all([
      fetch("/api/me"),
      fetch("/api/auctions")
    ]);
    const meData = await meResponse.json();
    const auctionData = await auctionsResponse.json();

    setUser(meData.user);
    setWallet(meData.wallet);
    setLedger(meData.ledger ?? []);
    setAuctions(auctionData.auctions ?? []);
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => window.clearInterval(timer);
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
        throw new Error(data.error ?? "Unable to enter auction house");
      }

      setUser(data.user);
      setWallet(data.wallet);
      setUsername("");
      setNotice(`Welcome, ${data.user.username}.`);
      await refresh();
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
      const response = await fetch("/api/session", {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to sign out");
      }

      setUser(null);
      setWallet(null);
      setLedger([]);
      setNotice("Signed out.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...listing,
          startingPrice: Number(listing.startingPrice),
          buyoutPrice: Number(listing.buyoutPrice)
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create listing");
      }

      setListing({
        title: "",
        category: "car",
        description: "",
        startingPrice: "100000",
        buyoutPrice: "250000"
      });
      setSelectedId(data.auction.id);
      setNotice("Listing created for a one-hour auction.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

  async function placeSelectedBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAuction) {
      return;
    }

    setIsBusy(true);
    setNotice("");

    try {
      const response = await fetch(`/api/auctions/${selectedAuction.id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(bidAmount) })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to place bid");
      }

      setBidAmount("");
      setNotice("Bid placed.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

  async function buyoutSelectedAuction() {
    if (!selectedAuction) {
      return;
    }

    setIsBusy(true);
    setNotice("");

    try {
      const response = await fetch(`/api/auctions/${selectedAuction.id}/buyout`, {
        method: "POST"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to buy out auction");
      }

      setNotice("Auction bought out.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 text-[#151515] md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Auction House
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6f80] md:text-base">
              Bid on seeded luxury assets, create one-hour listings, and manage a
              fake 1,000,000 coin wallet.
            </p>
          </div>

          <section className="min-w-72 rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm">
            {user && wallet ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5f6f80]">
                  Signed in as {user.username}
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {formatCoins(wallet.balance)}
                  <span className="ml-2 text-base text-[#8a6a20]">coins</span>
                </p>
                <button
                  onClick={signOut}
                  disabled={isBusy}
                  className="mt-3 rounded-md border border-black/15 px-3 py-2 text-sm font-semibold text-[#151515] disabled:opacity-50"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <form onSubmit={submitUsername} className="flex gap-2">
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="username"
                  className="min-w-0 flex-1 rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
                />
                <button
                  disabled={isBusy}
                  className="rounded-md bg-[#151515] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Enter
                </button>
              </form>
            )}
          </section>
        </header>

        {notice ? (
          <div className="rounded-md border border-[#c99a2e]/30 bg-[#fff7df] px-4 py-3 text-sm text-[#6f5418]">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
          <section className="rounded-lg border border-black/10 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Live Auctions</h2>
                <p className="text-sm text-[#5f6f80]">
                  Seeded bot listings refresh every few seconds.
                </p>
              </div>
              <button
                onClick={refresh}
                className="rounded-md border border-black/15 px-3 py-2 text-sm font-semibold"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {auctions.map((auction) => (
                <button
                  key={auction.id}
                  onClick={() => setSelectedId(auction.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    selectedAuction?.id === auction.id
                      ? "border-[#c99a2e] bg-[#fff9e8]"
                      : "border-black/10 bg-white hover:border-black/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a20]">
                        {auction.item.category}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        {auction.item.title}
                      </h3>
                    </div>
                    <span className="rounded bg-black/5 px-2 py-1 text-xs font-semibold">
                      {timeLeft(auction.endsAt)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-[#5f6f80]">
                    {auction.item.description}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Metric label="Current" value={formatCoins(auction.currentPrice)} />
                    <Metric label="Buyout" value={formatCoins(auction.buyoutPrice)} />
                  </div>
                  <p className="mt-3 text-xs text-[#5f6f80]">
                    Seller: {auction.seller.username}
                    {auction.highestBidder
                      ? ` | Leader: ${auction.highestBidder.username}`
                      : ""}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-5">
            <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Auction Detail</h2>
              {selectedAuction ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a20]">
                    {selectedAuction.item.category}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold">
                    {selectedAuction.item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5f6f80]">
                    {selectedAuction.item.description}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Metric
                      label="Current bid"
                      value={formatCoins(selectedAuction.currentPrice)}
                    />
                    <Metric
                      label="Buyout"
                      value={formatCoins(selectedAuction.buyoutPrice)}
                    />
                    <Metric
                      label="Ends in"
                      value={timeLeft(selectedAuction.endsAt)}
                    />
                    <Metric
                      label="Leader"
                      value={selectedAuction.highestBidder?.username ?? "No bids"}
                    />
                  </div>

                  <form onSubmit={placeSelectedBid} className="mt-4 flex gap-2">
                    <input
                      value={bidAmount}
                      onChange={(event) => setBidAmount(event.target.value)}
                      placeholder={`${selectedAuction.currentPrice + 1}`}
                      inputMode="numeric"
                      className="min-w-0 flex-1 rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
                    />
                    <button
                      disabled={!user || isBusy}
                      className="rounded-md bg-[#151515] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Bid
                    </button>
                  </form>
                  <button
                    onClick={buyoutSelectedAuction}
                    disabled={!user || isBusy}
                    className="mt-3 w-full rounded-md bg-[#c99a2e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Buyout for {formatCoins(selectedAuction.buyoutPrice)} coins
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#5f6f80]">
                  No active auctions. Seed the database or create a listing.
                </p>
              )}
            </section>

            <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Create Listing</h2>
              <form onSubmit={submitListing} className="mt-4 grid gap-3">
                <input
                  value={listing.title}
                  onChange={(event) =>
                    setListing({ ...listing, title: event.target.value })
                  }
                  placeholder="Asset title"
                  className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
                />
                <select
                  value={listing.category}
                  onChange={(event) =>
                    setListing({ ...listing, category: event.target.value })
                  }
                  className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <textarea
                  value={listing.description}
                  onChange={(event) =>
                    setListing({ ...listing, description: event.target.value })
                  }
                  placeholder="Short description"
                  rows={3}
                  className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={listing.startingPrice}
                    onChange={(event) =>
                      setListing({ ...listing, startingPrice: event.target.value })
                    }
                    inputMode="numeric"
                    className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
                  />
                  <input
                    value={listing.buyoutPrice}
                    onChange={(event) =>
                      setListing({ ...listing, buyoutPrice: event.target.value })
                    }
                    inputMode="numeric"
                    className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#c99a2e]"
                  />
                </div>
                <button
                  disabled={!user || isBusy}
                  className="rounded-md bg-[#151515] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Start 1-hour auction
                </button>
              </form>
            </section>

            <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Transaction History</h2>
              <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                {ledger.length > 0 ? (
                  ledger.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-3 rounded-md bg-black/[0.03] px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-semibold">{entry.type}</p>
                        <p className="text-xs text-[#5f6f80]">{entry.description}</p>
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
                  <p className="text-sm text-[#5f6f80]">
                    Enter a username to see wallet activity.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/[0.04] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6f80]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatCoins(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();

  if (diff <= 0) {
    return "closing";
  }

  const minutes = Math.floor(diff / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
