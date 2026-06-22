"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageFrame } from "@/components/PageFrame";

export default function SignInPage() {
  return (
    <PageFrame tone="dark">
      <Suspense>
        <SignInContent />
      </Suspense>
    </PageFrame>
  );
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") ?? "");
  const [isBusy, setIsBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsBusy(true);

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, displayName, email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to sign in");
      }

      window.dispatchEvent(new Event("snipe-session-change"));
      router.push("/auctions");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="relative min-h-[calc(100vh-81px)] overflow-hidden px-5 py-10 md:px-8">
      <img
        src="/auction-assets/generated/private-jet-hangar.png"
        alt="Private jet in a luxury hangar"
        className="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/82 to-black/40" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 py-10 lg:grid-cols-[0.95fr_0.8fr] lg:items-center">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
            Step into the auction room.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
            Create your Snipe account, receive an opening balance, and begin
            building a portfolio across cars, homes, yachts, aircraft, and
            trophy assets.
          </p>
          <div className="mt-8 grid max-w-2xl gap-3 md:grid-cols-3">
            <AuthProof value="1M" label="opening balance" />
            <AuthProof value="1 hour" label="auction windows" />
            <AuthProof value="Top 10" label="collector ranking" />
          </div>
        </div>

        <div className="rounded-xl border border-white/12 bg-white p-6 text-[#151515] shadow-2xl shadow-black/30">
          <div className="grid grid-cols-2 rounded-lg bg-black/[0.05] p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-md px-4 py-3 text-sm font-bold transition ${
                mode === "signin" ? "bg-[#151515] text-white" : "text-[#5f6f80]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-md px-4 py-3 text-sm font-bold transition ${
                mode === "signup" ? "bg-[#151515] text-white" : "text-[#5f6f80]"
              }`}
            >
              Create account
            </button>
          </div>

          <a
            href="/api/auth/google/start"
            className="mt-5 flex items-center justify-center rounded-md border border-black/15 bg-white px-4 py-3 text-sm font-bold transition hover:border-[#c99a2e] hover:bg-[#fff7df]"
          >
            Continue with Google
          </a>

          <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#5f6f80]">
            <span className="h-px flex-1 bg-black/10" />
            or use email
            <span className="h-px flex-1 bg-black/10" />
          </div>

          <form onSubmit={submit} className="grid gap-4">
            {mode === "signup" ? (
              <label className="grid gap-2 text-sm font-bold">
                Display name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your display name"
                  className="rounded-md border border-black/15 px-4 py-3 text-base font-medium outline-none focus:border-[#c99a2e]"
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-bold">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="you@example.com"
                className="rounded-md border border-black/15 px-4 py-3 text-base font-medium outline-none focus:border-[#c99a2e]"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="At least 8 characters"
                className="rounded-md border border-black/15 px-4 py-3 text-base font-medium outline-none focus:border-[#c99a2e]"
              />
            </label>

            {error ? (
              <p className="rounded-md bg-[#fff0f0] px-3 py-2 text-sm font-semibold text-[#a33131]">
                {error}
              </p>
            ) : null}

            <button
              disabled={isBusy}
              className="rounded-md bg-[#d0a02e] px-5 py-3 text-sm font-bold text-[#151515] transition hover:bg-[#e4b645] disabled:opacity-50"
            >
              {isBusy
                ? "Working..."
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function AuthProof({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-t border-white/18 pt-4">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/60">{label}</p>
    </div>
  );
}
