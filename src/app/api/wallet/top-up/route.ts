import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ALLOWED_AMOUNTS = new Set([
  500_000,
  1_000_000,
  5_000_000,
  25_000_000,
  100_000_000,
  500_000_000
]);

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const body = await request.json();
  const amount = Number(body.amount);

  if (!ALLOWED_AMOUNTS.has(amount)) {
    return NextResponse.json({ error: "Choose a valid balance increment" }, { status: 400 });
  }

  const wallet = await prisma.wallet.update({
    where: { userId },
    data: {
      balance: {
        increment: amount
      },
      ledgerEntries: {
        create: {
          userId,
          amount,
          type: "ACCOUNT_CREDIT_ADJUSTMENT",
          description: `Account credit adjustment: ${amount} credits`
        }
      }
    }
  });

  return NextResponse.json({ wallet });
}
