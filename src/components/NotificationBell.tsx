"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationItem } from "@/lib/auction-ui";

type NotificationResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

export function NotificationBell({ isSignedIn }: { isSignedIn: boolean }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    const response = await fetch("/api/notifications?take=6&refresh=false");
    const data = (await response.json()) as NotificationResponse;
    setItems(data.items ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }, [isSignedIn]);

  useEffect(() => {
    refresh().catch(() => undefined);

    function handleRefresh() {
      refresh().catch(() => undefined);
    }

    window.addEventListener("snipe-session-change", handleRefresh);
    window.addEventListener("snipe-notifications-change", handleRefresh);
    const interval = window.setInterval(handleRefresh, 45_000);

    return () => {
      window.removeEventListener("snipe-session-change", handleRefresh);
      window.removeEventListener("snipe-notifications-change", handleRefresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  if (!isSignedIn) {
    return null;
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true })
    });
    await refresh();
  }

  async function openNotification(notification: NotificationItem) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notification.id })
    });
    await refresh();

    if (notification.href) {
      window.location.href = notification.href;
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen((current) => !current);
          refresh().catch(() => undefined);
        }}
        className="relative rounded-full border border-white/15 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
      >
        Alerts
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-2 min-w-5 rounded-full bg-[#d0a02e] px-1.5 py-0.5 text-center text-[11px] font-black text-[#151515]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-[#151515] text-white shadow-2xl shadow-black/35">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-bold">Notifications</p>
              <p className="text-xs text-white/55">
                {unreadCount} unread
              </p>
            </div>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10 disabled:opacity-40"
            >
              Mark read
            </button>
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {items.length > 0 ? (
              items.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                  className="block w-full border-b border-white/8 px-4 py-3 text-left transition hover:bg-white/8"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        notification.readAt ? "bg-white/20" : "bg-[#d0a02e]"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{notification.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-white/60">
                        {notification.body}
                      </span>
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <p className="px-4 py-8 text-sm text-white/60">
                No notifications yet.
              </p>
            )}
          </div>

          <a
            href="/notifications"
            className="block border-t border-white/10 px-4 py-3 text-center text-sm font-bold text-[#f2c85b] hover:bg-white/8"
          >
            View all notifications
          </a>
        </div>
      ) : null}
    </div>
  );
}
