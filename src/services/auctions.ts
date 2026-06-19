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
const BOT_STARTING_BALANCE = 1_000_000;
const BOT_USERNAMES = [
  "VelocityVault",
  "HarborHouse",
  "ApexImports",
  "LuxeLiquidators",
  "SummitReserve",
  "MarinaPrime",
  "EstateCircuit",
  "NightfallBids"
];

const BOT_AUCTION_TEMPLATES = [
  ["2026 Carbon Apex R", "car", "A black carbon track special with aero upgrades.", 190_000, 360_000],
  ["V12 Heritage Coupe", "car", "A collector-grade grand tourer with concours appeal.", 240_000, 520_000],
  ["Electric Hyper Saloon", "car", "A silent luxury rocket with rare launch trim.", 165_000, 390_000],
  ["Rally Legend RS", "car", "A limited gravel-spec icon with factory upgrades.", 130_000, 285_000],
  ["Midnight Sprint GT", "car", "A stealth-finished street car tuned for weekend escapes.", 155_000, 330_000],
  ["Coastal Glass Villa", "house", "A waterfront estate with dock access and sunset frontage.", 520_000, 950_000],
  ["Cliffside Modern Retreat", "house", "A cantilevered view property above a private cove.", 610_000, 1_050_000],
  ["Downtown Sky Penthouse", "house", "A skyline residence with private elevator access.", 430_000, 875_000],
  ["Desert Courtyard Estate", "house", "A quiet luxury compound built around a private pool.", 390_000, 740_000],
  ["Marina Owner's Loft", "house", "A harbor-facing loft with yacht club proximity.", 360_000, 690_000],
  ["Solaris 48 Sport Yacht", "boat", "A twin-engine sport yacht with upgraded navigation systems.", 260_000, 620_000],
  ["Azure 62 Flybridge", "boat", "A long-range flybridge cruiser with entertainment deck.", 410_000, 880_000],
  ["Blackline Tender X", "boat", "A fast luxury tender with carbon trim and shallow draft.", 145_000, 310_000],
  ["Harborline Weekender", "boat", "A polished day cruiser ready for coastal runs.", 180_000, 420_000],
  ["Aurelia Catamaran Share", "boat", "A premium fractional stake in a luxury catamaran.", 220_000, 510_000],
  ["Private Hangar Lease", "asset", "A premium long-term lease at a private airfield.", 210_000, 500_000],
  ["Founder Club Membership", "asset", "A transferable membership with exclusive venue access.", 95_000, 240_000],
  ["Historic Garage Unit", "asset", "A secure collector garage in a high-demand district.", 175_000, 380_000],
  ["Track Day License Pack", "asset", "A bundled license package for private circuit access.", 120_000, 275_000],
  ["Marina Berth Contract", "asset", "A premium berth allocation in a sold-out marina.", 160_000, 360_000],
  ["Airport Lounge Charter Credit", "asset", "A flexible charter credit package for private travel.", 140_000, 320_000],
  ["Collector Storage Vault", "asset", "A climate-controlled vault contract for rare assets.", 115_000, 260_000]
] satisfies Array<[string, string, string, number, number]>;

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

export async function ensureBotAuctionPool({
  targetActive = 8
}: { targetActive?: number } = {}) {
  const activeBotAuctions = await prisma.auction.findMany({
    where: {
      status: "ACTIVE",
      seller: {
        isBot: true
      }
    },
    include: {
      item: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const missingCount = Math.max(0, targetActive - activeBotAuctions.length);

  if (missingCount === 0) {
    return;
  }

  const bots = await ensureBotUsers();
  const activeTitles = new Set(
    activeBotAuctions.map((auction) => auction.item.title)
  );
  const templates = shuffledTemplates().filter(
    ([title]) => !activeTitles.has(title)
  );

  for (let index = 0; index < missingCount; index += 1) {
    const template = templates[index % templates.length];
    const [title, category, description, startingPrice, buyoutPrice] = template;
    const seller = bots[index % bots.length];

    await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          title,
          category,
          description,
          createdByUserId: seller.id,
          isSeeded: true
        }
      });

      await tx.auction.create({
        data: {
          itemId: item.id,
          sellerId: seller.id,
          startingPrice,
          currentPrice: startingPrice,
          buyoutPrice,
          endsAt: new Date(Date.now() + ONE_HOUR_MS)
        }
      });
    });
  }
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

async function ensureBotUsers() {
  const bots = [];

  for (const username of BOT_USERNAMES) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { isBot: true },
      create: {
        username,
        isBot: true,
        wallet: {
          create: {
            balance: BOT_STARTING_BALANCE
          }
        }
      },
      include: {
        wallet: true
      }
    });

    if (!user.wallet) {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: BOT_STARTING_BALANCE
        }
      });
    }

    bots.push(user);
  }

  return bots;
}

function shuffledTemplates() {
  return [...BOT_AUCTION_TEMPLATES].sort(() => Math.random() - 0.5);
}
