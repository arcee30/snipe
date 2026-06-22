export type User = {
  id: string;
  username: string;
  email?: string | null;
  displayName?: string | null;
};

export type Wallet = {
  balance: number;
};

export type LedgerEntry = {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  auctionId?: string | null;
  auction?: {
    item: {
      title: string;
      category: string;
    };
  } | null;
};

export type Auction = {
  id: string;
  startingPrice: number;
  currentPrice: number;
  buyoutPrice: number;
  highestBidderId: string | null;
  status: string;
  endsAt: string;
  createdAt: string;
  item: {
    title: string;
    category: string;
    description: string;
    imageUrl?: string | null;
  };
  seller: User;
  highestBidder: User | null;
};

export type PortfolioAsset = {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl?: string | null;
  acquiredFor: number;
  estimatedValue: number;
  appreciation: number;
  acquiredAt: string;
  seller: User;
};

export type PortfolioLeader = {
  username: string;
  displayName?: string | null;
  totalWorth: number;
  assetCount: number;
  isCurrentUser?: boolean;
};

export function formatCoins(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();

  if (diff <= 0) {
    return "closing";
  }

  const minutes = Math.floor(diff / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function auctionImage(auction: Auction) {
  if (auction.item.imageUrl) {
    return auction.item.imageUrl;
  }

  const title = auction.item.title.toLowerCase();

  if (auction.item.category === "helicopter") {
    return "/auction-assets/generated/helicopter-rooftop.png";
  }

  if (auction.item.category === "submarine") {
    return "/auction-assets/generated/private-submarine.png";
  }

  if (auction.item.category === "aircraft") {
    return "/auction-assets/generated/private-jet-hangar.png";
  }

  if (auction.item.category === "building" || title.includes("penthouse")) {
    return "/auction-assets/generated/skyscraper-penthouse.png";
  }

  if (title.includes("villa")) {
    return "/auction-assets/house.png";
  }

  if (title.includes("yacht") || auction.item.category === "boat") {
    return "/auction-assets/boat.png";
  }

  if (title.includes("car") || auction.item.category === "car") {
    return "/auction-assets/generated/hypercar-red-showroom.png";
  }

  return "/auction-assets/asset.png";
}

export function watcherCount(id: string) {
  const hash = Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0);
  return 12 + (hash % 28);
}

export function estimateValue(auction: Auction) {
  return Math.round((auction.buyoutPrice * 1.18) / 1_000) * 1_000;
}

export function ledgerTypeLabel(type: string) {
  const labels: Record<string, string> = {
    ACCOUNT_CREDIT_ADJUSTMENT: "Account credit",
    BID_HOLD: "Bid reserve",
    BUYOUT_PURCHASE: "Buyout purchase",
    FREE_CREDIT_TOP_UP: "Account credit",
    OUTBID_REFUND: "Outbid release",
    SELLER_PROCEEDS: "Seller proceeds",
    STARTING_BONUS: "Opening balance"
  };

  return labels[type] ?? titleCase(type.replaceAll("_", " "));
}

export function ledgerDescription(description: string) {
  return description
    .replace(/^Free MVP credit top-up:/, "Account credit adjustment:")
    .replace(/^Starting balance$/, "Opening balance");
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
