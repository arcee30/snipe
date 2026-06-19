"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
};

const marketItems = [
  {
    title: "Sunset marina yachts",
    image: "/auction-assets/boat.png",
    text: "Buyouts move fast when a rare water lot drops."
  },
  {
    title: "Private coastal homes",
    image: "/auction-assets/house.png",
    text: "One-hour windows keep every property decision sharp."
  },
  {
    title: "Collector cars",
    image: "/auction-assets/car.png",
    text: "Watch the market, time the bid, take the keys."
  }
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0f1110] text-white">
      <section className="relative min-h-[88vh] overflow-hidden">
        <img
          src="/auction-assets/boat.png"
          alt="Luxury yacht at sunset"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0f1110] to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col px-5 py-6 md:px-8">
          <nav className="flex flex-col gap-4 border-b border-white/15 pb-4 md:flex-row md:items-center md:justify-between">
            <a href="/" className="flex items-center gap-3">
              <LogoMark />
              <span className="text-2xl font-semibold tracking-tight">Snipe</span>
            </a>
            <div className="flex gap-2 overflow-x-auto text-sm font-semibold text-white/75">
              <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="/auctions">
                Auctions
              </a>
              <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="/auctions#sell">
                Sell
              </a>
              <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="/auctions#wallet">
                Wallet
              </a>
              <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="#contact">
                Contact
              </a>
            </div>
          </nav>

          <div className="flex flex-1 items-center py-14">
            <div className="max-w-3xl">
              <h1 className="max-w-full text-[2.8rem] font-semibold leading-[0.95] tracking-tight sm:text-5xl md:text-7xl">
                Luxury auctions that vanish if you hesitate.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78 md:text-xl">
                Snipe is a fake-money auction house where rare cars, yachts,
                homes, and trophy assets rotate through limited drops. Bid live,
                buy out instantly, or watch the lot disappear.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/auctions"
                  className="inline-flex items-center justify-center rounded-md bg-[#d0a02e] px-6 py-3 text-sm font-bold text-[#151515] shadow-lg shadow-black/20 transition hover:bg-[#e4b645]"
                >
                  {user ? "Go to auctions" : "Sign up and start bidding"}
                </a>
                <a
                  href="#about"
                  className="inline-flex items-center justify-center rounded-md border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  See how it works
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-3 pb-8 text-sm text-white/80 md:grid-cols-3">
            <ProofPoint value="1,000,000" label="starter coins for every account" />
            <ProofPoint value="1 hour" label="fixed countdown on each listing" />
            <ProofPoint value="Rotating" label="limited lots from bot sellers" />
          </div>
        </div>
      </section>

      <section id="about" className="bg-[#f6f2e9] px-5 py-20 text-[#151515] md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <h2 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
              The pressure of a real market, without real money.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5f6f80]">
              Every account starts with a million coins. The market is stocked
              with premium dummy listings, so you can learn when to wait, when
              to bid, and when to buy out before someone else does.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:pt-20">
            <Feature
              title="Scarcity"
              body="Only a limited set is live at once, so each lot feels worth watching."
            />
            <Feature
              title="Momentum"
              body="Countdowns and buyouts create fast decisions without complex payments."
            />
            <Feature
              title="Replay value"
              body="Bot listings refresh the market with new luxury combinations."
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f6f2e9] px-5 pb-20 text-[#151515] md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                Today's temptation board
              </h2>
              <p className="mt-3 max-w-2xl text-[#5f6f80]">
                A small rotating market makes the homepage promise simple:
                check the board today, because the same lot may not be there tomorrow.
              </p>
            </div>
            <a
              href="/auctions"
              className="inline-flex w-fit rounded-md bg-[#151515] px-5 py-3 text-sm font-bold text-white"
            >
              Open live auctions
            </a>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {marketItems.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/10"
              >
                <div className="aspect-[16/10] overflow-hidden bg-black">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-500 hover:scale-[1.04]"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5f6f80]">
                    {item.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#151515] px-5 py-16 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 border-y border-white/15 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="max-w-2xl text-4xl font-semibold tracking-tight">
              Start with fake coins. Leave with a sharper instinct.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-white/68">
              No password, no payment flow, no friction. Pick a username and
              step into the auction room.
            </p>
          </div>
          <a
            href="/auctions"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#d0a02e] px-6 py-3 text-sm font-bold text-[#151515]"
          >
            {user ? "Return to auctions" : "Create your account"}
          </a>
        </div>
      </section>

      <footer id="contact" className="bg-[#0f1110] px-5 py-8 text-sm text-white/60 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>Contact: hello@snipe-auctions.test</p>
          <p>Support: support@snipe-auctions.test</p>
          <p>(c) 2026 Snipe</p>
        </div>
      </footer>
    </main>
  );
}

function ProofPoint({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-t border-white/20 pt-4">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-white/62">{label}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/10">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#5f6f80]">{body}</p>
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
