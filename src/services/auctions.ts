import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serviceError } from "@/lib/auction-errors";
import { assertPositiveCoins } from "@/lib/money";
import {
  notifyAuctionClosed,
  notifyBuyoutSettled,
  notifyOutbid
} from "@/services/notifications";

type Tx = Prisma.TransactionClient;

export type Market = "OVERWORLD" | "UNDERWORLD";

export type CreateAuctionInput = {
  title: string;
  category: string;
  description: string;
  imageUrl?: string;
  startingPrice: number;
  buyoutPrice: number;
  market?: Market;
  estimatedCleanValue?: number;
  endsAt?: Date;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const UNDERWORLD_MIN_DURATION_MS = 18 * 60 * 1000;
const UNDERWORLD_DURATION_SPREAD_MS = 27 * 60 * 1000;
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
const UNDERWORLD_BOT_ALIASES = [
  "RedLedger",
  "CipherYard",
  "BlackDock",
  "VantaRoom",
  "NullBroker",
  "GhostTitle",
  "AshCircuit",
  "IronVeil",
  "NocturneDesk",
  "CrimsonLot"
];

type BotAuctionTemplate = {
  title: string;
  category: string;
  description: string;
  startingPrice: number;
  buyoutPrice: number;
  estimatedCleanValue?: number;
  imageUrl: string;
};

const IMAGE = {
  blackRacecar: "/auction-assets/car.png",
  redHypercar: "/auction-assets/generated/hypercar-red-showroom.png",
  classicCoupe: "/auction-assets/generated/classic-silver-coupe.png",
  yachtMarina: "/auction-assets/boat.png",
  solarisYacht: "/auction-assets/generated/refresh-2026/solaris-48-sport-yacht.jpg",
  azureFlybridge: "/auction-assets/generated/refresh-2026/azure-62-flybridge.jpg",
  aureliaCatamaran: "/auction-assets/generated/refresh-2026/aurelia-catamaran-share.jpg",
  marinaBerth: "/auction-assets/generated/refresh-2026/marina-berth-contract.jpg",
  racingYacht: "/auction-assets/generated/offshore-racing-yacht.png",
  glassVilla: "/auction-assets/house.png",
  islandVilla: "/auction-assets/generated/island-glass-villa.png",
  penthouse: "/auction-assets/generated/skyscraper-penthouse.png",
  jet: "/auction-assets/generated/private-jet-hangar.png",
  longRangeJet: "/auction-assets/generated/refresh-2026/long-range-private-jet.jpg",
  privateHangar: "/auction-assets/generated/refresh-2026/private-hangar-lease.jpg",
  helicopter: "/auction-assets/generated/helicopter-rooftop.png",
  submarine: "/auction-assets/generated/private-submarine.png",
  collectorVault: "/auction-assets/generated/collector-vault.png",
  asset: "/auction-assets/asset.png"
} as const;

const LUXURY_2026_IMAGE_BASE = "/auction-assets/generated/luxury-2026-jpg";
const luxury2026Image = (slug: string) => `${LUXURY_2026_IMAGE_BASE}/${slug}.jpg`;

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
    imageUrl: IMAGE.solarisYacht
  },
  {
    title: "Azure 62 Flybridge",
    category: "boat",
    description: "A long-range flybridge cruiser with entertainment deck.",
    startingPrice: 610_000,
    buyoutPrice: 1_280_000,
    imageUrl: IMAGE.azureFlybridge
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
    imageUrl: IMAGE.aureliaCatamaran
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
    imageUrl: IMAGE.longRangeJet
  },
  {
    title: "Private Hangar Lease",
    category: "aircraft",
    description: "A premium long-term lease at a private airfield.",
    startingPrice: 310_000,
    buyoutPrice: 725_000,
    imageUrl: IMAGE.privateHangar
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
    imageUrl: IMAGE.marinaBerth
  },
  {
    title: "Alpine Silver Grand Tourer",
    category: "car",
    description: "A restored silver grand tourer with alpine provenance.",
    startingPrice: 1_200_000,
    buyoutPrice: 2_800_000,
    imageUrl: luxury2026Image("vintage-silver-grand-tourer")
  },
  {
    title: "Armored Executive SUV",
    category: "car",
    description: "A discreet armored SUV prepared for private-security transport.",
    startingPrice: 1_000_000,
    buyoutPrice: 2_400_000,
    imageUrl: luxury2026Image("armored-luxury-suv")
  },
  {
    title: "Emerald Works Racer",
    category: "car",
    description: "A museum-grade classic racing car in collector condition.",
    startingPrice: 3_000_000,
    buyoutPrice: 7_500_000,
    imageUrl: luxury2026Image("emerald-classic-racing-car")
  },
  {
    title: "White Arc Electric Hypercar",
    category: "car",
    description: "A glass-showroom electric hypercar with launch-spec hardware.",
    startingPrice: 1_800_000,
    buyoutPrice: 4_200_000,
    imageUrl: luxury2026Image("white-electric-hypercar")
  },
  {
    title: "Midnight Coast Coupe",
    category: "car",
    description: "A deep-blue luxury coupe configured for coastal grand touring.",
    startingPrice: 450_000,
    buyoutPrice: 1_100_000,
    imageUrl: luxury2026Image("midnight-blue-luxury-coupe")
  },
  {
    title: "Mediterranean 1960s Cabriolet",
    category: "car",
    description: "A restored open-top classic with Mediterranean ownership history.",
    startingPrice: 800_000,
    buyoutPrice: 2_100_000,
    imageUrl: luxury2026Image("mediterranean-1960s-convertible")
  },
  {
    title: "Aurum Concept Motorcycle",
    category: "motorcycle",
    description: "A gold-accented concept motorcycle built as a design study.",
    startingPrice: 250_000,
    buyoutPrice: 850_000,
    imageUrl: luxury2026Image("gold-concept-motorcycle")
  },
  {
    title: "Carbon Street Superbike",
    category: "motorcycle",
    description: "A carbon-fiber superbike tuned for night-city performance.",
    startingPrice: 180_000,
    buyoutPrice: 450_000,
    imageUrl: luxury2026Image("carbon-fiber-superbike")
  },
  {
    title: "Desert Expedition Camper",
    category: "truck",
    description: "A self-contained expedition truck with long-range desert capability.",
    startingPrice: 650_000,
    buyoutPrice: 1_400_000,
    imageUrl: luxury2026Image("desert-expedition-camper")
  },
  {
    title: "Private Formula Chassis",
    category: "car",
    description: "A formula-style race car maintained in a private team garage.",
    startingPrice: 2_200_000,
    buyoutPrice: 5_800_000,
    imageUrl: luxury2026Image("private-formula-race-car")
  },
  {
    title: "Lagoon Glass Residence",
    category: "house",
    description: "A floating glass residence positioned over a tropical lagoon.",
    startingPrice: 4_500_000,
    buyoutPrice: 12_000_000,
    imageUrl: luxury2026Image("floating-glass-lagoon-house")
  },
  {
    title: "North Face Ski Chalet",
    category: "house",
    description: "A snowline chalet with full-height glass and private slope access.",
    startingPrice: 3_200_000,
    buyoutPrice: 8_000_000,
    imageUrl: luxury2026Image("alpine-ski-chalet")
  },
  {
    title: "Volcanic Cliff Villa",
    category: "house",
    description: "A basalt-cut cliffside villa with open ocean frontage.",
    startingPrice: 6_000_000,
    buyoutPrice: 18_000_000,
    imageUrl: luxury2026Image("volcanic-cliffside-villa")
  },
  {
    title: "Koi Garden Minimalist Estate",
    category: "house",
    description: "A Japanese minimalist estate arranged around water and stone.",
    startingPrice: 4_000_000,
    buyoutPrice: 11_000_000,
    imageUrl: luxury2026Image("japanese-minimalist-estate")
  },
  {
    title: "Tuscan Vineyard Manor",
    category: "house",
    description: "A vineyard manor with production grounds and cypress-lined access.",
    startingPrice: 7_000_000,
    buyoutPrice: 22_000_000,
    imageUrl: luxury2026Image("tuscan-vineyard-manor")
  },
  {
    title: "Private Island Villa Compound",
    category: "house",
    description: "A private island compound with beach villas and yacht access.",
    startingPrice: 25_000_000,
    buyoutPrice: 80_000_000,
    imageUrl: luxury2026Image("private-island-compound")
  },
  {
    title: "Hidden Courtyard Bunker Estate",
    category: "house",
    description: "A secure underground mansion built around a concealed courtyard.",
    startingPrice: 8_000_000,
    buyoutPrice: 30_000_000,
    imageUrl: luxury2026Image("underground-bunker-mansion")
  },
  {
    title: "Modernized Historic Castle",
    category: "house",
    description: "A renovated castle blending preserved stonework with modern interiors.",
    startingPrice: 12_000_000,
    buyoutPrice: 45_000_000,
    imageUrl: luxury2026Image("renovated-historic-castle")
  },
  {
    title: "Rainforest Glass Treehouse",
    category: "house",
    description: "An elevated glass retreat suspended in a rainforest canopy.",
    startingPrice: 2_500_000,
    buyoutPrice: 7_000_000,
    imageUrl: luxury2026Image("rainforest-glass-treehouse")
  },
  {
    title: "Lakefront Seaplane Cabin",
    category: "house",
    description: "A lakefront cabin with private dock access for seaplane arrivals.",
    startingPrice: 3_000_000,
    buyoutPrice: 9_500_000,
    imageUrl: luxury2026Image("lakefront-cabin-seaplane-dock")
  },
  {
    title: "Panoramic Sleeper Train Suite",
    category: "rail",
    description: "A private sleeper suite configured for panoramic rail travel.",
    startingPrice: 1_600_000,
    buyoutPrice: 4_800_000,
    imageUrl: luxury2026Image("luxury-sleeper-train-suite")
  },
  {
    title: "Art Deco Private Railcar",
    category: "rail",
    description: "A restored private railcar finished in art deco materials.",
    startingPrice: 2_500_000,
    buyoutPrice: 7_200_000,
    imageUrl: luxury2026Image("art-deco-private-railcar")
  },
  {
    title: "Presidential Security Limousine",
    category: "car",
    description: "A bullet-resistant executive limousine prepared for secure convoys.",
    startingPrice: 1_400_000,
    buyoutPrice: 3_600_000,
    imageUrl: luxury2026Image("armored-presidential-limousine")
  },
  {
    title: "Autonomous Lounge Pod",
    category: "car",
    description: "A futuristic autonomous pod with a private lounge-style cabin.",
    startingPrice: 650_000,
    buyoutPrice: 1_900_000,
    imageUrl: luxury2026Image("autonomous-luxury-pod")
  },
  {
    title: "Safari Expedition Convoy",
    category: "truck",
    description: "A luxury expedition convoy staged for remote camp operations.",
    startingPrice: 2_000_000,
    buyoutPrice: 6_500_000,
    imageUrl: luxury2026Image("safari-expedition-convoy")
  },
  {
    title: "Aurora Polar Explorer",
    category: "truck",
    description: "A polar exploration vehicle built for extended cold-weather travel.",
    startingPrice: 3_500_000,
    buyoutPrice: 10_000_000,
    imageUrl: luxury2026Image("polar-exploration-vehicle")
  },
  {
    title: "Carbon Cockpit Simulator Room",
    category: "asset",
    description: "A private racing simulator room built around a carbon cockpit.",
    startingPrice: 350_000,
    buyoutPrice: 1_200_000,
    imageUrl: luxury2026Image("carbon-racing-simulator-room")
  },
  {
    title: "Private Formula Paddock Suite",
    category: "asset",
    description: "A trackside hospitality suite attached to a private racing paddock.",
    startingPrice: 5_000_000,
    buyoutPrice: 16_000_000,
    imageUrl: luxury2026Image("formula-paddock-suite")
  },
  {
    title: "Elite Show Horse Trailer",
    category: "asset",
    description: "A bespoke equestrian transport setup for elite show operations.",
    startingPrice: 300_000,
    buyoutPrice: 900_000,
    imageUrl: luxury2026Image("luxury-horse-trailer")
  },
  {
    title: "Bespoke Electric Speedboat",
    category: "boat",
    description: "A silent electric speedboat with custom teak and carbon detailing.",
    startingPrice: 700_000,
    buyoutPrice: 2_000_000,
    imageUrl: luxury2026Image("bespoke-electric-speedboat")
  },
  {
    title: "Solar Arctic Explorer Yacht",
    category: "boat",
    description: "A solar-assisted explorer yacht prepared for Arctic passages.",
    startingPrice: 18_000_000,
    buyoutPrice: 60_000_000,
    imageUrl: luxury2026Image("solar-explorer-yacht")
  },
  {
    title: "Classic Lake Como Runabout",
    category: "boat",
    description: "A varnished wooden runabout built for classic lake cruising.",
    startingPrice: 600_000,
    buyoutPrice: 1_800_000,
    imageUrl: luxury2026Image("classic-wooden-lake-boat")
  },
  {
    title: "Carbon Ocean Racing Sailboat",
    category: "boat",
    description: "A high-performance racing sailboat with ocean-ready carbon rigging.",
    startingPrice: 3_500_000,
    buyoutPrice: 12_000_000,
    imageUrl: luxury2026Image("racing-sailboat")
  },
  {
    title: "Floating Beach Club Platform",
    category: "asset",
    description: "A modular floating beach club with lounge decks and tender access.",
    startingPrice: 6_000_000,
    buyoutPrice: 20_000_000,
    imageUrl: luxury2026Image("floating-beach-club")
  },
  {
    title: "Deep-Sea Research Vessel",
    category: "boat",
    description: "An expedition research vessel upgraded with private hospitality spaces.",
    startingPrice: 30_000_000,
    buyoutPrice: 120_000_000,
    imageUrl: luxury2026Image("deep-sea-research-vessel")
  },
  {
    title: "Oceanfront Submarine Garage",
    category: "submarine",
    description: "A cliff-carved private submarine bay with secure ocean access.",
    startingPrice: 10_000_000,
    buyoutPrice: 40_000_000,
    imageUrl: luxury2026Image("oceanfront-submarine-garage")
  },
  {
    title: "Tropical Resort Seaplane",
    category: "aircraft",
    description: "A luxury seaplane configured for resort and island transfers.",
    startingPrice: 1_200_000,
    buyoutPrice: 3_800_000,
    imageUrl: luxury2026Image("tropical-luxury-seaplane")
  },
  {
    title: "Restored Propeller Aircraft",
    category: "aircraft",
    description: "A vintage propeller aircraft restored for private collection display.",
    startingPrice: 900_000,
    buyoutPrice: 2_600_000,
    imageUrl: luxury2026Image("vintage-propeller-aircraft")
  },
  {
    title: "Supersonic Private Jet Concept",
    category: "aircraft",
    description: "A supersonic private jet concept staged in a futuristic hangar.",
    startingPrice: 40_000_000,
    buyoutPrice: 180_000_000,
    imageUrl: luxury2026Image("supersonic-private-jet-concept")
  },
  {
    title: "Desert Sunrise Balloon Suite",
    category: "aircraft",
    description: "A luxury balloon suite designed for high-end desert flights.",
    startingPrice: 500_000,
    buyoutPrice: 1_700_000,
    imageUrl: luxury2026Image("hot-air-balloon-suite")
  },
  {
    title: "Vaulted Gemstone Collection",
    category: "collectible",
    description: "A secure collection of rare stones arranged for private sale.",
    startingPrice: 5_000_000,
    buyoutPrice: 20_000_000,
    imageUrl: luxury2026Image("rare-gemstone-collection")
  },
  {
    title: "Museum-Grade Fossil Gallery",
    category: "collectible",
    description: "A dinosaur fossil display prepared for private gallery placement.",
    startingPrice: 12_000_000,
    buyoutPrice: 45_000_000,
    imageUrl: luxury2026Image("dinosaur-fossil-gallery")
  },
  {
    title: "Ancient Marble Atrium Statue",
    category: "collectible",
    description: "A classical marble statue displayed in a private collector atrium.",
    startingPrice: 8_000_000,
    buyoutPrice: 35_000_000,
    imageUrl: luxury2026Image("ancient-marble-statue")
  },
  {
    title: "Black Stone Meteorite Display",
    category: "collectible",
    description: "A meteorite centerpiece mounted in a private exhibition room.",
    startingPrice: 4_000_000,
    buyoutPrice: 16_000_000,
    imageUrl: luxury2026Image("meteorite-exhibition-room")
  },
  {
    title: "Rare Mechanical Watch Collection",
    category: "collectible",
    description: "A secure glass-case collection of rare mechanical watches.",
    startingPrice: 3_000_000,
    buyoutPrice: 12_000_000,
    imageUrl: luxury2026Image("mechanical-watch-collection")
  },
  {
    title: "Heritage Wine Cellar Reserve",
    category: "collectible",
    description: "A vaulted wine reserve containing investment-grade bottles.",
    startingPrice: 6_000_000,
    buyoutPrice: 25_000_000,
    imageUrl: luxury2026Image("vintage-wine-cellar")
  },
  {
    title: "Private Masterworks Vault",
    category: "collectible",
    description: "A climate-controlled art vault holding covered masterworks.",
    startingPrice: 20_000_000,
    buyoutPrice: 100_000_000,
    imageUrl: luxury2026Image("private-art-vault")
  },
  {
    title: "High-Security Bullion Reserve",
    category: "collectible",
    description: "A private bullion room with secured gold reserves.",
    startingPrice: 50_000_000,
    buyoutPrice: 200_000_000,
    imageUrl: luxury2026Image("gold-bullion-vault")
  },
  {
    title: "Championship Stable Prospect",
    category: "horse",
    description: "A championship racehorse presented from a private luxury stable.",
    startingPrice: 2_000_000,
    buyoutPrice: 15_000_000,
    imageUrl: luxury2026Image("championship-racehorse")
  },
  {
    title: "Lunar Memorabilia Claim Display",
    category: "collectible",
    description: "A lunar-themed claim display with astronaut-era memorabilia.",
    startingPrice: 10_000_000,
    buyoutPrice: 75_000_000,
    imageUrl: luxury2026Image("lunar-claim-memorabilia")
  }
] satisfies BotAuctionTemplate[];

