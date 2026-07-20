import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { closeExpiredAuctions } from "@/services/auctions";

export async function GET() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ ledger: [], auctions: [] });
  }

  await closeExpiredAuctions();

  const [ledger, auctions] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: {
        userId,
        OR: [
          { auctionId: null },
          { auction: { market: "OVERWORLD" } },
          { auction: { market: "UNDERWORLD", transferStatus: "CLEANED" } }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        auction: {
          include: {
            item: true
          }
        }
      }
    }),
    prisma.auction.findMany({
      where: {
        status: {
          in: ["SETTLED", "EXPIRED"]
        },
        OR: [
          { market: "OVERWORLD" },
          { market: "UNDERWORLD", transferStatus: "CLEANED" }
        ],
        AND: [{
          OR: [
          { sellerId: userId },
          { highestBidderId: userId },
          {
            bids: {
              some: {
                bidderId: userId
              }
            }
          }
          ]
        }]
      },
      orderBy: { updatedAt: "desc" },
      include: {
        item: true,
        seller: true,
        highestBidder: true,
        bids: {
          where: { bidderId: userId },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    })
  ]);

  return NextResponse.json({
    ledger,
    auctions: auctions.map((auction) => {
      const isSeller = auction.sellerId === userId;
      const isWinner = auction.highestBidderId === userId;
      const userBid = auction.bids[0]?.amount ?? null;

      return {
        id: auction.id,
        startingPrice: auction.startingPrice,
        currentPrice: auction.currentPrice,
        buyoutPrice: auction.buyoutPrice,
        highestBidderId: auction.highestBidderId,
        status: auction.status,
        market: auction.market,
        transferStatus: auction.transferStatus,
        endsAt: auction.endsAt,
        createdAt: auction.createdAt,
        outcome: isSeller
          ? "SOLD"
          : isWinner
            ? "WON"
            : auction.status === "EXPIRED"
              ? "EXPIRED"
              : "LOST",
        userBid,
        finalPrice: auction.currentPrice,
        updatedAt: auction.updatedAt,
        item: auction.item,
        seller: {
          id: auction.seller.id,
          username: auction.seller.username
        },
        highestBidder: auction.highestBidder
          ? {
              id: auction.highestBidder.id,
              username: auction.highestBidder.username
            }
          : null
      };
    })
  });
}
