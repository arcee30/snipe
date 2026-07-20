"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { useSession } from "@/hooks/useSession";
import type { NotificationItem } from "@/lib/auction-ui";

type NotificationResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

export default function NotificationsPage() {
  const { user, isLoading } = useSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

  async function refreshNotifications() {
    const response = await fetch("/api/notifications?take=80");
    const data = (await response.json()) as NotificationResponse;
    setItems(data.items ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }

  useEffect(() => {
    refreshNotifications().catch(() => undefined);
  }, []);

  async function markAllRead() {
    setIsBusy(true);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true })
    });
    await refreshNotifications();
    window.dispatchEvent(new Event("snipe-notifications-change"));
    setIsBusy(false);
  }

  async function openNotification(notification: NotificationItem) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notification.id })
    });
    window.dispatchEvent(new Event("snipe-notifications-change"));

    if (notification.href) {
      window.location.href = notification.href;
      return;
    }

    await refreshNotifications();
  }

  return (
    <PageFrame>
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="ink-surface rounded-xl p-6 text-white md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d0a02e]">
              Notification center
            </p>
            <h1 className="display-serif mt-3 text-5xl font-semibold leading-none md:text-7xl">
              Stay close to the market.
            </h1>
            <p className="mt-5 max-w-xl leading-7 text-white/65">
              Track outbids, closing lots, settled auctions, account credits,
              and the moments that need a fast decision.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/12 bg-white/10 px-4 py-3">
                <p className="text-3xl font-semibold">{unreadCount}</p>
                <p className="mt-1 text-sm font-semibold text-white/55">unread</p>
              </div>
              <div className="rounded-lg border border-white/12 bg-white/10 px-4 py-3">
                <p className="text-3xl font-semibold">{items.length}</p>
                <p className="mt-1 text-sm font-semibold text-white/55">recent alerts</p>
              </div>
            </div>
          </div>

          <div className="premium-surface rounded-xl p-5 ring-1 ring-black/10 md:p-6">
            <div className="flex flex-col gap-3 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="display-serif text-4xl font-semibold leading-none">
                  Activity
                </h2>
                <p className="mt-2 text-sm text-[#5f6f80]">
                  Alerts are kept here after they leave the dropdown.
                </p>
              </div>
              <button
                onClick={markAllRead}
                disabled={isBusy || unreadCount === 0}
                className="interactive-lift w-fit rounded-full bg-[#151515] px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
              >
                Mark all read
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {isLoading ? (
                <p className="rounded-md bg-black/[0.035] px-4 py-3 text-[#5f6f80]">
                  Loading notifications...
                </p>
              ) : !user ? (
                <p className="rounded-md bg-black/[0.035] px-4 py-3 text-[#5f6f80]">
                  Sign in to see your notifications.
                </p>
              ) : items.length > 0 ? (
                items.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => openNotification(notification)}
                    className="interactive-lift grid gap-3 rounded-xl border border-black/10 bg-white/70 p-4 text-left transition hover:border-[#d0a02e]/60 md:grid-cols-[auto_1fr_auto]"
                  >
                    <span
                      className={`mt-1 h-3 w-3 rounded-full ${
                        notification.readAt ? "bg-black/15" : "bg-[#d0a02e]"
                      }`}
                    />
                    <span>
                      <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a20]">
                        {notification.type.replaceAll("_", " ")}
                      </span>
                      <span className="mt-1 block text-lg font-semibold">
                        {notification.title}
                      </span>
                      <span className="mt-1 block leading-6 text-[#5f6f80]">
                        {notification.body}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-[#5f6f80]">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-md bg-black/[0.035] px-4 py-3 text-[#5f6f80]">
                  Nothing needs attention right now.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
