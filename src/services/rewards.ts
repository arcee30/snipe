import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serviceError } from "@/lib/auction-errors";
import { notifyRewardAsset, notifyWalletCredit } from "@/services/notifications";

type Tx = Prisma.TransactionClient;

export const REWARD_SCHEDULE = [
  { day: 1, credits: 50_000 },
  { day: 2, credits: 75_000 },
  { day: 3, credits: 125_000 },
  { day: 4, credits: 200_000 },
  { day: 5, credits: 350_000 },
  { day: 6, credits: 550_000 },
  {
    day: 7,
    credits: 900_000,
    asset: {
      title: "Snipe Seven-Day Vault Key",
      category: "collectible",
      description:
        "A numbered vault key reserved for members who complete a full seven-day market streak.",
      imageUrl: "/auction-assets/generated/collector-vault.png",
      estimatedValue: 5_000_000
    }
  }
] as const;

const REWARD_SELLER_USERNAME = "SnipeRewards";

export async function getDailyRewardState(userId: string, now = new Date()) {
  const todayKey = dateKey(now);
  const lastClaim = await prisma.dailyRewardClaim.findFirst({
    where: { userId },
    orderBy: { claimDate: "desc" }
  });
  const claimedToday = lastClaim?.claimDate === todayKey;
  const nextStreakDay = claimedToday
    ? lastClaim.streakDay
    : nextStreakDayForLastClaim(lastClaim, todayKey);

  return {
    claimedToday,
    nextStreakDay,
    lastClaimDate: lastClaim?.claimDate ?? null,
    schedule: REWARD_SCHEDULE.map((reward) => ({
      day: reward.day,
      credits: reward.credits,
      asset: "asset" in reward ? reward.asset : null,
      isClaimedInCurrentStreak:
        Boolean(lastClaim) && reward.day <= lastClaim!.streakDay && !streakExpired(lastClaim!, todayKey),
      isNext: reward.day === nextStreakDay
    }))
  };
}

export async function claimDailyReward(userId: string, now = new Date()) {
  const todayKey = dateKey(now);

  return prisma.$transaction(async (tx) => {
    const [user, wallet, lastClaim, existingClaim] = await Promise.all([
      tx.user.findUnique({ where: { id: userId } }),
      tx.wallet.findUnique({ where: { userId } }),
      tx.dailyRewardClaim.findFirst({
        where: { userId },
        orderBy: { claimDate: "desc" }
      }),
      tx.dailyRewardClaim.findUnique({
        where: {
          userId_claimDate: {
            userId,
            claimDate: todayKey
          }
        }
      })
    ]);

    if (!user) {
      throw serviceError("User not found", "USER_NOT_FOUND", 404);
    }

    if (!wallet) {
      throw serviceError("Wallet not found", "WALLET_NOT_FOUND", 404);
    }

    if (existingClaim) {
      throw serviceError("Daily reward already claimed", "DAILY_REWARD_ALREADY_CLAIMED");
    }

    const streakDay = nextStreakDayForLastClaim(lastClaim, todayKey);
    const reward = REWARD_SCHEDULE[streakDay - 1];

    await tx.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: reward.credits
        },
        ledgerEntries: {
          create: {
            userId,
            amount: reward.credits,
            type: "DAILY_REWARD_CREDIT",
            description: `Day ${reward.day} daily reward`
          }
        }
      }
    });

    await notifyWalletCredit(tx, {
      userId,
      amount: reward.credits,
      reason: `day ${reward.day} daily reward`
    });

    const assetAuctionId = "asset" in reward
      ? await mintSevenDayRewardAsset(tx, userId, now)
      : null;

    const claim = await tx.dailyRewardClaim.create({
      data: {
        userId,
        claimDate: todayKey,
        streakDay,
        creditAmount: reward.credits,
        assetAuctionId
      }
    });

    return claim;
  });
}

async function mintSevenDayRewardAsset(tx: Tx, userId: string, now: Date) {
  const reward = REWARD_SCHEDULE[6];
  const seller = await ensureRewardSeller(tx);
  const item = await tx.item.create({
    data: {
      title: reward.asset.title,
      category: reward.asset.category,
      description: reward.asset.description,
      imageUrl: reward.asset.imageUrl,
      createdByUserId: seller.id,
      isSeeded: true
    }
  });
  const auction = await tx.auction.create({
    data: {
      itemId: item.id,
      sellerId: seller.id,
      startingPrice: 0,
      currentPrice: 0,
      buyoutPrice: reward.asset.estimatedValue,
      highestBidderId: userId,
      status: "SETTLED",
      endsAt: now
    }
  });

  await notifyRewardAsset(tx, {
    userId,
    auctionId: auction.id,
    itemTitle: reward.asset.title,
    estimatedValue: reward.asset.estimatedValue
  });

  return auction.id;
}

async function ensureRewardSeller(tx: Tx) {
  const seller = await tx.user.upsert({
    where: { username: REWARD_SELLER_USERNAME },
    update: { isBot: true },
    create: {
      username: REWARD_SELLER_USERNAME,
      isBot: true,
      wallet: {
        create: {
          balance: 0
        }
      }
    },
    include: { wallet: true }
  });

  if (!seller.wallet) {
    await tx.wallet.create({
      data: {
        userId: seller.id,
        balance: 0
      }
    });
  }

  return seller;
}

function nextStreakDayForLastClaim(
  lastClaim: { claimDate: string; streakDay: number } | null,
  todayKey: string
) {
  if (!lastClaim || daysBetween(lastClaim.claimDate, todayKey) !== 1) {
    return 1;
  }

  return lastClaim.streakDay >= 7 ? 1 : lastClaim.streakDay + 1;
}

function streakExpired(
  lastClaim: { claimDate: string; streakDay: number },
  todayKey: string
) {
  return daysBetween(lastClaim.claimDate, todayKey) > 1;
}

function daysBetween(leftKey: string, rightKey: string) {
  return Math.round(
    (Date.parse(`${rightKey}T00:00:00.000Z`) -
      Date.parse(`${leftKey}T00:00:00.000Z`)) /
      86_400_000
  );
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
