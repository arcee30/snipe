import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export class AdminAuthError extends Error {
  constructor(message = "Admin access required") {
    super(message);
    this.name = "AdminAuthError";
  }
}

const FALLBACK_ADMIN_USERNAMES = new Set(["admin", "franklin", "daff", "deng"]);

function configuredSet(value?: string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function getAdminUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return null;
  }

  const adminUsernames = configuredSet(process.env.ADMIN_USERNAMES);
  const adminEmails = configuredSet(process.env.ADMIN_EMAILS);
  const username = user.username.toLowerCase();
  const email = user.email?.toLowerCase() ?? "";

  if (
    user.isAdmin ||
    adminUsernames.has(username) ||
    adminEmails.has(email) ||
    (adminUsernames.size === 0 && adminEmails.size === 0 && FALLBACK_ADMIN_USERNAMES.has(username))
  ) {
    return user;
  }

  return null;
}

export async function requireAdminUser() {
  const user = await getAdminUser();

  if (!user) {
    throw new AdminAuthError();
  }

  return user;
}