const UNDERWORLD_AUCTION_TEMPLATES = [
  {
    title: "Unregistered Alpine Grand Tourer",
    category: "car",
    description: "A silver grand tourer with missing papers and a seller who wants speed.",
    startingPrice: 840_000,
    buyoutPrice: 1_260_000,
    estimatedCleanValue: 2_800_000,
    imageUrl: luxury2026Image("vintage-silver-grand-tourer")
  },
  {
    title: "Cold Storage Armored SUV",
    category: "car",
    description: "Armored executive transport held off-book in a private garage.",
    startingPrice: 690_000,
    buyoutPrice: 960_000,
    estimatedCleanValue: 2_400_000,
    imageUrl: luxury2026Image("armored-luxury-suv")
  },
  {
    title: "Emerald Works Racer Shell",
    category: "car",
    description: "A museum-grade racing chassis with quiet provenance and fast export terms.",
    startingPrice: 2_250_000,
    buyoutPrice: 3_375_000,
    estimatedCleanValue: 7_500_000,
    imageUrl: luxury2026Image("emerald-classic-racing-car")
  },
  {
    title: "White Arc Keyless Hypercar",
    category: "car",
    description: "Launch-spec electric hypercar offered below board value, transfer discreet.",
    startingPrice: 1_260_000,
    buyoutPrice: 1_680_000,
    estimatedCleanValue: 4_200_000,
    imageUrl: luxury2026Image("white-electric-hypercar")
  },
  {
    title: "Aurum Concept Bike Crate",
    category: "motorcycle",
    description: "A gold-accented concept motorcycle moving as a sealed crate lot.",
    startingPrice: 255_000,
    buyoutPrice: 340_000,
    estimatedCleanValue: 850_000,
    imageUrl: luxury2026Image("gold-concept-motorcycle")
  },
  {
    title: "Carbon Street Superbike",
    category: "motorcycle",
    description: "Carbon superbike with altered registration history and a clean visual profile.",
    startingPrice: 135_000,
    buyoutPrice: 180_000,
    estimatedCleanValue: 450_000,
    imageUrl: luxury2026Image("carbon-fiber-superbike")
  },
  {
    title: "Bespoke Speedboat Hull",
    category: "boat",
    description: "Electric speedboat with identifiers scrubbed from the market packet.",
    startingPrice: 600_000,
    buyoutPrice: 800_000,
    estimatedCleanValue: 2_000_000,
    imageUrl: luxury2026Image("bespoke-electric-speedboat")
  },
  {
    title: "Classic Runabout Without Papers",
    category: "boat",
    description: "Wooden lake runabout with a quiet dock handoff and no marina record.",
    startingPrice: 540_000,
    buyoutPrice: 720_000,
    estimatedCleanValue: 1_800_000,
    imageUrl: luxury2026Image("classic-wooden-lake-boat")
  },
  {
    title: "Resort Seaplane Off Manifest",
    category: "aircraft",
    description: "A luxury seaplane offered under urgent transfer terms and discounted paperwork.",
    startingPrice: 1_330_000,
    buyoutPrice: 1_710_000,
    estimatedCleanValue: 3_800_000,
    imageUrl: luxury2026Image("tropical-luxury-seaplane")
  },
  {
    title: "Vault Watch Collection",
    category: "collectible",
    description: "Rare mechanical watches from a private vault, provenance unavailable until clean-up.",
    startingPrice: 3_600_000,
    buyoutPrice: 5_400_000,
    estimatedCleanValue: 12_000_000,
    imageUrl: luxury2026Image("mechanical-watch-collection")
  },
  {
    title: "Midnight Coast Coupe Transfer",
    category: "car",
    description: "Deep-blue grand tourer moving through a private coastal handoff.",
    startingPrice: 385_000,
    buyoutPrice: 495_000,
    estimatedCleanValue: 1_100_000,
    imageUrl: luxury2026Image("midnight-blue-luxury-coupe")
  },
  {
    title: "Mediterranean Cabriolet Papers Pending",
    category: "car",
    description: "Restored open-top classic offered before its registry trail catches up.",
    startingPrice: 735_000,
    buyoutPrice: 945_000,
    estimatedCleanValue: 2_100_000,
    imageUrl: luxury2026Image("mediterranean-1960s-convertible")
  },
  {
    title: "Formula Chassis Off Trailer",
    category: "car",
    description: "Private formula chassis sold from a silent paddock corridor.",
    startingPrice: 1_740_000,
    buyoutPrice: 2_610_000,
    estimatedCleanValue: 5_800_000,
    imageUrl: luxury2026Image("private-formula-race-car")
  },
  {
    title: "Presidential Limousine Black File",
    category: "car",
    description: "Armored executive limousine with restricted service history.",
    startingPrice: 1_080_000,
    buyoutPrice: 1_620_000,
    estimatedCleanValue: 3_600_000,
    imageUrl: luxury2026Image("armored-presidential-limousine")
  },
  {
    title: "Autonomous Pod Ghost Title",
    category: "car",
    description: "Futuristic lounge pod routed through a private technology broker.",
    startingPrice: 570_000,
    buyoutPrice: 760_000,
    estimatedCleanValue: 1_900_000,
    imageUrl: luxury2026Image("autonomous-luxury-pod")
  },
  {
    title: "Desert Convoy Manifest Gap",
    category: "truck",
    description: "Luxury expedition convoy with import documents still cooling.",
    startingPrice: 1_950_000,
    buyoutPrice: 2_925_000,
    estimatedCleanValue: 6_500_000,
    imageUrl: luxury2026Image("safari-expedition-convoy")
  },
  {
    title: "Aurora Explorer Cold Transfer",
    category: "truck",
    description: "Polar exploration vehicle sold through a remote freight channel.",
    startingPrice: 3_000_000,
    buyoutPrice: 4_500_000,
    estimatedCleanValue: 10_000_000,
    imageUrl: luxury2026Image("polar-exploration-vehicle")
  },
  {
    title: "Electric Speedboat Night Dock",
    category: "boat",
    description: "Custom electric speedboat released from a closed marina berth.",
    startingPrice: 700_000,
    buyoutPrice: 900_000,
    estimatedCleanValue: 2_000_000,
    imageUrl: luxury2026Image("bespoke-electric-speedboat")
  },
  {
    title: "Carbon Racing Sailboat Relay",
    category: "boat",
    description: "Ocean racing sailboat with a clean hull and unclear last port.",
    startingPrice: 4_200_000,
    buyoutPrice: 5_400_000,
    estimatedCleanValue: 12_000_000,
    imageUrl: luxury2026Image("racing-sailboat")
  },
  {
    title: "Explorer Yacht Quiet Flag",
    category: "boat",
    description: "Solar-assisted explorer yacht priced for a fast flag reset.",
    startingPrice: 18_000_000,
    buyoutPrice: 27_000_000,
    estimatedCleanValue: 60_000_000,
    imageUrl: luxury2026Image("solar-explorer-yacht")
  },
  {
    title: "Research Vessel Private Conversion",
    category: "boat",
    description: "Deep-sea vessel with upgraded interiors and complicated origin records.",
    startingPrice: 36_000_000,
    buyoutPrice: 54_000_000,
    estimatedCleanValue: 120_000_000,
    imageUrl: luxury2026Image("deep-sea-research-vessel")
  },
  {
    title: "Rotorcraft No Tail Ledger",
    category: "helicopter",
    description: "Executive rotorcraft staged without a public tail-number listing.",
    startingPrice: 875_000,
    buyoutPrice: 1_050_000,
    estimatedCleanValue: 2_350_000,
    imageUrl: IMAGE.helicopter
  },
  {
    title: "Vintage Prop Plane Side Hangar",
    category: "aircraft",
    description: "Restored propeller aircraft held outside the standard aviation registry flow.",
    startingPrice: 1_040_000,
    buyoutPrice: 1_300_000,
    estimatedCleanValue: 2_600_000,
    imageUrl: luxury2026Image("vintage-propeller-aircraft")
  },
  {
    title: "Supersonic Concept Dark Allocation",
    category: "aircraft",
    description: "Prototype jet allocation sold before formal ownership paperwork clears.",
    startingPrice: 54_000_000,
    buyoutPrice: 72_000_000,
    estimatedCleanValue: 180_000_000,
    imageUrl: luxury2026Image("supersonic-private-jet-concept")
  },
  {
    title: "Private Railcar Off Timetable",
    category: "rail",
    description: "Art deco railcar disconnected from its official service timetable.",
    startingPrice: 2_520_000,
    buyoutPrice: 3_240_000,
    estimatedCleanValue: 7_200_000,
    imageUrl: luxury2026Image("art-deco-private-railcar")
  },
  {
    title: "Panoramic Train Suite Transfer",
    category: "rail",
    description: "Sleeper suite sold through a quiet rolling-stock broker.",
    startingPrice: 1_680_000,
    buyoutPrice: 2_160_000,
    estimatedCleanValue: 4_800_000,
    imageUrl: luxury2026Image("luxury-sleeper-train-suite")
  },
  {
    title: "Velvet Gemstone Vault Tray",
    category: "collectible",
    description: "Rare stones moving in a compact vault tray with no public catalog trail.",
    startingPrice: 6_000_000,
    buyoutPrice: 8_000_000,
    estimatedCleanValue: 20_000_000,
    imageUrl: luxury2026Image("rare-gemstone-collection")
  },
  {
    title: "Fossil Gallery Shadow Consignment",
    category: "collectible",
    description: "Museum-grade fossil display priced below clean appraisal for immediate movement.",
    startingPrice: 13_500_000,
    buyoutPrice: 18_000_000,
    estimatedCleanValue: 45_000_000,
    imageUrl: luxury2026Image("dinosaur-fossil-gallery")
  },
  {
    title: "Meteorite Black Room Lot",
    category: "collectible",
    description: "Meteorite centerpiece with appraisal documents withheld until clean-up.",
    startingPrice: 4_800_000,
    buyoutPrice: 6_400_000,
    estimatedCleanValue: 16_000_000,
    imageUrl: luxury2026Image("meteorite-exhibition-room")
  },
  {
    title: "Covered Masterworks Vault Packet",
    category: "collectible",
    description: "Private art-vault packet offered under strict no-preview transfer terms.",
    startingPrice: 30_000_000,
    buyoutPrice: 45_000_000,
    estimatedCleanValue: 100_000_000,
    imageUrl: luxury2026Image("private-art-vault")
  },
  {
    title: "Bullion Reserve Redacted Manifest",
    category: "collectible",
    description: "High-security bullion room allocation with a redacted chain of custody.",
    startingPrice: 70_000_000,
    buyoutPrice: 90_000_000,
    estimatedCleanValue: 200_000_000,
    imageUrl: luxury2026Image("gold-bullion-vault")
  }
] satisfies BotAuctionTemplate[];

