import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPositiveCoins } from "@/lib/money";
import { notifyWalletCredit } from "@/services/notifications";

type Tx = Prisma.TransactionClient;

const HIGH_BALANCE_FLAG = 500_000_000;
const HIGH_VALUE_LISTING_FLAG = 100_000_000;

export async function getAdminDashboard() {
  const [users, auctions, moderationFlags, stats] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        wallet: true,
        _count: {
          select: {
            sellingAuctions: true,
            winningAuctions: true,
            bids: true,
            ledgerEntries: true
          }
        }
      }
    }),
    prisma.auction.findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
      include: {
        item: true,
        seller: true,
        highestBidder: true,
        _count: {
          select: {
            bids: true,
            moderationFlags: true
          }
        }
      }
    }),
    prisma.moderationFlag.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        auction: {
          include: {
            item: true
          }
        },
        item: true,
        user: true,
        createdBy: true
      }
    }),
    getStats()
  ]);

  const systemFlags = buildSystemFlags(users, auctions);

  return {
    stats,
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      authProvider: user.authProvider,
      isBot: user.isBot,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      walletBalance: user.wallet?.balance ?? 0,
      counts: user._count
    })),
    auctions: auctions.map((auction) => ({
      id: auction.id,
      status: auction.status,
      startingPrice: auction.startingPrice,
      currentPrice: auction.currentPrice,
      buyoutPrice: auction.buyoutPrice,
      endsAt: auction.endsAt,
      updatedAt: auction.updatedAt,
      item: auction.item,
      seller: publicUser(auction.seller),
      highestBidder: auction.highestBidder ? publicUser(auction.highestBidder) : null,
      bidCount: auction._count.bids,
      flagCount: auction._count.moderationFlags
    })),
    flags: [
      ...moderationFlags.map((flag) => ({
        id: flag.id,
        isSystem: false,
        kind: flag.kind,
        status: flag.status,
        severity: flag.severity,
        reason: flag.reason,
        notes: flag.notes,
        createdAt: flag.createdAt,
        resolvedAt: flag.resolvedAt,
        auction: flag.auction
          ? {
              id: flag.auction.id,
              status: flag.auction.status,
              item: flag.auction.item
            }
          : null,
        item: flag.item,
        user: flag.user ? publicUser(flag.user) : null,
        createdBy: flag.createdBy ? publicUser(flag.createdBy) : null
      })),
      ...systemFlags
    ].sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "OPEN" ? -1 : 1;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })
  };
}

export async function adjustUserWallet(input: {
  userId: string;
  amount: number;
  reason: string;
  adminId: string;
}) {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new Error("Adjustment must be a non-zero whole number of credits");
  }

  const reason = input.reason.trim();

  if (reason.length < 3) {
    throw new Error("Add a short reason for the adjustment");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      include: { wallet: true }
    });

    if (!user) {
      throw new Error("User not found");
    }

    const wallet =
      user.wallet ??
      (await tx.wallet.create({
        data: {
          userId: user.id,
          balance: 0
        }
      }));

    if (wallet.balance + input.amount < 0) {
      throw new Error("Adjustment would make the wallet negative");
    }

    const updated = await tx.wallet.update({
      where: { userId: user.id },
      data: {
        balance: {
          increment: input.amount
        },
        ledgerEntries: {
          create: {
            userId: user.id,
            amount: input.amount,
            type: "ADMIN_WALLET_ADJUSTMENT",
            description: `Admin wallet adjustment: ${reason}`
          }
        }
      },
      include: {
        user: true
      }
    });

    await tx.moderationFlag.create({
      data: {
        kind: "WALLET_ADJUSTMENT",
        status: "RESOLVED",
        severity: Math.abs(input.amount) >= 25_000_000 ? "HIGH" : "LOW",
        reason: `Wallet adjusted by ${input.amount} credits`,
        notes: reason,
        userId: user.id,
        createdById: input.adminId,
        resolvedAt: new Date()
      }
    });

    if (input.amount > 0) {
      await notifyWalletCredit(tx, {
        userId: user.id,
        amount: input.amount,
        reason
      });
    }

    return updated;
  });
}

