import { prisma } from "@/lib/prisma";
import { STARTING_BALANCE } from "@/lib/money";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function createOrResumeUser(username: string) {
  const normalized = normalizeUsername(username);

  if (normalized.length < 2) {
    throw new Error("Username must be at least 2 characters");
  }

  const existing = await prisma.user.findUnique({
    where: { username: normalized },
    include: { wallet: true }
  });

  if (existing) {
    if (!existing.wallet) {
      const wallet = await prisma.wallet.create({
        data: {
          userId: existing.id,
          balance: STARTING_BALANCE,
          ledgerEntries: {
            create: {
              userId: existing.id,
              amount: STARTING_BALANCE,
              type: "STARTING_BONUS",
              description: "Starting balance"
            }
          }
        }
      });

      return { user: existing, wallet };
    }

    return { user: existing, wallet: existing.wallet };
  }

  const user = await prisma.user.create({
    data: {
      username: normalized
    }
  });

  const wallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      balance: STARTING_BALANCE,
      ledgerEntries: {
        create: {
          userId: user.id,
          amount: STARTING_BALANCE,
          type: "STARTING_BONUS",
          description: "Starting balance"
        }
      }
    }
  });

  return { user, wallet };
}
