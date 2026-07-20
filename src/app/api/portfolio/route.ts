import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { closeExpiredAuctions } from "@/services/auctions";

type LeaderboardEntry = {
  username: string;
  displayName?: string | null;
  totalWorth: number;
  assetCount: number;
  isCurrentUser?: boolean;
};

const BOT_LEADERS: LeaderboardEntry[] = [
  { username: "SovereignVault", totalWorth: 12_800_000_000, assetCount: 42 },
  { username: "ApexReserve", totalWorth: 10_950_000_000, assetCount: 38 },
  { username: "MarinaOracle", totalWorth: 8_700_000_000, assetCount: 31 },
  { username: "SkylineSyndicate", totalWorth: 6_450_000_000, assetCount: 27 },
  { username: "DeepwaterBid", totalWorth: 4_900_000_000, assetCount: 24 },
  { username: "HangarPrime", totalWorth: 3_650_000_000, assetCount: 21 },
  { username: "VolcanicEstate", totalWorth: 2_840_000_000, assetCount: 18 },
  { username: "CarbonLedger", totalWorth: 1_920_000_000, assetCount: 17 },
  { username: "VaultKing", totalWorth: 1_250_000_000, assetCount: 14 },
  { username: "CoastlineFund", totalWorth: 860_000_000, assetCount: 12 }
];

export async function GET() {
  const userId = await getSessionUserId();
  await closeExpiredAuctions();

  if (!userId) {
    return NextResponse.json({
      assets: [],
      totalWorth: 0,
      assetCount: 0,
      categoryBreakdown: [],
      bestAsset: null,
      totalSpent: 0,
      unrealizedGain: 0,
      leaderboard: BOT_LEADERS,
      currentUserRank: null
    });
  }

  const [user, auctions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.auction.findMany({
      where: {
        status: "SETTLED",
        highestBidderId: userId,
        OR: [
          { market: "OVERWORLD" },
          { market: "UNDERWORLD", transferStatus: "CLEANED" }
        ]
      },
      orderBy: { updatedAt: "desc" },
      include: {
        item: true,
        seller: true
      }
    })
  ]);

  const assets = auctions.map((auction) => {
    const marketEstimate = estimatePortfolioValue(
      auction.buyoutPrice,
      auction.currentPrice
    );
    const estimatedValue =
      auction.market === "UNDERWORLD"
        ? auction.item.estimatedCleanValue ?? marketEstimate
        : marketEstimate;

    return {
      id: auction.id,
      title: auction.item.title,
      category: auction.item.category,
      description: auction.item.description,
      imageUrl: auction.item.imageUrl,
      acquiredFor: auction.currentPrice,
      estimatedValue,
      appreciation: estimatedValue - auction.currentPrice,
      acquiredAt: auction.updatedAt,
      market: auction.market,
      transferStatus: auction.transferStatus,
      seller: {
        id: auction.seller.id,
        username: auction.seller.username,
        displayName: auction.seller.displayName,
        email: auction.seller.email
      }
    };
  });

  const totalWorth = assets.reduce((total, asset) => total + asset.estimatedValue, 0);
  const totalSpent = assets.reduce((total, asset) => total + asset.acquiredFor, 0);
  const bestAsset =
    [...assets].sort((a, b) => b.estimatedValue - a.estimatedValue)[0] ?? null;
  const categoryTotals = new Map<string, { category: string; count: number; worth: number }>();

  for (const asset of assets) {
    const existing =
      categoryTotals.get(asset.category) ??
      { category: asset.category, count: 0, worth: 0 };
    existing.count += 1;
    existing.worth += asset.estimatedValue;
    categoryTotals.set(asset.category, existing);
  }

  const userLeader = {
    username: user?.username ?? "You",
    displayName: user?.displayName,
    totalWorth,
    assetCount: assets.length,
    isCurrentUser: true
  };
  const fullLeaderboard = [...BOT_LEADERS, userLeader].sort(
    (a, b) => b.totalWorth - a.totalWorth
  );
  const currentUserIndex = fullLeaderboard.findIndex((leader) => leader.isCurrentUser);

  return NextResponse.json({
    assets,
    totalWorth,
    assetCount: assets.length,
    categoryBreakdown: [...categoryTotals.values()].sort((a, b) => b.worth - a.worth),
    bestAsset,
    totalSpent,
    unrealizedGain: totalWorth - totalSpent,
    leaderboard: fullLeaderboard.slice(0, 10),
    currentUserRank: currentUserIndex >= 0 ? currentUserIndex + 1 : null
  });
}

function estimatePortfolioValue(buyoutPrice: number, finalPrice: number) {
  const anchor = Math.max(buyoutPrice, finalPrice);
  return Math.round((anchor * 1.18) / 1_000) * 1_000;
}