export async function setUserAdminStatus(input: {
  userId: string;
  isAdmin: boolean;
  adminId: string;
}) {
  if (input.userId === input.adminId && !input.isAdmin) {
    throw new Error("Admins cannot revoke their own admin access");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId }
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isAdmin === input.isAdmin) {
      return user;
    }

    const updated = await tx.user.update({
      where: { id: user.id },
      data: { isAdmin: input.isAdmin }
    });

    await tx.moderationFlag.create({
      data: {
        kind: "ADMIN_ROLE_UPDATED",
        status: "RESOLVED",
        severity: "HIGH",
        reason: input.isAdmin ? "Admin access granted" : "Admin access revoked",
        userId: user.id,
        createdById: input.adminId,
        resolvedAt: new Date()
      }
    });

    return updated;
  });
}

export async function closeAuctionNow(input: {
  auctionId: string;
  adminId: string;
  reason: string;
}) {
  const reason = input.reason.trim() || "Closed by admin";

  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: input.auctionId },
      include: { item: true }
    });

    if (!auction) {
      throw new Error("Auction not found");
    }

    if (auction.status !== "ACTIVE") {
      throw new Error("Only active auctions can be closed");
    }

    if (!auction.highestBidderId) {
      const closed = await tx.auction.update({
        where: { id: auction.id },
        data: { status: "EXPIRED" },
        include: adminAuctionInclude
      });

      await tx.moderationFlag.create({
        data: {
          kind: "AUCTION_CLOSED",
          status: "RESOLVED",
          severity: "LOW",
          reason,
          auctionId: auction.id,
          itemId: auction.itemId,
          userId: auction.sellerId,
          createdById: input.adminId,
          resolvedAt: new Date()
        }
      });

      return closed;
    }

    await creditSeller(tx, auction.sellerId, auction.currentPrice, auction.id);

    const closed = await tx.auction.update({
      where: { id: auction.id },
      data: { status: "SETTLED" },
      include: adminAuctionInclude
    });

    await tx.moderationFlag.create({
      data: {
        kind: "AUCTION_CLOSED",
        status: "RESOLVED",
        severity: "LOW",
        reason,
        auctionId: auction.id,
        itemId: auction.itemId,
        userId: auction.sellerId,
        createdById: input.adminId,
        resolvedAt: new Date()
      }
    });

    return closed;
  });
}

export async function cancelAuction(input: {
  auctionId: string;
  adminId: string;
  reason: string;
  removeListing?: boolean;
}) {
  const reason = input.reason.trim();

  if (reason.length < 3) {
    throw new Error("Add a short reason for the moderation action");
  }

  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: input.auctionId },
      include: { item: true }
    });

    if (!auction) {
      throw new Error("Auction not found");
    }

    if (auction.status !== "ACTIVE") {
      throw new Error("Only active auctions can be moderated");
    }

    if (auction.highestBidderId) {
      await refundBid(tx, auction.highestBidderId, auction.currentPrice, auction.id);
    }

    if (input.removeListing) {
      await tx.item.update({
        where: { id: auction.itemId },
        data: {
          title: `[Removed] ${auction.item.title}`,
          description: "This listing was removed by moderation.",
          imageUrl: null
        }
      });
    }

    const moderated = await tx.auction.update({
      where: { id: auction.id },
      data: { status: input.removeListing ? "REMOVED" : "CANCELLED" },
      include: adminAuctionInclude
    });

    await tx.moderationFlag.create({
      data: {
        kind: input.removeListing ? "LISTING_REMOVED" : "AUCTION_CANCELLED",
        status: "RESOLVED",
        severity: input.removeListing ? "HIGH" : "MEDIUM",
        reason,
        auctionId: auction.id,
        itemId: auction.itemId,
        userId: auction.sellerId,
        createdById: input.adminId,
        resolvedAt: new Date()
      }
    });

    return moderated;
  });
}

