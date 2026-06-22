import { NextResponse } from "next/server";
import { setSessionUserId } from "@/lib/session";
import { createPasswordUser, signInWithPassword } from "@/services/users";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mode = String(body.mode ?? "signin");
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");

    const account =
      mode === "signup"
        ? await createPasswordUser({
            email,
            password,
            displayName: String(body.displayName ?? "")
          })
        : await signInWithPassword(email, password);

    await setSessionUserId(account.user.id);

    return NextResponse.json({
      user: {
        id: account.user.id,
        username: account.user.username,
        email: account.user.email,
        displayName: account.user.displayName
      },
      wallet: account.wallet
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to authenticate"
      },
      { status: 400 }
    );
  }
}
