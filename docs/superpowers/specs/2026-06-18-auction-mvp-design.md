# Auction MVP Design

## Goal

Build a full-stack auction marketplace MVP that can later grow into a game-like auction house. The first version focuses on a working auction loop, simple fake accounts, fake high-value assets, coin balances, transaction history, and correctness under competing bids.

## Scope

The MVP supports:

- Username-only accounts with no password.
- A starting wallet balance of 1,000,000 coins for each new user.
- One-hour auctions.
- Bidding and instant buyout.
- Seeded default auctions from dummy/bot accounts.
- Cars, houses, boats, and other expensive fake assets.
- Wallet balance updates and transaction history.
- Race-condition-safe bid, buyout, refund, and close logic.

The MVP does not include:

- Real payments.
- Email, OAuth, or password authentication.
- Real item ownership verification.
- Advanced game progression, rarity, or inventory systems.
- Admin moderation tools.

## Recommended Stack

- Frontend: Next.js, TypeScript, Tailwind CSS.
- Backend: Next.js route handlers and server-side service functions.
- Database: PostgreSQL.
- ORM: Prisma.
- Realtime: Socket.IO for local MVP realtime auction updates.
- Validation: Zod.
- Testing: Vitest for service logic, Playwright for core user flows.

This stack keeps the app small enough for an MVP while preserving the important backend boundary: auction state changes happen in server-side services backed by database transactions.

## Core Product Flow

### Account Entry

The user enters a username. If the username already exists, the app resumes that account. If it does not exist, the app creates a new account and wallet with 1,000,000 coins.

For the MVP, username identity is intentionally weak. It is a game prototype convenience, not production authentication.

### Auction Feed

The home screen shows active auctions sorted by soonest ending or most recent activity. Each auction card shows:

- Item title.
- Item category.
- Seller username.
- Current bid.
- Highest bidder when present.
- Buyout price.
- Time left.
- Status.

The first run of the app should show seeded auctions from bot accounts so the marketplace does not feel empty.

### Create Listing

A user can create a one-hour auction by entering:

- Item title.
- Item category: car, house, boat, or asset.
- Starting price.
- Buyout price.

The backend validates that the buyout price is higher than the starting price. Auctions always expire one hour after creation.

### Auction Detail

The auction detail screen shows live auction state, bid history, a bid form, and a buyout button. Bid and buyout actions use the backend as the source of truth. The frontend may optimistically refresh, but it must treat server responses as authoritative.

### Wallet And History

Each user has a wallet balance and immutable transaction history. Transaction entries include:

- Starting bonus.
- Bid hold.
- Outbid refund.
- Buyout purchase.
- Seller proceeds.
- Auction win settlement.

## Data Model

### User

- id
- username
- createdAt

### Wallet

- id
- userId
- balance
- createdAt
- updatedAt

### LedgerEntry

- id
- walletId
- userId
- amount
- type
- description
- auctionId
- createdAt

Amounts use positive values for credits and negative values for debits.

### Item

- id
- title
- category
- description
- createdByUserId
- isSeeded
- createdAt

### Auction

- id
- itemId
- sellerId
- startingPrice
- currentPrice
- buyoutPrice
- highestBidderId
- status: active, sold, expired, settled
- endsAt
- createdAt
- updatedAt

### Bid

- id
- auctionId
- bidderId
- amount
- createdAt

## Backend Services

### createOrResumeUser(username)

Normalizes the username, creates the user when missing, creates a wallet, and writes the starting bonus ledger entry.

### createAuction(userId, input)

Creates an item and active auction with an `endsAt` timestamp one hour after creation.

### placeBid(userId, auctionId, amount)

Runs inside a database transaction:

1. Lock the auction row.
2. Confirm the auction is active and not expired.
3. Confirm the bidder is not the seller.
4. Confirm the bid is higher than the current price.
5. Lock bidder wallet and confirm sufficient balance.
6. Debit bidder wallet and write bid hold ledger entry.
7. If there was a previous highest bidder, refund their held bid and write refund ledger entry.
8. Create bid row.
9. Update auction current price and highest bidder.
10. Emit realtime auction update after commit.

### buyOutAuction(userId, auctionId)

Runs inside a database transaction:

1. Lock the auction row.
2. Confirm the auction is active and not expired.
3. Confirm buyer is not seller.
4. Lock buyer wallet and confirm sufficient balance.
5. Refund previous highest bidder if one exists.
6. Debit buyer for buyout price.
7. Credit seller proceeds.
8. Write buyer, seller, and refund ledger entries.
9. Mark auction sold and settled.
10. Emit realtime auction update after commit.

### closeExpiredAuctions()

Runs periodically and closes auctions whose `endsAt` is in the past:

- If there is a highest bidder, credit seller proceeds and mark auction settled.
- If there are no bids, mark auction expired.
- The close operation must be idempotent so the same auction cannot settle twice.

## Seed Data

The development seed should create several bot accounts and active one-hour auctions. Example bot users:

- VelocityVault
- HarborHouse
- ApexImports
- LuxeLiquidators

Example seeded items:

- 2024 Hyperion GT
- Waterfront Glass Villa
- Solaris 48 Sport Yacht
- Downtown Penthouse Deed
- Carbon Edition Track Car
- Private Hangar Lease

Seeded auctions should have varied starting prices and buyout prices so the feed feels active immediately.

## Realtime Behavior

Realtime updates are used for user experience, not correctness. The server emits updates after successful transaction commits for:

- New auction created.
- New highest bid.
- Auction bought out.
- Auction expired.
- Auction settled.

Clients refetch auction state after receiving an event.

## Error Handling

The backend returns clear errors for:

- Username unavailable only if normalization collides unexpectedly.
- Insufficient balance.
- Bid too low.
- Auction expired.
- Auction already sold.
- Seller cannot bid on own auction.
- Invalid item price inputs.

The UI should show these as concise inline messages or toast notifications.

## Testing Strategy

Service tests should cover:

- New user receives 1,000,000 coins once.
- Bid debits bidder wallet.
- Outbid user is refunded.
- Buyout refunds current bidder and credits seller.
- Expired auction with bids credits seller exactly once.
- Expired auction without bids marks expired.
- Two simultaneous bids cannot both win.
- Buyout and bid racing cannot both settle the auction.

End-to-end tests should cover:

- Create username, view seeded auctions, place bid.
- Create listing and see it in active feed.
- Buy out an auction and verify balance/history changes.

## Implementation Priority

The first implementation should prioritize the core transaction services and a straightforward UI over visual polish. The database and service boundaries should be designed so later game features, such as inventory, item rarity, player stats, and richer item detail pages, can be added without rewriting auction settlement.
