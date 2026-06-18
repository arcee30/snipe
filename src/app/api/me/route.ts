import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ user: null, wallet: null, ledger: [] });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  if (!user) {
    return NextResponse.json({ user: null, wallet: null, ledger: [] });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username
    },
    wallet: user.wallet,
    ledger: user.ledgerEntries
  });
}
