import { NextResponse } from "next/server";
import { AuctionServiceError } from "@/lib/auction-errors";
import { getSessionUserId } from "@/lib/session";
import { startLaundering } from "@/services/underworld";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    }

    const body = await request.json();
    const auction = await startLaundering({
      userId,
      auctionId: String(body.auctionId ?? "")
    });

    return NextResponse.json({ auction });
  } catch (error) {
    const status = error instanceof AuctionServiceError ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start clean-up" },
      { status }
    );
  }
}
