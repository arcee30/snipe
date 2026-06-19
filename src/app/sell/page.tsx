"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { useSession } from "@/hooks/useSession";
import { formatCoins } from "@/lib/auction-ui";

const categories = ["car", "house", "boat", "asset"];

export default function SellPage() {
  const { user } = useSession();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [listing, setListing] = useState({
    title: "",
    category: "car",
    description: "",
    startingPrice: "100000",
    buyoutPrice: "250000",
    imageUrl: ""
  });

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Upload an image file.");
      return;
    }

    if (file.size > 800_000) {
      setError("Keep MVP image uploads under 800 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setListing((current) => ({
        ...current,
        imageUrl: String(reader.result)
      }));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function submitListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setNotice("");
    setError("");

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
        buyoutPrice: "250000",
        imageUrl: ""
      });
      setNotice("Listing created. It is live for one hour.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <PageFrame>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              Sell a luxury lot
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-[#5f6f80]">
              Create a one-hour listing with a strong image, a clear starting
              price, and a buyout that makes bidders decide fast.
            </p>

            <div className="mt-8 overflow-hidden rounded-lg bg-[#151515] text-white shadow-sm">
              <div className="aspect-[16/10] bg-black">
                <img
                  src={listing.imageUrl || "/auction-assets/car.png"}
                  alt="Listing preview"
                  className="h-full w-full object-cover opacity-90"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d0a02e]">
                  {listing.category}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {listing.title || "Your next auction lot"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  {listing.description ||
                    "Add a short description that makes the item feel rare."}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <PreviewMetric
                    label="Starting"
                    value={formatCoins(Number(listing.startingPrice) || 0)}
                  />
                  <PreviewMetric
                    label="Buyout"
                    value={formatCoins(Number(listing.buyoutPrice) || 0)}
                  />
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={submitListing}
            className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/10 md:p-6"
          >
            <div className="flex flex-col gap-2 border-b border-black/10 pb-5">
              <h2 className="text-2xl font-semibold">Create listing</h2>
              <p className="text-sm text-[#5f6f80]">
                {user
                  ? `Selling as ${user.username}`
                  : "Sign in from the navbar before creating a listing."}
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold">Asset title</span>
                <input
                  value={listing.title}
                  onChange={(event) =>
                    setListing({ ...listing, title: event.target.value })
                  }
                  placeholder="Carbon Apex R"
                  className="rounded-md border border-black/15 bg-white px-3 py-3 outline-none focus:border-[#c99a2e]"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-bold">Category</span>
                  <select
                    value={listing.category}
                    onChange={(event) =>
                      setListing({ ...listing, category: event.target.value })
                    }
                    className="rounded-md border border-black/15 bg-white px-3 py-3 outline-none focus:border-[#c99a2e]"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-bold">Image upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="min-w-0 rounded-md border border-black/15 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#151515] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-bold">Short description</span>
                <textarea
                  value={listing.description}
                  onChange={(event) =>
                    setListing({ ...listing, description: event.target.value })
                  }
                  placeholder="What makes this lot feel rare?"
                  rows={4}
                  className="rounded-md border border-black/15 bg-white px-3 py-3 outline-none focus:border-[#c99a2e]"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold">Starting price</span>
                  <input
                    value={listing.startingPrice}
                    onChange={(event) =>
                      setListing({ ...listing, startingPrice: event.target.value })
                    }
                    inputMode="numeric"
                    className="rounded-md border border-black/15 bg-white px-3 py-3 outline-none focus:border-[#c99a2e]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-bold">Buyout price</span>
                  <input
                    value={listing.buyoutPrice}
                    onChange={(event) =>
                      setListing({ ...listing, buyoutPrice: event.target.value })
                    }
                    inputMode="numeric"
                    className="rounded-md border border-black/15 bg-white px-3 py-3 outline-none focus:border-[#c99a2e]"
                  />
                </label>
              </div>

              <button
                disabled={!user || isBusy}
                className="rounded-md bg-[#151515] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Start 1-hour auction
              </button>

              {notice ? (
                <p className="rounded-md bg-[#fff7df] px-3 py-2 text-sm font-semibold text-[#6f5418]">
                  {notice}
                </p>
              ) : null}
              {error ? (
                <p className="rounded-md bg-[#fff0f0] px-3 py-2 text-sm font-semibold text-[#a33131]">
                  {error}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </PageFrame>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
