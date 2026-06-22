"use client";

import { FormEvent, useState } from "react";
import { PageFrame } from "@/components/PageFrame";

const contactTopics = [
  "Account help",
  "Auction issue",
  "Partnership",
  "Feedback",
  "Other"
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(contactTopics[0]);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    setIsBusy(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit your message.");
      }

      setNotice("Message received. We will reply to the email you provided.");
      setName("");
      setEmail("");
      setTopic(contactTopics[0]);
      setMessage("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <PageFrame tone="dark">
      <section className="relative overflow-hidden px-5 py-12 md:px-8">
        <img
          src="/auction-assets/generated/collector-vault.png"
          alt="Luxury collector vault"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/88 to-black/55" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-2xl py-10">
            <h1 className="text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
              Talk to the Snipe desk.
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/72">
              Send account questions, listing concerns, feedback, or
              partnership notes. Your message goes straight to the Snipe inbox
              with your reply address attached.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <ContactMetric value="24h" label="target reply window" />
              <ContactMetric value="Direct" label="email follow-up" />
              <ContactMetric value="Secure" label="no public messages" />
            </div>
          </div>

          <form
            onSubmit={submitMessage}
            className="rounded-xl border border-white/12 bg-white p-5 text-[#151515] shadow-2xl shadow-black/30 md:p-7"
          >
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Send a message
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6f80]">
                Routed to spinnerclow21@gmail.com.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="rounded-md border border-black/15 px-4 py-3 text-base font-medium outline-none transition focus:border-[#c99a2e]"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold">
                Email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="rounded-md border border-black/15 px-4 py-3 text-base font-medium outline-none transition focus:border-[#c99a2e]"
                />
              </label>
            </div>

            <label className="mt-4 grid gap-2 text-sm font-bold">
              Topic
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="rounded-md border border-black/15 bg-white px-4 py-3 text-base font-medium outline-none transition focus:border-[#c99a2e]"
              >
                {contactTopics.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="mt-4 grid gap-2 text-sm font-bold">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share the details we should know."
                rows={7}
                className="resize-y rounded-md border border-black/15 px-4 py-3 text-base font-medium leading-7 outline-none transition focus:border-[#c99a2e]"
              />
            </label>

            {notice ? (
              <p className="mt-4 rounded-md bg-[#e9f7e9] px-3 py-2 text-sm font-semibold text-[#2f7d32]">
                {notice}
              </p>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-md bg-[#fff0f0] px-3 py-2 text-sm font-semibold text-[#a33131]">
                {error}
              </p>
            ) : null}

            <button
              disabled={isBusy}
              className="mt-5 w-full rounded-md bg-[#d0a02e] px-5 py-3 text-sm font-bold text-[#151515] transition hover:bg-[#e4b645] disabled:opacity-50"
            >
              {isBusy ? "Sending..." : "Send message"}
            </button>
          </form>
        </div>
      </section>

      <section className="bg-[#f6f2e9] px-5 py-12 text-[#151515] md:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          <InfoCard
            title="Auction support"
            body="Include the lot name, bid amount, and the outcome you saw."
          />
          <InfoCard
            title="Account questions"
            body="Use the same email you signed up with so support can identify the account."
          />
          <InfoCard
            title="Business notes"
            body="Partnerships, inventory, and product feedback can all start here."
          />
        </div>
      </section>
    </PageFrame>
  );
}

function ContactMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-t border-white/18 pt-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/60">{label}</p>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/10">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#5f6f80]">{body}</p>
    </article>
  );
}
