ALTER TABLE "Item" ADD COLUMN "market" TEXT NOT NULL DEFAULT 'OVERWORLD';
ALTER TABLE "Item" ADD COLUMN "estimatedCleanValue" INTEGER;

ALTER TABLE "Auction" ADD COLUMN "market" TEXT NOT NULL DEFAULT 'OVERWORLD';
ALTER TABLE "Auction" ADD COLUMN "transferStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Auction" ADD COLUMN "launderingFee" INTEGER;
ALTER TABLE "Auction" ADD COLUMN "launderingStartedAt" DATETIME;
ALTER TABLE "Auction" ADD COLUMN "launderingCompletesAt" DATETIME;

CREATE INDEX "Auction_market_status_endsAt_idx" ON "Auction"("market", "status", "endsAt");
CREATE INDEX "Auction_highestBidderId_market_transferStatus_idx" ON "Auction"("highestBidderId", "market", "transferStatus");
