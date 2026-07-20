import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/services/notifications";

export async function GET(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ items: [], unreadCount: 0 });
  }

  const { searchParams } = new URL(request.url);
  const take = Number(searchParams.get("take") ?? 30);
  const skipRefresh = searchParams.get("refresh") === "false";
  const notifications = await listNotifications(userId, {
    skipRefresh,
    take: Number.isFinite(take) ? take : 30
  });

  return NextResponse.json(notifications);
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.all) {
    const result = await markAllNotificationsRead(userId);
    return NextResponse.json({ updated: result.count });
  }

  const id = String(body.id ?? "");

  if (!id) {
    return NextResponse.json({ error: "Notification id required" }, { status: 400 });
  }

  const result = await markNotificationRead(userId, id);
  return NextResponse.json({ updated: result.count });
}
