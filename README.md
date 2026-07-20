# Snipe

Snipe is a full-stack luxury auction game built with Next.js, Prisma, and TypeScript. Users can browse limited-time auctions, bid or buy out high-value lots, manage a credit wallet, collect assets in a portfolio, review transaction history, and receive in-app notifications.

## Features

- Username/password and Google-style account flow scaffolding
- Live auction catalog with search, filtering, bids, buyouts, bot listings, and rotating inventory
- Wallet with daily reward streaks and portfolio rewards
- Portfolio page with owned assets, total value, and leaderboard
- Transaction history for purchases, losses, and auction outcomes
- Sell flow with image uploads and one-hour listings
- In-app notifications for important account and auction events
- Admin/moderation tools for listings, users, reports, and platform controls
- Prisma-backed data model with migrations and seed data

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- SQLite for local development
- Vitest

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Run Prisma migrations and seed data:

```bash
npx prisma migrate dev
npx prisma db seed
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run test
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Environment Variables

See `.env.example` for the expected variables:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `CONTACT_TO_EMAIL`
- `CONTACT_WEBHOOK_URL`
- `ADMIN_USERNAMES`
- `ADMIN_EMAILS`

## Hackathon Notes

Snipe was built iteratively with Codex across product design, frontend implementation, backend auction logic, database modeling, runtime optimization, and UI polish. Codex accelerated the build by helping convert product ideas into working features, debugging race-prone auction flows, expanding the asset catalog, and tightening the app into a coherent product experience.
