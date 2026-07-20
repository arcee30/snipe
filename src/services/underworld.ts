import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serviceError } from "@/lib/auction-errors";
import { assertPositiveCoins } from "@/lib/money";
import {
  closeExpiredAuctions,
  ensureBotAuctionPool,
  listActiveAuctions
} from "@/services/auctions";

type Tx = Prisma.TransactionClient;

const MIN_LAUNDERING_HOURS = 2;
const MAX_LAUNDERING_HOURS = 6;

export async function getUnderworldDashboard(userId: string | null, now = new Date()) {
  await Promise.all([
    closeExpiredAuctions(now),
    ensureBotAuctionPool({ market: "UNDERWORLD", targetActive: 12 })
  ]);

  if (userId) {
    await settleCompletedLaundering(userId, now);
  }

  const activeAuctions = await listActiveAuctions("UNDERWORLD");

  if (!userId) {
    return {
      auctions: activeAuctions,
      stash: [],
      laundering: [],
      records: [],
      summary: {
        dirtyValue: 0,
        launderingValue: 0,
        cleanedValue: 0,
        potentialCleanValue: 0
      }
    };
  }

  const owned = await prisma.auction.findMany({
    where: {
      market: "UNDERWORLD",
      status: "SETTLED",
      highestBidderId: userId
    },
    orderBy: { updatedAt: "desc" },
    include: underworldAuctionInclude
  });

  const stash = owned.filter((auction) => auction.transferStatus === "NONE");
  const laundering = owned.filter((auction) => auction.transferStatus === "LAUNDERING");
  const cleaned = owned.filter((auction) => auction.transferStatus === "CLEANED");

  return {
    auctions: activeAuctions,
    stash: stash.map(withLaunderingQuote),
    laundering: laundering.map(withLaunderingQuote),
    records: owned.map(withLaunderingQuote),
    summary: {
      dirtyValue: sumCleanValue(stash),
      launderingValue: sumCleanValue(laundering),
      cleanedValue: sumCleanValue(cleaned),
      potentialCleanValue: sumCleanValue(owned)
    }
  };
}

export async function startLaundering(input: {
  userId: string;
  auctionId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: input.auctionId },
      include: underworldAuctionInclude
    });

    if (!auction) {
      throw serviceError("Asset not found", "UNDERWORLD_ASSET_NOT_FOUND", 404);
    }

    if (auction.market !== "UNDERWORLD") {
      throw serviceError("Only underworld assets can be laundered", "INVALID_MARKET");
    }

    if (auction.status !== "SETTLED" || auction.highestBidderId !== input.userId) {
      throw serviceError("You do not own this underworld asset", "ASSET_NOT_OWNED");
    }

    if (auction.transferStatus === "LAUNDERING") {
      throw serviceError("Asset is already being cleaned", "ALREADY_LAUNDERING");
    }

    if (auction.transferStatus === "CLEANED") {
      throw serviceError("Asset is already clean", "ALREADY_CLEANED");
    }

    const cleanValue = cleanValueForAuction(auction);
    const fee = launderingFee(cleanValue);
    assertPositiveCoins(fee, "Laundering fee");

    const wallet = await tx.wallet.findUnique({
      where: { userId: input.userId }
    });

    if (!wallet) {
      throw serviceError("Wallet not found", "WALLET_NOT_FOUND", 404);
    }

    if (wallet.balance < fee) {
      throw serviceError("Insufficient balance for clean-up fee", "INSUFFICIENT_BALANCE");
    }

    const completesAt = new Date(now.getTime() + launderingDurationMs(cleanValue));

    await tx.wallet.update({
      where: { userId: input.userId },
      data: {
        balance: {
          decrement: fee
        },
        ledgerEntries: {
          create: {
            userId: input.userId,
            amount: -fee,
            type: "LAUNDERING_FEE",
            description: `Clean-up fee for ${auction.item.title}`,
            auctionId: auction.id
          }
        }
      }
    });

    return tx.auction.update({
      where: { id: auction.id },
      data: {
        transferStatus: "LAUNDERING",
        launderingFee: fee,
        launderingStartedAt: now,
        launderingCompletesAt: completesAt
      },
      include: underworldAuctionInclude
    });
  });
}

export async function settleCompletedLaundering(userId: string, now = new Date()) {
  return prisma.auction.updateMany({
    where: {
      highestBidderId: userId,
      market: "UNDERWORLD",
      status: "SETTLED",
      transferStatus: "LAUNDERING",
      launderingCompletesAt: {
        lte: now
      }
    },
    data: {
      transferStatus: "CLEANED"
    }
  });
}

function withLaunderingQuote<T extends UnderworldAuction>(auction: T) {
  const cleanValue = cleanValueForAuction(auction);

  return {
    ...auction,
    cleanValue,
    launderingQuote: {
      fee: auction.launderingFee ?? launderingFee(cleanValue),
      durationMs: launderingDurationMs(cleanValue)
    }
  };
}

function cleanValueForAuction(auction: UnderworldAuction) {
  return auction.item.estimatedCleanValue ?? Math.round(auction.buyoutPrice / 0.42);
}

function launderingFee(cleanValue: number) {
  return Math.round((cleanValue * 0.2) / 1_000) * 1_000;
}

function launderingDurationMs(cleanValue: number) {
  const valueRatio = Math.min(1, cleanValue / 12_000_000);
  const hours = MIN_LAUNDERING_HOURS + valueRatio * (MAX_LAUNDERING_HOURS - MIN_LAUNDERING_HOURS);
  return Math.round(hours * 60 * 60 * 1000);
}

function sumCleanValue(auctions: UnderworldAuction[]) {
  return auctions.reduce((total, auction) => total + cleanValueForAuction(auction), 0);
}

const underworldAuctionInclude = {
  item: true,
  seller: true,
  highestBidder: true
} satisfies Prisma.AuctionInclude;

type UnderworldAuction = Prisma.AuctionGetPayload<{
  include: typeof underworldAuctionInclude;
}>;
