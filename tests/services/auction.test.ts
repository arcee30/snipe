import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createOrResumeUser } from "@/services/users";
import {
  buyOutAuction,
  closeExpiredAuctions,
  createAuction,
  ensureBotAuctionPool,
  placeBid
} from "@/services/auctions";

async function resetDatabase() {
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
});
