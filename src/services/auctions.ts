import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serviceError } from "@/lib/auction-errors";
import { assertPositiveCoins } from "@/lib/money";

type Tx = Prisma.TransactionClient;

export type CreateAuctionInput = {
  title: string;
  category: string;
  description: string;
  startingPrice: number;
  buyoutPrice: number;
  endsAt?: Date;
};

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function createAuction(userId: string, input: CreateAuctionInput) {
  assertPositiveCoins(input.startingPrice, "Starting price");
  assertPositiveCoins(input.buyoutPrice, "Buyout price");

  if (input.buyoutPrice <= input.startingPrice) {
    throw serviceError(
      "Buyout price must be higher than the starting price",
      "INVALID_BUYOUT_PRICE"
    );
  }

  const seller = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!seller) {
    throw serviceError("Seller not found", "SELLER_NOT_FOUND", 404);
  }

  const item = await prisma.item.create({
    data: {
      title: input.title.trim(),
      category: input.category,
      description: input.description.trim(),
      createdByUserId: userId
    }
  });

  return prisma.auction.create({
    data: {
      itemId: item.id,
      sellerId: userId,
      startingPrice: input.startingPrice,
      currentPrice: input.startingPrice,
      buyoutPrice: input.buyoutPrice,
      endsAt: input.endsAt ?? new Date(Date.now() + ONE_HOUR_MS)
    },
    include: auctionInclude
  });
}

export async function listActiveAuctions() {
  return prisma.auction.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ endsAt: "asc" }, { updatedAt: "desc" }],
    include: auctionInclude
  });
}

export async function getAuction(id: string) {
  return prisma.auction.findUnique({
    where: { id },
    include: {
      ...auctionInclude,
      bids: {
        orderBy: { createdAt: "desc" },
        include: { bidder: true }
      }
    }
  });
}

export async function placeBid(
  userId: string,
  auctionId: string,
  amount: number,
  options: { allowExpiredForTest?: boolean } = {}
) {
  assertPositiveCoins(amount, "Bid");

  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId }
    });

    if (!auction) {
      throw serviceError("Auction not found", "AUCTION_NOT_FOUND", 404);
    }

    if (auction.status !== "ACTIVE") {
      throw serviceError("Auction is not active", "AUCTION_NOT_ACTIVE");
    }

    if (!options.allowExpiredForTest && auction.endsAt.getTime() <= Date.now()) {
      throw serviceError("Auction expired", "AUCTION_EXPIRED");
    }

    if (auction.sellerId === userId) {
      throw serviceError("Seller cannot bid on own auction", "SELLER_BID");
    }

    if (amount <= auction.currentPrice) {
      throw serviceError(
        "Bid must be higher than the current price",
        "BID_TOO_LOW"
      );
    }

    const bidderWallet = await tx.wallet.findUnique({
      where: { userId }
    });

    if (!bidderWallet) {
      throw serviceError("Bidder wallet not found", "WALLET_NOT_FOUND", 404);
    }

    const previousBidderId = auction.highestBidderId;
    const sameBidderIncreasing = previousBidderId === userId;
    const availableBalance = sameBidderIncreasing
      ? bidderWallet.balance + auction.currentPrice
      : bidderWallet.balance;

    if (availableBalance < amount) {
      throw serviceError("Insufficient balance", "INSUFFICIENT_BALANCE");
    }

    if (previousBidderId) {
      await refundBid(tx, previousBidderId, auction.currentPrice, auction.id);
    }

    await tx.wallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount
        },
        ledgerEntries: {
          create: {
            userId,
            amount: -amount,
            type: "BID_HOLD",
            description: `Bid hold for auction ${auction.id}`,
            auctionId: auction.id
          }
        }
      }
    });

    await tx.bid.create({
      data: {
        auctionId: auction.id,
        bidderId: userId,
        amount
      }
    });

    return tx.auction.update({
      where: { id: auction.id },
      data: {
        currentPrice: amount,
        highestBidderId: userId
      },
      include: auctionInclude
    });
  });
}

