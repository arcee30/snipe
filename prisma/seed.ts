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
    buyoutPrice: 410_000,
    imageUrl: "/auction-assets/generated/hypercar-red-showroom.png"
  },
  {
    seller: "HarborHouse",
    title: "Waterfront Glass Villa",
    category: "house",
    description: "A modern shoreline property with private dock access.",
    startingPrice: 520_000,
    buyoutPrice: 950_000,
    imageUrl: "/auction-assets/house.png"
  },
  {
    seller: "VelocityVault",
    title: "Solaris 48 Sport Yacht",
    category: "boat",
    description: "Twin-engine sport yacht with upgraded navigation systems.",
    startingPrice: 260_000,
    buyoutPrice: 620_000,
    imageUrl: "/auction-assets/boat.png"
  },
  {
    seller: "LuxeLiquidators",
    title: "Downtown Penthouse Deed",
    category: "building",
    description: "Transferable deed for a skyline penthouse unit.",
    startingPrice: 430_000,
    buyoutPrice: 875_000,
    imageUrl: "/auction-assets/generated/skyscraper-penthouse.png"
  },
  {
    seller: "ApexImports",
    title: "Carbon Edition Track Car",
    category: "car",
    description: "A purpose-built weekend track machine with slick aero.",
    startingPrice: 125_000,
    buyoutPrice: 300_000,
    imageUrl: "/auction-assets/car.png"
  },
  {
    seller: "LuxeLiquidators",
    title: "Private Hangar Lease",
    category: "aircraft",
    description: "A premium long-term lease at a private airfield.",
    startingPrice: 210_000,
    buyoutPrice: 500_000,
    imageUrl: "/auction-assets/generated/private-jet-hangar.png"
  },
  {
    seller: "HarborHouse",
    title: "Rooftop Executive Helicopter",
    category: "helicopter",
    description: "A private twin-engine helicopter staged for city-to-resort transfers.",
    startingPrice: 780_000,
    buyoutPrice: 1_750_000,
    imageUrl: "/auction-assets/generated/helicopter-rooftop.png"
  },
  {
    seller: "VelocityVault",
    title: "Marina Submersible One",
    category: "submarine",
    description: "A compact private submersible for rare coastal exploration.",
    startingPrice: 1_450_000,
    buyoutPrice: 3_200_000,
    imageUrl: "/auction-assets/generated/private-submarine.png"
  },
  {
    seller: "LuxeLiquidators",
    title: "Private Island Glass Estate",
    category: "house",
    description: "A tropical shoreline compound with infinity pool and private dock.",
    startingPrice: 2_400_000,
    buyoutPrice: 4_850_000,
    imageUrl: "/auction-assets/generated/island-glass-villa.png"
  },
  {
    seller: "ApexImports",
    title: "Long-Range Private Jet",
    category: "aircraft",
    description: "A hangared intercontinental jet with premium cabin configuration.",
    startingPrice: 2_250_000,
    buyoutPrice: 5_000_000,
    imageUrl: "/auction-assets/generated/private-jet-hangar.png"
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
        imageUrl: seeded.imageUrl,
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