export async function resolveModerationFlag(input: {
  flagId: string;
  adminId: string;
  notes?: string;
}) {
  const flag = await prisma.moderationFlag.findUnique({
    where: { id: input.flagId }
  });

  if (!flag) {
    throw new Error("Flag not found");
  }

  if (flag.status === "RESOLVED") {
    return flag;
  }

  return prisma.moderationFlag.update({
    where: { id: input.flagId },
    data: {
      status: "RESOLVED",
      notes: input.notes?.trim() || flag.notes,
      createdById: flag.createdById ?? input.adminId,
      resolvedAt: new Date()
    }
  });
}

async function getStats() {
  const [
    userCount,
    activeAuctionCount,
    openFlagCount,
    activeWallets,
    activeBids
  ] = await Promise.all([
    prisma.user.count({ where: { isBot: false } }),
    prisma.auction.count({ where: { status: "ACTIVE" } }),
    prisma.moderationFlag.count({ where: { status: "OPEN" } }),
    prisma.wallet.aggregate({
      _sum: { balance: true }
    }),
    prisma.bid.count()
  ]);

  return {
    userCount,
    activeAuctionCount,
    openFlagCount,
    totalWalletBalance: activeWallets._sum.balance ?? 0,
    bidCount: activeBids
  };
}

function buildSystemFlags(
  users: Array<{
    id: string;
    username: string;
    email: string | null;
    displayName: string | null;
    wallet: { balance: number } | null;
    createdAt: Date;
  }>,
  auctions: Array<{
    id: string;
    status: string;
    buyoutPrice: number;
    createdAt: Date;
    item: { id: string; title: string; category: string; description: string };
    seller: { id: string; username: string; email: string | null; displayName: string | null };
  }>
) {
  const highBalanceFlags = users
    .filter((user) => (user.wallet?.balance ?? 0) >= HIGH_BALANCE_FLAG)
    .map((user) => ({
      id: `system-wallet-${user.id}`,
      isSystem: true,
      kind: "HIGH_WALLET_BALANCE",
      status: "OPEN",
      severity: "MEDIUM",
      reason: `${user.username} has ${(user.wallet?.balance ?? 0).toLocaleString()} credits available`,
      notes: "System signal. Review for economy abuse or testing balance.",
      createdAt: user.createdAt,
      resolvedAt: null,
      auction: null,
      item: null,
      user: publicUser(user),
      createdBy: null
    }));

  const highValueFlags = auctions
    .filter(
      (auction) =>
        auction.status === "ACTIVE" && auction.buyoutPrice >= HIGH_VALUE_LISTING_FLAG
    )
    .map((auction) => ({
      id: `system-auction-${auction.id}`,
      isSystem: true,
      kind: "HIGH_VALUE_LISTING",
      status: "OPEN",
      severity: "LOW",
      reason: `${auction.item.title} is listed above ${HIGH_VALUE_LISTING_FLAG.toLocaleString()} credits`,
      notes: "System signal. Confirm price and image quality before promotion.",
      createdAt: auction.createdAt,
      resolvedAt: null,
      auction: {
        id: auction.id,
        status: auction.status,
        item: auction.item
      },
      item: auction.item,
      user: publicUser(auction.seller),
      createdBy: null
    }));

  return [...highBalanceFlags, ...highValueFlags];
}

function publicUser(user: {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName
  };
}

async function refundBid(tx: Tx, userId: string, amount: number, auctionId: string) {
  assertPositiveCoins(amount, "Refund");
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
          type: "ADMIN_AUCTION_REFUND",
          description: `Admin refund for moderated auction ${auctionId}`,
          auctionId
        }
      }
    }
  });
}

async function creditSeller(tx: Tx, sellerId: string, amount: number, auctionId: string) {
  assertPositiveCoins(amount, "Seller credit");
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
          description: `Seller proceeds for admin-closed auction ${auctionId}`,
          auctionId
        }
      }
    }
  });
}

const adminAuctionInclude = {
  item: true,
  seller: true,
  highestBidder: true
} satisfies Prisma.AuctionInclude;
