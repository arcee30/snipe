import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;
type NotificationClient = Pick<
  Tx,
  "notification" | "auction" | "bid"
>;

const ENDING_SOON_WINDOW_MS = 10 * 60 * 1000;

type NotificationInput = {
  userId: string;
  auctionId?: string | null;
  type: string;
  title: string;
  body: string;
  href?: string;
  dedupeKey?: string;
};

export async function listNotifications(
  userId: string,
  options: { skipRefresh?: boolean; take?: number } = {}
) {
  if (!options.skipRefresh) {
    await refreshUserNotifications(userId);
  }

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: options.take ?? 30
    }),
    prisma.notification.count({
      where: {
        userId,
        readAt: null
      }
    })
  ]);

  return { items, unreadCount };
}

export async function refreshUserNotifications(userId: string, now = new Date()) {
  const endingSoon = await prisma.auction.findMany({
    where: {
      status: "ACTIVE",
      endsAt: {
        gt: now,
        lte: new Date(now.getTime() + ENDING_SOON_WINDOW_MS)
      },
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
    },
    include: { item: true }
  });

  for (const auction of endingSoon) {
    await createNotification(prisma, {
      userId,
      auctionId: auction.id,
      type: "AUCTION_ENDING_SOON",
      title: "Auction ending soon",
      body: `${auction.item.title} closes in under 10 minutes.`,
      href: "/auctions",
      dedupeKey: `auction-ending-soon:${auction.id}:${userId}`
    });
  }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId
    },
    data: {
      readAt: new Date()
    }
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });
}

export async function notifyOutbid(
  tx: Tx,
  input: {
    userId: string;
    auctionId: string;
    itemTitle: string;
    newAmount: number;
  }
) {
  await createNotification(tx, {
    userId: input.userId,
    auctionId: input.auctionId,
    type: "OUTBID",
    title: "You were outbid",
    body: `${input.itemTitle} has a new leading bid of ${input.newAmount.toLocaleString()} credits.`,
    href: "/auctions",
    dedupeKey: `outbid:${input.auctionId}:${input.userId}:${input.newAmount}`
  });
}

export async function notifyWalletCredit(
  tx: Tx,
  input: {
    userId: string;
    amount: number;
    reason?: string;
  }
) {
  await createNotification(tx, {
    userId: input.userId,
    type: "WALLET_CREDIT",
    title: "Balance updated",
    body: `${input.amount.toLocaleString()} credits were added to your balance${
      input.reason ? `: ${input.reason}` : "."
    }`,
    href: "/wallet"
  });
}

export async function notifyRewardAsset(
  tx: Tx,
  input: {
    userId: string;
    auctionId: string;
    itemTitle: string;
    estimatedValue: number;
  }
) {
  await createNotification(tx, {
    userId: input.userId,
    auctionId: input.auctionId,
    type: "REWARD_ASSET",
    title: "Seven-day reward unlocked",
    body: `${input.itemTitle} has been added to your portfolio with an estimated value of ${input.estimatedValue.toLocaleString()} credits.`,
    href: "/portfolio",
    dedupeKey: `reward-asset:${input.auctionId}:${input.userId}`
  });
}

export async function notifyBuyoutSettled(
  tx: Tx,
  input: {
    auctionId: string;
    buyerId: string;
    sellerId: string;
    previousBidderId?: string | null;
    itemTitle: string;
    amount: number;
  }
) {
  await createNotification(tx, {
    userId: input.buyerId,
    auctionId: input.auctionId,
    type: "AUCTION_WON",
    title: "Asset acquired",
    body: `You bought out ${input.itemTitle} for ${input.amount.toLocaleString()} credits.`,
    href: "/portfolio",
    dedupeKey: `auction-won:${input.auctionId}:${input.buyerId}`
  });

  await createNotification(tx, {
    userId: input.sellerId,
    auctionId: input.auctionId,
    type: "AUCTION_SOLD",
    title: "Auction sold",
    body: `${input.itemTitle} sold for ${input.amount.toLocaleString()} credits.`,
    href: "/history",
    dedupeKey: `auction-sold:${input.auctionId}:${input.sellerId}`
  });

  if (input.previousBidderId && input.previousBidderId !== input.buyerId) {
    await createNotification(tx, {
      userId: input.previousBidderId,
      auctionId: input.auctionId,
      type: "AUCTION_LOST",
      title: "Auction closed",
      body: `${input.itemTitle} was bought out by another bidder.`,
      href: "/history",
      dedupeKey: `auction-lost:${input.auctionId}:${input.previousBidderId}`
    });
  }
}

export async function notifyAuctionClosed(
  tx: Tx,
  input: {
    auctionId: string;
    winnerId: string;
    sellerId: string;
    itemTitle: string;
    amount: number;
  }
) {
  await createNotification(tx, {
    userId: input.winnerId,
    auctionId: input.auctionId,
    type: "AUCTION_WON",
    title: "Auction won",
    body: `You won ${input.itemTitle} for ${input.amount.toLocaleString()} credits.`,
    href: "/portfolio",
    dedupeKey: `auction-won:${input.auctionId}:${input.winnerId}`
  });

  await createNotification(tx, {
    userId: input.sellerId,
    auctionId: input.auctionId,
    type: "AUCTION_SOLD",
    title: "Auction sold",
    body: `${input.itemTitle} closed at ${input.amount.toLocaleString()} credits.`,
    href: "/history",
    dedupeKey: `auction-sold:${input.auctionId}:${input.sellerId}`
  });

  const losingBidders = await tx.bid.findMany({
    where: {
      auctionId: input.auctionId,
      bidderId: {
        not: input.winnerId
      }
    },
    distinct: ["bidderId"],
    select: {
      bidderId: true
    }
  });

  for (const bidder of losingBidders) {
    await createNotification(tx, {
      userId: bidder.bidderId,
      auctionId: input.auctionId,
      type: "AUCTION_LOST",
      title: "Auction closed",
      body: `${input.itemTitle} closed with another bidder in the lead.`,
      href: "/history",
      dedupeKey: `auction-lost:${input.auctionId}:${bidder.bidderId}`
    });
  }
}

async function createNotification(
  client: NotificationClient,
  input: NotificationInput
) {
  const data = {
    userId: input.userId,
    auctionId: input.auctionId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    dedupeKey: input.dedupeKey ?? null
  };

  if (!input.dedupeKey) {
    return client.notification.create({ data });
  }

  return client.notification.upsert({
    where: { dedupeKey: input.dedupeKey },
    update: {},
    create: data
  });
}
