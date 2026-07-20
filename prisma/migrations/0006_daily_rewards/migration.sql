CREATE TABLE "DailyRewardClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "claimDate" TEXT NOT NULL,
    "streakDay" INTEGER NOT NULL,
    "creditAmount" INTEGER NOT NULL,
    "assetAuctionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyRewardClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyRewardClaim_assetAuctionId_fkey" FOREIGN KEY ("assetAuctionId") REFERENCES "Auction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DailyRewardClaim_userId_claimDate_key" ON "DailyRewardClaim"("userId", "claimDate");
CREATE INDEX "DailyRewardClaim_userId_createdAt_idx" ON "DailyRewardClaim"("userId", "createdAt");
