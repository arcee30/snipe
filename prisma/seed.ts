import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STARTING_BALANCE = 1_000_000;

const botUsers = [
  "VelocityVault",
  "HarborHouse",
  "ApexImports",
  "LuxeLiquidators"
];

const seededAuctions = [
  {
    seller: "ApexImports",
    title: "2024 Hyperion GT",
    category: "car",
    description: "A low-mileage grand tourer with a carbon aero package.",
    startingPrice: 180_000,
    buyoutPrice: 410_000
  },
  {
    seller: "HarborHouse",
    title: "Waterfront Glass Villa",
    category: "house",
    description: "A modern shoreline property with private dock access.",
    startingPrice: 520_000,
    buyoutPrice: 950_000
  },
  {
    seller: "VelocityVault",
    title: "Solaris 48 Sport Yacht",
    category: "boat",
    description: "Twin-engine sport yacht with upgraded navigation systems.",
    startingPrice: 260_000,
    buyoutPrice: 620_000
  },
  {
    seller: "LuxeLiquidators",
    title: "Downtown Penthouse Deed",
    category: "asset",
    description: "Transferable deed for a skyline penthouse unit.",
    startingPrice: 430_000,
    buyoutPrice: 875_000
  },
  {
    seller: "ApexImports",
    title: "Carbon Edition Track Car",
    category: "car",
    description: "A purpose-built weekend track machine with slick aero.",
    startingPrice: 125_000,
    buyoutPrice: 300_000
  },
  {
    seller: "LuxeLiquidators",
    title: "Private Hangar Lease",
    category: "asset",
    description: "A premium long-term lease at a private airfield.",
    startingPrice: 210_000,
    buyoutPrice: 500_000
  }
];

async function main() {
  for (const username of botUsers) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { isBot: true },
      create: {
        username,
        isBot: true,
        wallet: {
          create: {
            balance: STARTING_BALANCE
          }
        }
      },
      include: { wallet: true }
    });

    if (!user.wallet) {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: STARTING_BALANCE
        }
      });
    }
  }

  const activeSeededCount = await prisma.auction.count({
    where: {
      status: "ACTIVE",
      item: {
        isSeeded: true
      }
    }
  });

  if (activeSeededCount > 0) {
    return;
  }

  const endsAt = new Date(Date.now() + 60 * 60 * 1000);

  for (const seeded of seededAuctions) {
    const seller = await prisma.user.findUniqueOrThrow({
      where: { username: seeded.seller }
    });

    const item = await prisma.item.create({
      data: {
        title: seeded.title,
        category: seeded.category,
        description: seeded.description,
        createdByUserId: seller.id,
        isSeeded: true
      }
    });

    await prisma.auction.create({
      data: {
        itemId: item.id,
        sellerId: seller.id,
        startingPrice: seeded.startingPrice,
        currentPrice: seeded.startingPrice,
        buyoutPrice: seeded.buyoutPrice,
        endsAt
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
