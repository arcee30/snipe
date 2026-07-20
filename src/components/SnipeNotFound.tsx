import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

export function SnipeNotFound() {
  return (
    <main className="min-h-screen bg-[#f7f3e9] text-[#151515]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 md:px-8">
        <header className="flex items-center justify-between border-b border-black/10 pb-5">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <span className="text-2xl font-semibold tracking-tight">Snipe</span>
          </Link>
          <Link
            href="/auctions"
            className="rounded-full bg-[#151515] px-4 py-2 text-sm font-bold text-white"
          >
            View auctions
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#9b741d]">
              Lot unavailable
            </p>
            <h1 className="display-serif mt-4 text-6xl font-semibold leading-none md:text-8xl">
              Nothing is listed here.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f6f80]">
              This address is not part of the current market. Return to the live
              board and keep an eye on what rotates in next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auctions"
                className="rounded-full bg-[#151515] px-5 py-3 text-sm font-bold text-white"
              >
                Back to auctions
              </Link>
              <Link
                href="/"
                className="rounded-full border border-black/15 px-5 py-3 text-sm font-bold"
              >
                Home
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-[#151515] p-8 text-white shadow-2xl shadow-black/15">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#d0a02e]" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d0a02e]">
              Error 404
            </p>
            <div className="mt-12 grid aspect-[16/10] place-items-center rounded-xl border border-white/10 bg-white/[0.035]">
              <div className="text-center">
                <p className="display-serif text-8xl font-semibold leading-none text-white">
                  404
                </p>
                <p className="mt-3 text-sm font-semibold text-white/55">
                  No active lot at this address
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-6 text-white/55">
              Some lots close. Some never existed. Either way, the board keeps moving.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
