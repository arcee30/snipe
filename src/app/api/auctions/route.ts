import { NextResponse } from "next/server";
import { AuctionServiceError } from "@/lib/auction-errors";
import { getSessionUserId } from "@/lib/session";
import {
  closeExpiredAuctions,
  createAuction,
  ensureBotAuctionPool,
  listActiveAuctions
} from "@/services/auctions";
import type { Market } from "@/services/auctions";

function marketFromRequest(request: Request): Market {
  const value = new URL(request.url).searchParams.get("market");
  return value === "UNDERWORLD" ? "UNDERWORLD" : "OVERWORLD";
}

export async function GET(request: Request) {
  const market = marketFromRequest(request);
  await closeExpiredAuctions();
  await ensureBotAuctionPool({ market });
  const auctions = await listActiveAuctions(market);
  return NextResponse.json({ auctions });
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ error: "Create a username first" }, { status: 401 });
    }

    const body = await request.json();
    const market = body.market === "UNDERWORLD" ? "UNDERWORLD" : "OVERWORLD";
    const auction = await createAuction(userId, {
      title: String(body.title ?? ""),
      category: String(body.category ?? "asset"),
      description: String(body.description ?? ""),
      imageUrl: String(body.imageUrl ?? ""),
      startingPrice: Number(body.startingPrice),
      buyoutPrice: Number(body.buyoutPrice),
      market
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
