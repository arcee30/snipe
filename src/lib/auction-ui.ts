export type User = {
  id: string;
  username: string;
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

  if (title.includes("villa") || title.includes("penthouse")) {
    return "/auction-assets/house.png";
  }

  if (title.includes("yacht") || auction.item.category === "boat") {
    return "/auction-assets/boat.png";
  }

  if (title.includes("car") || auction.item.category === "car") {
    return "/auction-assets/car.png";
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
