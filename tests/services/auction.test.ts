import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createOrResumeUser } from "@/services/users";
import {
  buyOutAuction,
  closeExpiredAuctions,
  createAuction,
  ensureBotAuctionPool,
  listActiveAuctions,
  placeBid
} from "@/services/auctions";
import { adjustUserWallet, cancelAuction, setUserAdminStatus } from "@/services/admin";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  refreshUserNotifications
} from "@/services/notifications";
import {
  claimDailyReward,
  getDailyRewardState,
  REWARD_SCHEDULE
} from "@/services/rewards";
import {
  getUnderworldDashboard,
  settleCompletedLaundering,
  startLaundering
} from "@/services/underworld";

async function resetDatabase() {
  await prisma.dailyRewardClaim.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.moderationFlag.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.item.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
}

async function walletBalance(userId: string) {
  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId }
  });
  return wallet.balance;
}

describe("auction services", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates a new username account with exactly 1,000,000 coins once", async () => {
    const first = await createOrResumeUser("DriverOne");
    const second = await createOrResumeUser(" driverone ");

    expect(second.user.id).toBe(first.user.id);
    expect(await walletBalance(first.user.id)).toBe(1_000_000);

    const startingBonuses = await prisma.ledgerEntry.count({
      where: { userId: first.user.id, type: "STARTING_BONUS" }
    });
    expect(startingBonuses).toBe(1);
  });

  it("debits a bidder and records the highest bid", async () => {
    const seller = await createOrResumeUser("Seller");
    const bidder = await createOrResumeUser("Bidder");
    const auction = await createAuction(seller.user.id, {
      title: "Carbon Edition Track Car",
      category: "car",
      description: "Fast test asset",
      startingPrice: 100_000,
      buyoutPrice: 250_000
    });

    const updated = await placeBid(bidder.user.id, auction.id, 120_000);

    expect(updated.currentPrice).toBe(120_000);
    expect(updated.highestBidderId).toBe(bidder.user.id);
    expect(await walletBalance(bidder.user.id)).toBe(880_000);
  });

  it("refunds the previous highest bidder when they are outbid", async () => {
    const seller = await createOrResumeUser("Seller");
    const firstBidder = await createOrResumeUser("FirstBidder");
    const secondBidder = await createOrResumeUser("SecondBidder");
    const auction = await createAuction(seller.user.id, {
      title: "Waterfront Glass Villa",
      category: "house",
      description: "Modern house",
      startingPrice: 300_000,
      buyoutPrice: 900_000
    });

    await placeBid(firstBidder.user.id, auction.id, 350_000);
    const updated = await placeBid(secondBidder.user.id, auction.id, 400_000);

    expect(updated.currentPrice).toBe(400_000);
    expect(updated.highestBidderId).toBe(secondBidder.user.id);
    expect(await walletBalance(firstBidder.user.id)).toBe(1_000_000);
    expect(await walletBalance(secondBidder.user.id)).toBe(600_000);
  });

  it("notifies the previous leader when they are outbid", async () => {
    const seller = await createOrResumeUser("Seller");
    const firstBidder = await createOrResumeUser("FirstBidder");
    const secondBidder = await createOrResumeUser("SecondBidder");
    const auction = await createAuction(seller.user.id, {
      title: "Coastal Glass Villa",
      category: "house",
      description: "Modern house",
      startingPrice: 300_000,
      buyoutPrice: 900_000
    });

    await placeBid(firstBidder.user.id, auction.id, 350_000);
    await placeBid(secondBidder.user.id, auction.id, 400_000);

    const notifications = await listNotifications(firstBidder.user.id);
    expect(notifications.unreadCount).toBe(1);
    expect(notifications.items[0]).toMatchObject({
      type: "OUTBID",
      title: "You were outbid",
      auctionId: auction.id
    });
    expect(notifications.items[0].body).toContain("Coastal Glass Villa");
  });

  it("buyout refunds the current bidder, debits buyer, credits seller, and settles auction", async () => {
    const seller = await createOrResumeUser("Seller");
    const bidder = await createOrResumeUser("Bidder");
    const buyer = await createOrResumeUser("Buyer");
    const auction = await createAuction(seller.user.id, {
      title: "Solaris 48 Sport Yacht",
      category: "boat",
      description: "Sport yacht",
      startingPrice: 200_000,
      buyoutPrice: 600_000
    });

    await placeBid(bidder.user.id, auction.id, 250_000);
    const settled = await buyOutAuction(buyer.user.id, auction.id);

    expect(settled.status).toBe("SETTLED");
    expect(settled.currentPrice).toBe(600_000);
    expect(settled.highestBidderId).toBe(buyer.user.id);
    expect(await walletBalance(bidder.user.id)).toBe(1_000_000);
    expect(await walletBalance(buyer.user.id)).toBe(400_000);
    expect(await walletBalance(seller.user.id)).toBe(1_600_000);
  });

  it("closing an expired auction with a bid credits the seller exactly once", async () => {
    const seller = await createOrResumeUser("Seller");
    const bidder = await createOrResumeUser("Bidder");
    const auction = await createAuction(seller.user.id, {
      title: "Downtown Penthouse Deed",
      category: "asset",
      description: "Penthouse deed",
      startingPrice: 350_000,
      buyoutPrice: 800_000,
      endsAt: new Date(Date.now() - 1_000)
    });

    await placeBid(bidder.user.id, auction.id, 400_000, {
      allowExpiredForTest: true
    });
    await closeExpiredAuctions();
    await closeExpiredAuctions();

    const closed = await prisma.auction.findUniqueOrThrow({
      where: { id: auction.id }
    });
    expect(closed.status).toBe("SETTLED");
    expect(await walletBalance(seller.user.id)).toBe(1_400_000);
  });

  it("notifies winner, seller, and losing bidders when an auction closes", async () => {
    const seller = await createOrResumeUser("Seller");
    const firstBidder = await createOrResumeUser("FirstBidder");
    const secondBidder = await createOrResumeUser("SecondBidder");
    const auction = await createAuction(seller.user.id, {
      title: "Museum-Grade Fossil Gallery",
      category: "collectible",
      description: "Private gallery display",
      startingPrice: 120_000,
      buyoutPrice: 800_000,
      endsAt: new Date(Date.now() - 1_000)
    });

    await placeBid(firstBidder.user.id, auction.id, 180_000, {
      allowExpiredForTest: true
    });
    await placeBid(secondBidder.user.id, auction.id, 220_000, {
      allowExpiredForTest: true
    });
    await closeExpiredAuctions();

    await expect(listNotifications(secondBidder.user.id)).resolves.toMatchObject({
      items: [expect.objectContaining({ type: "AUCTION_WON", auctionId: auction.id })]
    });
    await expect(listNotifications(seller.user.id)).resolves.toMatchObject({
      items: [expect.objectContaining({ type: "AUCTION_SOLD", auctionId: auction.id })]
    });
    await expect(listNotifications(firstBidder.user.id)).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ type: "AUCTION_LOST", auctionId: auction.id })
      ])
    });
  });

  it("creates a single ending-soon notification for watched auctions", async () => {
    const seller = await createOrResumeUser("Seller");
    const bidder = await createOrResumeUser("Bidder");
    const now = new Date(Date.now() + 60_000);
    const auction = await createAuction(seller.user.id, {
      title: "Long-Range Private Jet",
      category: "aircraft",
      description: "Intercontinental cabin",
      startingPrice: 300_000,
      buyoutPrice: 900_000,
      endsAt: new Date(now.getTime() + 8 * 60_000)
    });

    await placeBid(bidder.user.id, auction.id, 350_000);
    await refreshUserNotifications(bidder.user.id, now);
    await refreshUserNotifications(bidder.user.id, now);

    const notifications = await listNotifications(bidder.user.id, { skipRefresh: true });
    expect(
      notifications.items.filter((notification) => notification.type === "AUCTION_ENDING_SOON")
    ).toHaveLength(1);
    expect(notifications.items[0]).toMatchObject({
      type: "AUCTION_ENDING_SOON",
      auctionId: auction.id
    });
  });

  it("marks individual and all notifications as read", async () => {
    const seller = await createOrResumeUser("Seller");
    const bidder = await createOrResumeUser("Bidder");
    const now = new Date(Date.now() + 60_000);
    const auction = await createAuction(seller.user.id, {
      title: "Carbon Ocean Racing Sailboat",
      category: "boat",
      description: "Ocean-ready carbon rigging",
      startingPrice: 300_000,
      buyoutPrice: 900_000,
      endsAt: new Date(now.getTime() + 8 * 60_000)
    });

    await placeBid(bidder.user.id, auction.id, 350_000);
    await refreshUserNotifications(bidder.user.id, now);

    const initial = await listNotifications(bidder.user.id, { skipRefresh: true });
    expect(initial.unreadCount).toBe(1);

    await markNotificationRead(bidder.user.id, initial.items[0].id);
    const afterOne = await listNotifications(bidder.user.id, { skipRefresh: true });
    expect(afterOne.unreadCount).toBe(0);
    expect(afterOne.items[0].readAt).not.toBeNull();

    await refreshUserNotifications(seller.user.id, now);
    expect(
      await listNotifications(seller.user.id, { skipRefresh: true })
    ).toMatchObject({ unreadCount: 1 });
    await markAllNotificationsRead(seller.user.id);
    expect(
      await listNotifications(seller.user.id, { skipRefresh: true })
    ).toMatchObject({ unreadCount: 0 });
  });

  it("rejects a bid below the current price", async () => {
    const seller = await createOrResumeUser("Seller");
    const bidder = await createOrResumeUser("Bidder");
    const auction = await createAuction(seller.user.id, {
      title: "Private Hangar Lease",
      category: "asset",
      description: "Hangar lease",
      startingPrice: 210_000,
      buyoutPrice: 500_000
    });

    await expect(placeBid(bidder.user.id, auction.id, 200_000)).rejects.toThrow(
      "Bid must be higher than the current price"
    );
  });

  it("replenishes an empty market with random active bot auctions", async () => {
    await ensureBotAuctionPool({ targetActive: 6 });

    const auctions = await prisma.auction.findMany({
      where: { status: "ACTIVE" },
      include: { item: true, seller: true }
    });

    expect(auctions).toHaveLength(6);
    expect(new Set(auctions.map((auction) => auction.item.title)).size).toBe(6);
    expect(auctions.every((auction) => auction.seller.isBot)).toBe(true);
    expect(
      auctions.every((auction) =>
        [
          "aircraft",
          "asset",
          "boat",
          "building",
          "car",
          "helicopter",
          "house",
          "submarine"
        ].includes(auction.item.category)
      )
    ).toBe(true);
    expect(auctions.every((auction) => auction.item.imageUrl)).toBe(true);
    expect(auctions.every((auction) => auction.endsAt > new Date())).toBe(true);
  });

  it("keeps overworld and underworld bot auction pools separate", async () => {
    await ensureBotAuctionPool({ market: "OVERWORLD", targetActive: 4 });
    await ensureBotAuctionPool({ market: "UNDERWORLD", targetActive: 10 });

    const overworld = await listActiveAuctions("OVERWORLD");
    const underworld = await listActiveAuctions("UNDERWORLD");

    expect(overworld).toHaveLength(4);
    expect(underworld).toHaveLength(10);
    expect(overworld.every((auction) => auction.market === "OVERWORLD")).toBe(true);
    expect(underworld.every((auction) => auction.market === "UNDERWORLD")).toBe(true);
    expect(
      underworld.every((auction) =>
        [
          "aircraft",
          "boat",
          "car",
          "collectible",
          "helicopter",
          "motorcycle",
          "rail",
          "truck"
        ].includes(auction.item.category)
      )
    ).toBe(true);
    expect(
      underworld.every((auction) =>
        [
          "AshCircuit",
          "BlackDock",
          "CipherYard",
          "CrimsonLot",
          "GhostTitle",
          "IronVeil",
          "NocturneDesk",
          "NullBroker",
          "RedLedger",
          "VantaRoom"
        ].includes(auction.seller.username)
      )
    ).toBe(true);
    expect(
      underworld.every(
        (auction) =>
          auction.item.estimatedCleanValue !== null &&
          auction.buyoutPrice < auction.item.estimatedCleanValue
      )
    ).toBe(true);
    expect(
      underworld.every(
        (auction) =>
          auction.endsAt.getTime() - Date.now() >= 17 * 60 * 1000 &&
          auction.endsAt.getTime() - Date.now() <= 46 * 60 * 1000
      )
    ).toBe(true);

    await ensureBotAuctionPool({ market: "UNDERWORLD", targetActive: 6 });
    expect(await listActiveAuctions("UNDERWORLD")).toHaveLength(6);
  });

  it("moves underworld purchases through laundering before they become clean assets", async () => {
    await ensureBotAuctionPool({ market: "UNDERWORLD", targetActive: 1 });
    const buyer = await createOrResumeUser("ShadowBuyer");
    await prisma.wallet.update({
      where: { userId: buyer.user.id },
      data: { balance: 100_000_000 }
    });
    const [auction] = await listActiveAuctions("UNDERWORLD");

    const bought = await buyOutAuction(buyer.user.id, auction.id);
    expect(bought.market).toBe("UNDERWORLD");

    const dirtyDashboard = await getUnderworldDashboard(
      buyer.user.id,
      new Date("2026-06-27T12:00:00.000Z")
    );
    expect(dirtyDashboard.stash).toHaveLength(1);
    expect(dirtyDashboard.laundering).toHaveLength(0);

    const laundering = await startLaundering({
      userId: buyer.user.id,
      auctionId: bought.id,
      now: new Date("2026-06-27T12:00:00.000Z")
    });
    expect(laundering.transferStatus).toBe("LAUNDERING");
    expect(laundering.launderingFee).toBeGreaterThan(0);

    const inProgress = await getUnderworldDashboard(
      buyer.user.id,
      new Date("2026-06-27T12:30:00.000Z")
    );
    expect(inProgress.stash).toHaveLength(0);
    expect(inProgress.laundering).toHaveLength(1);

    await settleCompletedLaundering(
      buyer.user.id,
      new Date("2026-06-27T20:00:00.000Z")
    );
    const cleaned = await prisma.auction.findUniqueOrThrow({
      where: { id: bought.id }
    });
    expect(cleaned.transferStatus).toBe("CLEANED");
  });

  it("admin wallet adjustment updates balance and records moderation context", async () => {
    const admin = await createOrResumeUser("Admin");
    const user = await createOrResumeUser("Collector");

    await adjustUserWallet({
      userId: user.user.id,
      amount: 250_000,
      reason: "Support credit correction",
      adminId: admin.user.id
    });

    expect(await walletBalance(user.user.id)).toBe(1_250_000);
    await expect(
      prisma.ledgerEntry.findFirstOrThrow({
        where: { userId: user.user.id, type: "ADMIN_WALLET_ADJUSTMENT" }
      })
    ).resolves.toMatchObject({ amount: 250_000 });
    await expect(
      prisma.moderationFlag.findFirstOrThrow({
        where: { userId: user.user.id, kind: "WALLET_ADJUSTMENT" }
      })
    ).resolves.toMatchObject({ status: "RESOLVED", createdById: admin.user.id });
  });

  it("admin role management grants and revokes other admins with an audit record", async () => {
    const admin = await createOrResumeUser("Admin");
    const target = await createOrResumeUser("TrustedCollector");

    await setUserAdminStatus({
      userId: target.user.id,
      isAdmin: true,
      adminId: admin.user.id
    });

    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: target.user.id } })
    ).resolves.toMatchObject({ isAdmin: true });
    await expect(
      prisma.moderationFlag.findFirstOrThrow({
        where: { userId: target.user.id, kind: "ADMIN_ROLE_UPDATED" }
      })
    ).resolves.toMatchObject({
      status: "RESOLVED",
      createdById: admin.user.id,
      reason: "Admin access granted"
    });

    await setUserAdminStatus({
      userId: target.user.id,
      isAdmin: false,
      adminId: admin.user.id
    });

    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: target.user.id } })
    ).resolves.toMatchObject({ isAdmin: false });
  });

  it("admin role management blocks admins from revoking themselves", async () => {
    const admin = await createOrResumeUser("Admin");

    await expect(
      setUserAdminStatus({
        userId: admin.user.id,
        isAdmin: false,
        adminId: admin.user.id
      })
    ).rejects.toThrow("Admins cannot revoke their own admin access");
  });

  it("allows one daily reward claim and blocks duplicate same-day claims", async () => {
    const user = await createOrResumeUser("DailyCollector");
    const now = new Date("2026-06-26T14:00:00.000Z");

    const claim = await claimDailyReward(user.user.id, now);

    expect(claim.streakDay).toBe(1);
    expect(claim.creditAmount).toBe(REWARD_SCHEDULE[0].credits);
    expect(await walletBalance(user.user.id)).toBe(1_000_000 + REWARD_SCHEDULE[0].credits);
    await expect(claimDailyReward(user.user.id, now)).rejects.toThrow(
      "Daily reward already claimed"
    );
  });

  it("advances consecutive daily reward streaks and resets after a missed day", async () => {
    const user = await createOrResumeUser("StreakCollector");

    await claimDailyReward(user.user.id, new Date("2026-06-20T14:00:00.000Z"));
    const second = await claimDailyReward(
      user.user.id,
      new Date("2026-06-21T14:00:00.000Z")
    );
    const reset = await claimDailyReward(
      user.user.id,
      new Date("2026-06-23T14:00:00.000Z")
    );

    expect(second.streakDay).toBe(2);
    expect(reset.streakDay).toBe(1);
  });

  it("mints a portfolio reward asset on the seventh consecutive claim", async () => {
    const user = await createOrResumeUser("VaultCollector");

    for (let offset = 0; offset < 6; offset += 1) {
      await claimDailyReward(
        user.user.id,
        new Date(Date.UTC(2026, 5, 20 + offset, 14))
      );
    }

    const seventh = await claimDailyReward(
      user.user.id,
      new Date(Date.UTC(2026, 5, 26, 14))
    );

    expect(seventh.streakDay).toBe(7);
    expect(seventh.assetAuctionId).toBeTruthy();
    const rewardAuction = await prisma.auction.findUniqueOrThrow({
      where: { id: seventh.assetAuctionId ?? "" },
      include: { item: true }
    });
    expect(rewardAuction.status).toBe("SETTLED");
    expect(rewardAuction.highestBidderId).toBe(user.user.id);
    expect(rewardAuction.item.title).toBe("Snipe Seven-Day Vault Key");
    expect(rewardAuction.buyoutPrice).toBe(5_000_000);
  });

  it("reports daily reward calendar state for the next claim", async () => {
    const user = await createOrResumeUser("CalendarCollector");
    const today = new Date("2026-06-26T14:00:00.000Z");

    await claimDailyReward(user.user.id, new Date("2026-06-25T14:00:00.000Z"));
    const state = await getDailyRewardState(user.user.id, today);

    expect(state.claimedToday).toBe(false);
    expect(state.nextStreakDay).toBe(2);
    expect(state.schedule).toHaveLength(7);
    expect(state.schedule[1]).toMatchObject({
      day: 2,
      credits: REWARD_SCHEDULE[1].credits,
      isNext: true
    });
  });

  it("admin listing removal cancels auction and refunds the held bid", async () => {
    const admin = await createOrResumeUser("Admin");
    const seller = await createOrResumeUser("Seller");
    const bidder = await createOrResumeUser("Bidder");
    const auction = await createAuction(seller.user.id, {
      title: "Questionable Trophy Car",
      category: "car",
      description: "Needs review",
      startingPrice: 100_000,
      buyoutPrice: 300_000
    });

    await placeBid(bidder.user.id, auction.id, 150_000);
    const removed = await cancelAuction({
      auctionId: auction.id,
      adminId: admin.user.id,
      reason: "Listing violated marketplace standards",
      removeListing: true
    });

    expect(removed.status).toBe("REMOVED");
    expect(await walletBalance(bidder.user.id)).toBe(1_000_000);
    await expect(
      prisma.item.findUniqueOrThrow({ where: { id: auction.itemId } })
    ).resolves.toMatchObject({
      title: "[Removed] Questionable Trophy Car",
      imageUrl: null
    });
    await expect(
      prisma.moderationFlag.findFirstOrThrow({
        where: { auctionId: auction.id, kind: "LISTING_REMOVED" }
      })
    ).resolves.toMatchObject({ severity: "HIGH", createdById: admin.user.id });
  });
});
