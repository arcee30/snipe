import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ALLOWED_AMOUNTS = new Set([100_000, 500_000, 1_000_000, 2_500_000, 5_000_000]);

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const body = await request.json();
  const amount = Number(body.amount);

  if (!ALLOWED_AMOUNTS.has(amount)) {
    return NextResponse.json({ error: "Choose a valid credit pack" }, { status: 400 });
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
          type: "FREE_CREDIT_TOP_UP",
          description: `Free MVP credit top-up: ${amount} credits`
        }
      }
    }
  });

  return NextResponse.json({ wallet });
}
