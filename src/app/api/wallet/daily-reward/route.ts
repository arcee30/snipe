import { NextResponse } from "next/server";
import { AuctionServiceError } from "@/lib/auction-errors";
import { getSessionUserId } from "@/lib/session";
import {
  claimDailyReward,
  getDailyRewardState
} from "@/services/rewards";

export async function GET() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ reward: null });
  }

  return NextResponse.json({
    reward: await getDailyRewardState(userId)
  });
}

export async function POST() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    }

    const claim = await claimDailyReward(userId);
    const reward = await getDailyRewardState(userId);

    return NextResponse.json({ claim, reward });
  } catch (error) {
    const status = error instanceof AuctionServiceError ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to claim reward" },
      { status }
    );
  }
}
