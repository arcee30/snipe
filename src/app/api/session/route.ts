import { NextResponse } from "next/server";
import { createOrResumeUser } from "@/services/users";
import { clearSessionUserId, setSessionUserId } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string };
    const username = body.username ?? "";
    const account = await createOrResumeUser(username);

    await setSessionUserId(account.user.id);

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create session" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  await clearSessionUserId();
  return NextResponse.json({ ok: true });
}
