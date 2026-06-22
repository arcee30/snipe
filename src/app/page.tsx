"use client";

import { PageFrame } from "@/components/PageFrame";
import { useSession } from "@/hooks/useSession";

const marketItems = [
  {
    title: "Sunset marina yachts",
    image: "/auction-assets/boat.png",
    text: "A clean exit price for buyers who would rather not wait."
  },
  {
    title: "Private coastal homes",
    image: "/auction-assets/house.png",
    text: "Short listing windows keep attention on the highest-quality lots."
  },
  {
    title: "Collector cars",
    image: "/auction-assets/car.png",
    text: "Follow the bid, read the room, and move before the market does."
  }
];

export default function Home() {
  const { user } = useSession();

  return (
    <PageFrame tone="dark">
      <section className="relative min-h-[88vh] overflow-hidden">
        <img
          src="/auction-assets/boat.png"
          alt="Luxury yacht at sunset"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0f1110] to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col px-5 md:px-8">
          <div className="flex flex-1 items-center py-14">
            <div className="max-w-3xl">
              <h1 className="max-w-full text-[2.8rem] font-semibold leading-[0.95] tracking-tight sm:text-5xl md:text-7xl">
                Private auctions for assets worth watching.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78 md:text-xl">
                Snipe is a live auction house for high-value cars, yachts,
                homes, and collectible assets. Listings rotate on a strict
                clock, so every bid carries weight.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={user ? "/auctions" : "/signin"}
                  className="inline-flex items-center justify-center rounded-md bg-[#d0a02e] px-6 py-3 text-sm font-bold text-[#151515] shadow-lg shadow-black/20 transition hover:bg-[#e4b645]"
                >
                  {user ? "Open the market" : "Create your account"}
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
            <ProofPoint value="1,000,000" label="opening balance" />
            <ProofPoint value="1 hour" label="standard listing window" />
            <ProofPoint value="Curated" label="limited active inventory" />
          </div>
        </div>
      </section>

      <section id="about" className="bg-[#f6f2e9] px-5 py-20 text-[#151515] md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <h2 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
              A market built around timing and restraint.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5f6f80]">
              Every account starts with a meaningful balance and a live market
              of premium listings. The best outcomes come from knowing when to
              wait, when to press, and when to close.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:pt-20">
            <Feature
              title="Scarcity"
              body="Only a small set is live at once, so attention stays focused."
            />
            <Feature
              title="Momentum"
              body="Countdowns and buyouts make hesitation part of the price."
            />
            <Feature
              title="Market rhythm"
              body="Fresh inventory keeps the board moving without flooding it."
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f6f2e9] px-5 pb-20 text-[#151515] md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                Today's board
              </h2>
              <p className="mt-3 max-w-2xl text-[#5f6f80]">
                A tighter market is easier to read and harder to ignore. What
                is available now may not be there on the next refresh.
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
              Build a portfolio one decision at a time.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-white/68">
              Create an account, review the current board, and decide which
              assets are worth pursuing before the window closes.
            </p>
          </div>
          <a
            href={user ? "/auctions" : "/signin"}
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#d0a02e] px-6 py-3 text-sm font-bold text-[#151515]"
          >
            {user ? "Return to auctions" : "Create your account"}
          </a>
        </div>
      </section>

      <footer className="bg-[#0f1110] px-5 py-8 text-sm text-white/60 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <a href="/contact" className="transition hover:text-white">
            Contact: spinnerclow21@gmail.com
          </a>
          <p>Support: support@snipe-auctions.test</p>
          <p>(c) 2026 Snipe</p>
        </div>
      </footer>
    </PageFrame>
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
