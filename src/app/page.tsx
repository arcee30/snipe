"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <main className="min-h-screen px-5 py-6 text-[#151515] md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <nav className="flex flex-col gap-3 border-b border-black/10 pb-4 md:flex-row md:items-center md:justify-between">
          <a href="/" className="flex items-center gap-3">
            <LogoMark />
            <span className="text-2xl font-semibold tracking-tight">Snipe</span>
          </a>
          <div className="flex gap-2 overflow-x-auto text-sm font-semibold text-[#5f6f80]">
            <a className="rounded-md px-3 py-2 hover:bg-black/5 hover:text-[#151515]" href="/auctions">
              Auctions
            </a>
            <a className="rounded-md px-3 py-2 hover:bg-black/5 hover:text-[#151515]" href="/auctions#sell">
              Sell
            </a>
            <a className="rounded-md px-3 py-2 hover:bg-black/5 hover:text-[#151515]" href="/auctions#wallet">
              Wallet
            </a>
            <a className="rounded-md px-3 py-2 hover:bg-black/5 hover:text-[#151515]" href="#contact">
              Contact
            </a>
          </div>
        </nav>

        <section className="grid gap-8 py-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
              Win rare luxury lots before they disappear.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5f6f80]">
              Snipe is a fake-money auction house for limited-time cars, yachts,
              homes, and high-value assets. New lots rotate in as old ones close.
            </p>
            <a
              href="/auctions"
              className="mt-7 inline-flex rounded-md bg-[#151515] px-5 py-3 text-sm font-semibold text-white"
            >
              {user ? "Go to auctions" : "Sign up and start bidding"}
            </a>
          </div>

          <div className="rounded-lg border border-black/10 bg-white/75 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a20]">
              About Snipe
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Timing is the game.</h2>
            <p className="mt-4 leading-7 text-[#5f6f80]">
              Auctions run for a limited window. If a lot closes, it leaves the
              board and the market rotates. Bid, buy out, or wait for the next
              drop.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white/70 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Built for auction-house flow</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Feature title="Limited lots" body="A small active market keeps each listing meaningful." />
            <Feature title="Fast decisions" body="Countdowns, buyouts, and bids keep the action moving." />
            <Feature title="Fake economy" body="Start with coins, test strategies, and learn the market." />
          </div>
        </section>

        <footer id="contact" className="border-t border-black/10 py-6 text-sm text-[#5f6f80]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>Contact: hello@snipe-auctions.test</p>
            <p>Support: support@snipe-auctions.test</p>
            <p>© 2026 Snipe</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md bg-black/[0.03] p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#5f6f80]">{body}</p>
    </div>
  );
}

function LogoMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-10 w-10 shrink-0" fill="none">
      <rect width="64" height="64" rx="16" fill="#151515" />
      <circle cx="32" cy="32" r="21" stroke="#c99a2e" strokeWidth="4" />
      <path d="M32 8v8M32 48v8M8 32h8M48 32h8" stroke="#f7f4ee" strokeLinecap="round" strokeWidth="3" />
      <path d="M20 39c5 6 18 5 22-3 4-9-8-11-14-8-5 2-6 8 0 10 6 3 15 0 18-7" stroke="#f7f4ee" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <path d="M25 38 44 19l3 3-19 19-8 3 5-6Z" fill="#c99a2e" />
      <circle cx="31" cy="32" r="3" fill="#151515" />
    </svg>
  );
}
