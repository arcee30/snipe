import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notifyWalletCredit } from "@/services/notifications";

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const admin = await getAdminUser();

  if (!admin || admin.id !== userId) {
    return NextResponse.json(
      { error: "Daily rewards have replaced manual balance increases" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const amount = Number(body.amount);

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a positive whole-credit amount" }, { status: 400 });
  }

  const wallet = await prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({
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

    await notifyWalletCredit(tx, {
      userId,
      amount,
      reason: "account credit"
    });

    return updated;
  });

  return NextResponse.json({ wallet });
}
