import { NextResponse } from "next/server";
import { AdminAuthError, requireAdminUser } from "@/lib/admin";

export async function withAdmin<T>(
  handler: (admin: Awaited<ReturnType<typeof requireAdminUser>>) => Promise<T>
) {
  try {
    const admin = await requireAdminUser();
    return NextResponse.json(await handler(admin));
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin action failed" },
      { status: 400 }
    );
  }
}