export async function buyOutAuction(userId: string, auctionId: string) {
  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId }
    });

    if (!auction) {
      throw serviceError("Auction not found", "AUCTION_NOT_FOUND", 404);
    }

    if (auction.status !== "ACTIVE") {
      throw serviceError("Auction is not active", "AUCTION_NOT_ACTIVE");
    }

    if (auction.endsAt.getTime() <= Date.now()) {
      throw serviceError("Auction expired", "AUCTION_EXPIRED");
    }

    if (auction.sellerId === userId) {
      throw serviceError("Seller cannot buy own auction", "SELLER_BUYOUT");
    }

    const buyerWallet = await tx.wallet.findUnique({
      where: { userId }
    });

    if (!buyerWallet) {
      throw serviceError("Buyer wallet not found", "WALLET_NOT_FOUND", 404);
    }

    const buyerWasHighestBidder = auction.highestBidderId === userId;
    const availableBalance = buyerWasHighestBidder
      ? buyerWallet.balance + auction.currentPrice
      : buyerWallet.balance;

    if (availableBalance < auction.buyoutPrice) {
      throw serviceError("Insufficient balance", "INSUFFICIENT_BALANCE");
    }

    if (auction.highestBidderId) {
      await refundBid(
        tx,
        auction.highestBidderId,
        auction.currentPrice,
        auction.id
      );
    }

    await tx.wallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: auction.buyoutPrice
        },
        ledgerEntries: {
          create: {
            userId,
            amount: -auction.buyoutPrice,
            type: "BUYOUT_PURCHASE",
            description: `Bought out auction ${auction.id}`,
            auctionId: auction.id
          }
        }
      }
    });

    await creditSeller(tx, auction.sellerId, auction.buyoutPrice, auction.id);

    return tx.auction.update({
      where: { id: auction.id },
      data: {
        currentPrice: auction.buyoutPrice,
        highestBidderId: userId,
        status: "SETTLED"
      },
      include: auctionInclude
    });
  });
}

export async function closeExpiredAuctions(now = new Date()) {
  const expiredAuctions = await prisma.auction.findMany({
    where: {
      status: "ACTIVE",
      endsAt: {
        lte: now
      }
    }
  });

  for (const auction of expiredAuctions) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.auction.findUnique({
        where: { id: auction.id }
      });

      if (!fresh || fresh.status !== "ACTIVE" || fresh.endsAt > now) {
        return;
      }

      if (!fresh.highestBidderId) {
        await tx.auction.update({
          where: { id: fresh.id },
          data: { status: "EXPIRED" }
        });
        return;
      }

      await creditSeller(tx, fresh.sellerId, fresh.currentPrice, fresh.id);
      await tx.auction.update({
        where: { id: fresh.id },
        data: { status: "SETTLED" }
      });
    });
  }
}

async function refundBid(tx: Tx, userId: string, amount: number, auctionId: string) {
  await tx.wallet.update({
    where: { userId },
    data: {
      balance: {
        increment: amount
      },
      ledgerEntries: {
        create: {
          userId,
          amount,
          type: "OUTBID_REFUND",
          description: `Refund for auction ${auctionId}`,
          auctionId
        }
      }
    }
  });
}

async function creditSeller(
  tx: Tx,
  sellerId: string,
  amount: number,
  auctionId: string
) {
  await tx.wallet.update({
    where: { userId: sellerId },
    data: {
      balance: {
        increment: amount
      },
      ledgerEntries: {
        create: {
          userId: sellerId,
          amount,
          type: "SELLER_PROCEEDS",
          description: `Seller proceeds for auction ${auctionId}`,
          auctionId
        }
      }
    }
  });
}

const auctionInclude = {
  item: true,
  seller: true,
  highestBidder: true
} satisfies Prisma.AuctionInclude;