export async function createAuction(userId: string, input: CreateAuctionInput) {
  assertPositiveCoins(input.startingPrice, "Starting price");
  assertPositiveCoins(input.buyoutPrice, "Buyout price");
  const market = input.market ?? "OVERWORLD";

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
      market,
      estimatedCleanValue: input.estimatedCleanValue ?? input.buyoutPrice,
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
      market,
      endsAt: input.endsAt ?? new Date(Date.now() + ONE_HOUR_MS)
    },
    include: auctionInclude
  });
}

export async function listActiveAuctions(market: Market = "OVERWORLD") {
  return prisma.auction.findMany({
    where: { status: "ACTIVE", market },
    orderBy: [{ endsAt: "asc" }, { updatedAt: "desc" }],
    include: auctionInclude
  });
}

export async function ensureBotAuctionPool({
  market = "OVERWORLD",
  targetActive = market === "UNDERWORLD" ? 12 : 50
}: { market?: Market; targetActive?: number } = {}) {
  let activeBotAuctions = await prisma.auction.findMany({
    where: {
      market,
      status: "ACTIVE",
      seller: {
        isBot: true
      }
    },
    include: {
      item: true,
      seller: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (market === "UNDERWORLD") {
    activeBotAuctions = await retirePublicAliasesFromUnderworld(activeBotAuctions);
  }

  await repairSeededAuctionImages(activeBotAuctions, templatesForMarket(market));

  if (activeBotAuctions.length > targetActive) {
    await trimBotAuctionPool(activeBotAuctions, targetActive);
  }

  const currentActiveCount = Math.min(activeBotAuctions.length, targetActive);
  const missingCount = Math.max(0, targetActive - currentActiveCount);

  if (missingCount === 0) {
    return;
  }

  const bots = await ensureBotUsers(market);
  const activeTitles = new Set(
    activeBotAuctions.map((auction) => auction.item.title)
  );
  const templates = templatesForFill(activeTitles, market);

  for (let index = 0; index < missingCount; index += 1) {
    const template: BotAuctionTemplate = templates[index % templates.length];
    const seller = bots[index % bots.length];

    await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          title: template.title,
          category: template.category,
          description: template.description,
          imageUrl: template.imageUrl,
          market,
          estimatedCleanValue: template.estimatedCleanValue ?? template.buyoutPrice,
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
          market,
          endsAt: new Date(Date.now() + auctionDurationMs(market))
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
      where: { id: auctionId },
      include: { item: true }
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

    if (previousBidderId && previousBidderId !== userId) {
      await notifyOutbid(tx, {
        userId: previousBidderId,
        auctionId: auction.id,
        itemTitle: auction.item.title,
        newAmount: amount
      });
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
      where: { id: auctionId },
      include: { item: true }
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
    await notifyBuyoutSettled(tx, {
      auctionId: auction.id,
      buyerId: userId,
      sellerId: auction.sellerId,
      previousBidderId: auction.highestBidderId,
      itemTitle: auction.item.title,
      amount: auction.buyoutPrice
    });

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
        where: { id: auction.id },
        include: { item: true }
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
      await notifyAuctionClosed(tx, {
        auctionId: fresh.id,
        winnerId: fresh.highestBidderId,
        sellerId: fresh.sellerId,
        itemTitle: fresh.item.title,
        amount: fresh.currentPrice
      });
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

async function ensureBotUsers(market: Market = "OVERWORLD") {
  const bots = [];
  const usernames = market === "UNDERWORLD" ? UNDERWORLD_BOT_ALIASES : BOT_USERNAMES;

  for (const username of usernames) {
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

async function retirePublicAliasesFromUnderworld<
  T extends {
    id: string;
    highestBidderId: string | null;
    seller: { username: string };
  }
>(activeBotAuctions: T[]) {
  const aliasSet = new Set(UNDERWORLD_BOT_ALIASES);
  const retiring = activeBotAuctions.filter(
    (auction) => !auction.highestBidderId && !aliasSet.has(auction.seller.username)
  );

  if (retiring.length > 0) {
    await prisma.auction.updateMany({
      where: {
        id: {
          in: retiring.map((auction) => auction.id)
        }
      },
      data: {
        status: "EXPIRED"
      }
    });
  }

  return activeBotAuctions.filter(
    (auction) => !retiring.some((retired) => retired.id === auction.id)
  );
}

function auctionDurationMs(market: Market) {
  if (market === "UNDERWORLD") {
    return (
      UNDERWORLD_MIN_DURATION_MS +
      Math.floor(Math.random() * UNDERWORLD_DURATION_SPREAD_MS)
    );
  }

  return ONE_HOUR_MS;
}

function templatesForMarket(market: Market) {
  return market === "UNDERWORLD"
    ? UNDERWORLD_AUCTION_TEMPLATES
    : BOT_AUCTION_TEMPLATES;
}

function shuffledTemplates(market: Market) {
  return [...templatesForMarket(market)].sort(() => Math.random() - 0.5);
}

function templatesForFill(activeTitles: Set<string>, market: Market) {
  if (market === "UNDERWORLD") {
    return shuffledTemplates(market).filter(
      (template) => !activeTitles.has(template.title)
    );
  }

  const featuredTitles = new Set([
    "Supersonic Private Jet Concept",
    "High-Security Bullion Reserve",
    "Deep-Sea Research Vessel",
    "Private Island Villa Compound",
    "Private Masterworks Vault",
    "Museum-Grade Fossil Gallery",
    "Long-Range Private Jet",
    "Private Island Glass Estate",
    "Boutique Tower Equity Slice",
    "Marina Submersible One"
  ]);
  const featured = BOT_AUCTION_TEMPLATES.filter(
    (template) => featuredTitles.has(template.title) && !activeTitles.has(template.title)
  );
  const random = shuffledTemplates(market).filter(
    (template) => !featuredTitles.has(template.title) && !activeTitles.has(template.title)
  );

  return [...featured, ...random];
}

async function repairSeededAuctionImages(
  auctions: Array<{
    id: string;
    startingPrice: number;
    currentPrice: number;
    buyoutPrice: number;
    highestBidderId: string | null;
    item: {
      id: string;
      title: string;
      category: string;
      description: string;
      imageUrl: string | null;
      estimatedCleanValue: number | null;
    };
  }>,
  templates: readonly BotAuctionTemplate[]
) {
  const templatesByTitle = new Map(
    templates.map((template) => [template.title, template])
  );

  await Promise.all(
    auctions.map(async (auction) => {
      const template = templatesByTitle.get(auction.item.title);
      const imageUrl = template?.imageUrl ?? imageForCategory(auction.item.category);
      const nextItem = {
        category: template?.category ?? auction.item.category,
        description: template?.description ?? auction.item.description,
        imageUrl,
        estimatedCleanValue: template?.estimatedCleanValue ?? template?.buyoutPrice
      };
      const itemNeedsRepair =
        auction.item.category !== nextItem.category ||
        auction.item.description !== nextItem.description ||
        auction.item.imageUrl !== nextItem.imageUrl ||
        (template && auction.item.estimatedCleanValue !== nextItem.estimatedCleanValue);

      if (itemNeedsRepair) {
        await prisma.item.update({
          where: { id: auction.item.id },
          data: nextItem
        });
      }

      const auctionNeedsRepair =
        template &&
        !auction.highestBidderId &&
        (auction.startingPrice !== template.startingPrice ||
          auction.currentPrice !== template.startingPrice ||
          auction.buyoutPrice !== template.buyoutPrice);

      if (auctionNeedsRepair) {
        await prisma.auction.update({
          where: { id: auction.id },
          data: {
            startingPrice: template!.startingPrice,
            currentPrice: template!.startingPrice,
            buyoutPrice: template!.buyoutPrice
          }
        });
      }
    })
  );
}

async function trimBotAuctionPool(
  activeBotAuctions: Array<{
    id: string;
    highestBidderId: string | null;
  }>,
  targetActive: number
) {
  const overflow = activeBotAuctions
    .slice(targetActive)
    .filter((auction) => !auction.highestBidderId);

  if (overflow.length === 0) {
    return;
  }

  await prisma.auction.updateMany({
    where: {
      id: {
        in: overflow.map((auction) => auction.id)
      }
    },
    data: {
      status: "EXPIRED"
    }
  });
}

function imageForCategory(category: string) {
  const imagesByCategory: Record<string, string> = {
    aircraft: IMAGE.jet,
    asset: IMAGE.collectorVault,
    boat: IMAGE.racingYacht,
    building: IMAGE.penthouse,
    car: IMAGE.redHypercar,
    collectible: IMAGE.collectorVault,
    helicopter: IMAGE.helicopter,
    house: IMAGE.islandVilla,
    motorcycle: luxury2026Image("gold-concept-motorcycle"),
    rail: luxury2026Image("art-deco-private-railcar"),
    submarine: IMAGE.submarine,
    truck: luxury2026Image("desert-expedition-camper")
  };

  return imagesByCategory[category] ?? IMAGE.asset;
}
