import { NextResponse } from "next/server";
import { AuctionServiceError } from "@/lib/auction-errors";
import { getSessionUserId } from "@/lib/session";
import { buyOutAuction } from "@/services/auctions";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ error: "Create a username first" }, { status: 401 });
    }

    const { id } = await context.params;
    const auction = await buyOutAuction(userId, id);

    return NextResponse.json({ auction });
  } catch (error) {
    const status = error instanceof AuctionServiceError ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to buy out auction" },
      { status }
    );
  }
}
