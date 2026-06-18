# Auction MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working auction marketplace MVP with username-only accounts, 1,000,000 starting coins, seeded bot auctions, one-hour listings, bids, buyout, balances, and history.

**Architecture:** Use a Next.js TypeScript app with a Prisma/PostgreSQL domain model. Keep auction correctness in server-side service functions that perform transactional bid, buyout, refund, and settlement updates; the UI calls API routes and treats the server as authoritative.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Zod, Vitest, Playwright, Socket.IO or polling-backed realtime refresh for the first MVP.

---

## File Structure

- `package.json`: scripts and dependencies.
- `next.config.ts`: Next.js config.
- `tsconfig.json`: TypeScript config.
- `postcss.config.mjs`: Tailwind/PostCSS config.
- `tailwind.config.ts`: Tailwind theme.
- `vitest.config.ts`: service test config.
- `prisma/schema.prisma`: database schema.
- `prisma/seed.ts`: bot users and seeded auctions.
- `src/lib/prisma.ts`: Prisma client singleton.
- `src/lib/session.ts`: username session cookie helpers.
- `src/lib/money.ts`: coin formatting and integer validation helpers.
- `src/lib/auction-errors.ts`: typed service errors.
- `src/services/users.ts`: create/resume username accounts.
- `src/services/auctions.ts`: auction creation, bid, buyout, close, feed queries.
- `src/app/api/session/route.ts`: create/resume account API.
- `src/app/api/auctions/route.ts`: list/create auction API.
- `src/app/api/auctions/[id]/bid/route.ts`: place bid API.
- `src/app/api/auctions/[id]/buyout/route.ts`: buyout API.
- `src/app/api/me/route.ts`: current user, wallet, history API.
- `src/app/layout.tsx`: app shell metadata.
- `src/app/page.tsx`: MVP client UI.
- `src/app/globals.css`: app styling.
- `tests/services/auction.test.ts`: transaction behavior tests.

## Task 1: Scaffold The App

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: Add project scripts and dependencies**

Create `package.json` with scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "prisma db seed"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install next react react-dom @prisma/client zod
npm install -D typescript @types/node @types/react @types/react-dom prisma tailwindcss postcss autoprefixer vitest tsx
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Add basic Next.js and Tailwind config**

Create the config files listed above with strict TypeScript, app router support, and Tailwind scanning `src/**/*.{ts,tsx}`.

- [ ] **Step 4: Verify scaffold**

Run:

```bash
npm run build
```

Expected: build succeeds or fails only because the app has not yet been fully implemented; fix config errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs tailwind.config.ts vitest.config.ts src/app/layout.tsx src/app/globals.css
git commit -m "chore: scaffold auction app"
```

## Task 2: Domain Model And Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/prisma.ts`
- Create: `.env.example`

- [ ] **Step 1: Define Prisma schema**

Add models for `User`, `Wallet`, `LedgerEntry`, `Item`, `Auction`, and `Bid`. Use integer coin amounts, unique usernames, and auction statuses `ACTIVE`, `SOLD`, `EXPIRED`, `SETTLED`.

- [ ] **Step 2: Add Prisma client singleton**

Create `src/lib/prisma.ts` exporting one reusable Prisma client instance.

- [ ] **Step 3: Add seed data**

Create bot users `VelocityVault`, `HarborHouse`, `ApexImports`, and `LuxeLiquidators`. Give each bot a wallet and create active one-hour auctions for seeded cars, houses, boats, and assets.

- [ ] **Step 4: Generate Prisma client**

Run:

```bash
npm run prisma:generate
```

Expected: Prisma client generation succeeds.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts src/lib/prisma.ts .env.example package.json package-lock.json
git commit -m "feat: add auction domain schema and seed data"
```

## Task 3: User And Auction Service Tests

**Files:**
- Create: `tests/services/auction.test.ts`
- Create: `src/lib/auction-errors.ts`
- Create: `src/lib/money.ts`
- Create: `src/services/users.ts`
- Create: `src/services/auctions.ts`

- [ ] **Step 1: Write failing tests**

Add Vitest tests covering:

```ts
it("creates a new username account with exactly 1,000,000 coins once", async () => {});
it("debits a bidder and records the highest bid", async () => {});
it("refunds the previous highest bidder when they are outbid", async () => {});
it("buyout refunds the current bidder, debits buyer, credits seller, and settles auction", async () => {});
it("closing an expired auction with a bid credits the seller exactly once", async () => {});
it("rejects a bid below the current price", async () => {});
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- tests/services/auction.test.ts
```

Expected: tests fail because service functions are not implemented.

- [ ] **Step 3: Implement user service**

Implement `createOrResumeUser(username)` with normalized username lookup, user creation, wallet creation, and a single starting bonus ledger entry.

- [ ] **Step 4: Implement auction services**

Implement `createAuction`, `placeBid`, `buyOutAuction`, `closeExpiredAuctions`, and query helpers. Use Prisma transactions. In production PostgreSQL, lock rows with transactional updates and status conditions before writing wallet/ledger changes.

- [ ] **Step 5: Run tests to verify green**

Run:

```bash
npm test -- tests/services/auction.test.ts
```

Expected: all service tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/services/auction.test.ts src/lib/auction-errors.ts src/lib/money.ts src/services/users.ts src/services/auctions.ts
git commit -m "feat: implement auction transaction services"
```

## Task 4: API Routes And MVP UI

**Files:**
- Create: `src/lib/session.ts`
- Create: `src/app/api/session/route.ts`
- Create: `src/app/api/auctions/route.ts`
- Create: `src/app/api/auctions/[id]/bid/route.ts`
- Create: `src/app/api/auctions/[id]/buyout/route.ts`
- Create: `src/app/api/me/route.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add username session helpers**

Use a signed or simple HTTP-only cookie for the MVP user id. The cookie is not production auth; it only resumes the local prototype account.

- [ ] **Step 2: Add API routes**

Expose:

```txt
POST /api/session
GET /api/me
GET /api/auctions
POST /api/auctions
POST /api/auctions/:id/bid
POST /api/auctions/:id/buyout
```

- [ ] **Step 3: Build client UI**

Implement one usable screen with username entry, wallet summary, active auction feed, create listing form, selected auction detail, bid form, buyout action, and transaction history.

- [ ] **Step 4: Verify API/UI manually**

Run:

```bash
npm run dev
```

Expected: app opens locally, a username can be created, seeded auctions show after seeding, bidding changes balances, and buyout settles an auction.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/app/api src/app/page.tsx src/app/globals.css
git commit -m "feat: add auction MVP API and UI"
```

## Task 5: Verification And Handoff

**Files:**
- Modify as needed from test/build failures.

- [ ] **Step 1: Run static checks**

Run:

```bash
npm run build
npm test
```

Expected: build and tests pass.

- [ ] **Step 2: Run seed and smoke test**

Run database migration and seed commands, start the dev server, and verify the app in browser.

- [ ] **Step 3: Fix defects**

Fix any failed tests, build errors, broken screens, or auction correctness bugs found during smoke testing.

- [ ] **Step 4: Final commit**

```bash
git status --short
git add .
git commit -m "chore: verify auction MVP"
```

Only create the final verification commit if there are actual verification fixes.

## Self-Review

- Spec coverage: username-only accounts, starting coins, seeded bot auctions, one-hour auctions, bids, buyout, wallet ledger, close logic, and transaction safety are covered.
- Placeholder scan: no implementation placeholders remain in the plan; each task identifies exact files and commands.
- Type consistency: service names match the design spec and API routes.
