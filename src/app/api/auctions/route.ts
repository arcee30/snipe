import { NextResponse } from "next/server";
import { AuctionServiceError } from "@/lib/auction-errors";
import { getSessionUserId } from "@/lib/session";
import { closeExpiredAuctions, createAuction, listActiveAuctions } from "@/services/auctions";

export async function GET() {
  await closeExpiredAuctions();
  const auctions = await listActiveAuctions();
  return NextResponse.json({ auctions });
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ error: "Create a username first" }, { status: 401 });
    }

    const body = await request.json();
    const auction = await createAuction(userId, {
      title: String(body.title ?? ""),
      category: String(body.category ?? "asset"),
      description: String(body.description ?? ""),
      startingPrice: Number(body.startingPrice),
      buyoutPrice: Number(body.buyoutPrice)
    });

    return NextResponse.json({ auction });
  } catch (error) {
    const status = error instanceof AuctionServiceError ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create auction" },
      { status }
    );
  }
}
