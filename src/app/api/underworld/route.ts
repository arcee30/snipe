import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getUnderworldDashboard } from "@/services/underworld";

export async function GET() {
  const userId = await getSessionUserId();
  const dashboard = await getUnderworldDashboard(userId);
  return NextResponse.json(dashboard);
}
