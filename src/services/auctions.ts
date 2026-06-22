import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serviceError } from "@/lib/auction-errors";
import { assertPositiveCoins } from "@/lib/money";

type Tx = Prisma.TransactionClient;

export type CreateAuctionInput = {
  title: string;
  category: string;
  description: string;
  imageUrl?: string;
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

type BotAuctionTemplate = {
  title: string;
  category: string;
  description: string;
  startingPrice: number;
  buyoutPrice: number;
  imageUrl: string;
};

const IMAGE = {
  blackRacecar: "/auction-assets/car.png",
  redHypercar: "/auction-assets/generated/hypercar-red-showroom.png",
  classicCoupe: "/auction-assets/generated/classic-silver-coupe.png",
  yachtMarina: "/auction-assets/boat.png",
  racingYacht: "/auction-assets/generated/offshore-racing-yacht.png",
  glassVilla: "/auction-assets/house.png",
  islandVilla: "/auction-assets/generated/island-glass-villa.png",
  penthouse: "/auction-assets/generated/skyscraper-penthouse.png",
  jet: "/auction-assets/generated/private-jet-hangar.png",
  helicopter: "/auction-assets/generated/helicopter-rooftop.png",
  submarine: "/auction-assets/generated/private-submarine.png",
  collectorVault: "/auction-assets/generated/collector-vault.png",
  asset: "/auction-assets/asset.png"
} as const;

const BOT_AUCTION_TEMPLATES = [
  {
    title: "2026 Carbon Apex R",
    category: "car",
    description: "A black carbon track special with aero upgrades.",
    startingPrice: 190_000,
    buyoutPrice: 360_000,
    imageUrl: IMAGE.blackRacecar
  },
  {
    title: "Rosso Veloce Hypercar",
    category: "car",
    description: "A red showroom hypercar with launch trim and collector mileage.",
    startingPrice: 820_000,
    buyoutPrice: 1_650_000,
    imageUrl: IMAGE.redHypercar
  },
  {
    title: "V12 Heritage Coupe",
    category: "car",
    description: "A collector-grade silver grand tourer with concours appeal.",
    startingPrice: 440_000,
    buyoutPrice: 980_000,
    imageUrl: IMAGE.classicCoupe
  },
  {
    title: "Electric Hyper Saloon",
    category: "car",
    description: "An electric performance saloon with limited launch trim.",
    startingPrice: 260_000,
    buyoutPrice: 540_000,
    imageUrl: IMAGE.redHypercar
  },
  {
    title: "Rally Legend RS",
    category: "car",
    description: "A limited gravel-spec icon with factory upgrades.",
    startingPrice: 130_000,
    buyoutPrice: 285_000,
    imageUrl: IMAGE.blackRacecar
  },
  {
    title: "Midnight Sprint GT",
    category: "car",
    description: "A stealth-finished street car tuned for weekend escapes.",
    startingPrice: 155_000,
    buyoutPrice: 330_000,
    imageUrl: IMAGE.classicCoupe
  },
  {
    title: "Coastal Glass Villa",
    category: "house",
    description: "A waterfront estate with dock access and sunset frontage.",
    startingPrice: 620_000,
    buyoutPrice: 1_250_000,
    imageUrl: IMAGE.glassVilla
  },
  {
    title: "Private Island Glass Estate",
    category: "house",
    description: "A tropical shoreline compound with infinity pool and private dock.",
    startingPrice: 2_400_000,
    buyoutPrice: 4_850_000,
    imageUrl: IMAGE.islandVilla
  },
  {
    title: "Cliffside Modern Retreat",
    category: "house",
    description: "A cantilevered view property above a private cove.",
    startingPrice: 810_000,
    buyoutPrice: 1_650_000,
    imageUrl: IMAGE.islandVilla
  },
  {
    title: "Downtown Sky Penthouse",
    category: "building",
    description: "A full-floor glass penthouse with private terrace and skyline views.",
    startingPrice: 1_350_000,
    buyoutPrice: 2_900_000,
    imageUrl: IMAGE.penthouse
  },
  {
    title: "Boutique Tower Equity Slice",
    category: "building",
    description: "A premium minority stake in a trophy mixed-use tower.",
    startingPrice: 2_100_000,
    buyoutPrice: 4_500_000,
    imageUrl: IMAGE.penthouse
  },
  {
    title: "Desert Courtyard Estate",
    category: "house",
    description: "A quiet luxury compound built around a private pool.",
    startingPrice: 490_000,
    buyoutPrice: 940_000,
    imageUrl: IMAGE.glassVilla
  },
  {
    title: "Solaris 48 Sport Yacht",
    category: "boat",
    description: "A twin-engine sport yacht with upgraded navigation systems.",
    startingPrice: 260_000,
    buyoutPrice: 620_000,
    imageUrl: IMAGE.yachtMarina
  },
  {
    title: "Azure 62 Flybridge",
    category: "boat",
    description: "A long-range flybridge cruiser with entertainment deck.",
    startingPrice: 610_000,
    buyoutPrice: 1_280_000,
    imageUrl: IMAGE.yachtMarina
  },
  {
    title: "Bluewater Offshore 88",
    category: "boat",
    description: "A fast offshore yacht built for high-speed coastal runs.",
    startingPrice: 920_000,
    buyoutPrice: 1_950_000,
    imageUrl: IMAGE.racingYacht
  },
  {
    title: "Aurelia Catamaran Share",
    category: "boat",
    description: "A premium fractional stake in a luxury catamaran.",
    startingPrice: 220_000,
    buyoutPrice: 510_000,
    imageUrl: IMAGE.yachtMarina
  },
  {
    title: "Rooftop Executive Helicopter",
    category: "helicopter",
    description: "A private twin-engine helicopter staged for city-to-resort transfers.",
    startingPrice: 780_000,
    buyoutPrice: 1_750_000,
    imageUrl: IMAGE.helicopter
  },
  {
    title: "Nightfall VIP Rotorcraft",
    category: "helicopter",
    description: "A matte black charter-ready helicopter with executive cabin fitout.",
    startingPrice: 1_050_000,
    buyoutPrice: 2_350_000,
    imageUrl: IMAGE.helicopter
  },
  {
    title: "Long-Range Private Jet",
    category: "aircraft",
    description: "A hangared intercontinental jet with premium cabin configuration.",
    startingPrice: 2_250_000,
    buyoutPrice: 5_000_000,
    imageUrl: IMAGE.jet
  },
  {
    title: "Private Hangar Lease",
    category: "aircraft",
    description: "A premium long-term lease at a private airfield.",
    startingPrice: 310_000,
    buyoutPrice: 725_000,
    imageUrl: IMAGE.jet
  },
  {
    title: "Marina Submersible One",
    category: "submarine",
    description: "A compact private submersible for rare coastal exploration.",
    startingPrice: 1_450_000,
    buyoutPrice: 3_200_000,
    imageUrl: IMAGE.submarine
  },
  {
    title: "Abyssal Explorer Share",
    category: "submarine",
    description: "A fractional stake in a luxury submersible expedition platform.",
    startingPrice: 980_000,
    buyoutPrice: 2_150_000,
    imageUrl: IMAGE.submarine
  },
  {
    title: "Collector Storage Vault",
    category: "asset",
    description: "A climate-controlled vault contract for rare cars and art.",
    startingPrice: 380_000,
    buyoutPrice: 860_000,
    imageUrl: IMAGE.collectorVault
  },
  {
    title: "Historic Garage Unit",
    category: "asset",
    description: "A secure collector garage in a high-demand district.",
    startingPrice: 225_000,
    buyoutPrice: 480_000,
    imageUrl: IMAGE.collectorVault
  },
  {
    title: "Founder Club Membership",
    category: "asset",
    description: "A transferable membership with exclusive venue access.",
    startingPrice: 95_000,
    buyoutPrice: 240_000,
    imageUrl: IMAGE.asset
  },
  {
    title: "Marina Berth Contract",
    category: "asset",
    description: "A premium berth allocation in a sold-out marina.",
    startingPrice: 210_000,
    buyoutPrice: 460_000,
    imageUrl: IMAGE.yachtMarina
  }
] satisfies BotAuctionTemplate[];

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
      imageUrl: input.imageUrl?.trim() || null,
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
  targetActive = 20
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

  await repairSeededAuctionImages(activeBotAuctions);

  const missingCount = Math.max(0, targetActive - activeBotAuctions.length);

  if (missingCount === 0) {
    return;
  }

  const bots = await ensureBotUsers();
  const activeTitles = new Set(
    activeBotAuctions.map((auction) => auction.item.title)
  );
  const templates = templatesForFill(activeTitles);

  for (let index = 0; index < missingCount; index += 1) {
    const template = templates[index % templates.length];
    const seller = bots[index % bots.length];

    await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          title: template.title,
          category: template.category,
          description: template.description,
          imageUrl: template.imageUrl,
          createdByUserId: seller.id,
          isSeeded: true
        }
      });

      await tx.auction.create({
        data: {
          itemId: item.id,
          sellerId: seller.id,
          startingPrice: template.startingPrice,
          currentPrice: template.startingPrice,
          buyoutPrice: template.buyoutPrice,
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

function templatesForFill(activeTitles: Set<string>) {
  const featuredTitles = new Set([
    "Long-Range Private Jet",
    "Private Island Glass Estate",
    "Boutique Tower Equity Slice",
    "Marina Submersible One"
  ]);
  const featured = BOT_AUCTION_TEMPLATES.filter(
    (template) => featuredTitles.has(template.title) && !activeTitles.has(template.title)
  );
  const random = shuffledTemplates().filter(
    (template) => !featuredTitles.has(template.title) && !activeTitles.has(template.title)
  );

  return [...featured, ...random];
}

async function repairSeededAuctionImages(
  auctions: Array<{
    id: string;
    highestBidderId: string | null;
    item: { id: string; title: string; category: string; imageUrl: string | null };
  }>
) {
  const templatesByTitle = new Map(
    BOT_AUCTION_TEMPLATES.map((template) => [template.title, template])
  );

  await Promise.all(
    auctions.map(async (auction) => {
      const template = templatesByTitle.get(auction.item.title);
      const imageUrl = template?.imageUrl ?? imageForCategory(auction.item.category);

      if (!auction.item.imageUrl || template) {
        await prisma.item.update({
          where: { id: auction.item.id },
          data: {
            category: template?.category ?? auction.item.category,
            description: template?.description,
            imageUrl
          }
        });
      }

      if (template && !auction.highestBidderId) {
        await prisma.auction.update({
          where: { id: auction.id },
          data: {
            startingPrice: template.startingPrice,
            currentPrice: template.startingPrice,
            buyoutPrice: template.buyoutPrice
          }
        });
      }
    })
  );
}

function imageForCategory(category: string) {
  const imagesByCategory: Record<string, string> = {
    aircraft: IMAGE.jet,
    asset: IMAGE.collectorVault,
    boat: IMAGE.racingYacht,
    building: IMAGE.penthouse,
    car: IMAGE.redHypercar,
    helicopter: IMAGE.helicopter,
    house: IMAGE.islandVilla,
    submarine: IMAGE.submarine
  };

  return imagesByCategory[category] ?? IMAGE.asset;
}
