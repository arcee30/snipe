import { prisma } from "@/lib/prisma";
import { STARTING_BALANCE } from "@/lib/money";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

export async function createPasswordUser(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();

  if (!email.includes("@")) {
    throw new Error("Enter a valid email address");
  }

  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  if (displayName.length < 2) {
    throw new Error("Display name must be at least 2 characters");
  }

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    throw new Error("An account with that email already exists");
  }

  const username = await uniqueUsernameFromEmail(email);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      displayName,
      passwordHash: hashPassword(input.password),
      authProvider: "password"
    }
  });

  const wallet = await createStartingWallet(user.id);
  return { user, wallet };
}

export async function signInWithPassword(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { wallet: true }
  });

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }

  if (!user.wallet) {
    const wallet = await createStartingWallet(user.id);
    return { user, wallet };
  }

  return { user, wallet: user.wallet };
}

export async function createOrResumeGoogleUser(input: {
  googleId: string;
  email: string;
  displayName: string;
}) {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim() || email.split("@")[0];

  const existingByGoogleId = await prisma.user.findUnique({
    where: { googleId: input.googleId },
    include: { wallet: true }
  });

  if (existingByGoogleId) {
    if (!existingByGoogleId.wallet) {
      const wallet = await createStartingWallet(existingByGoogleId.id);
      return { user: existingByGoogleId, wallet };
    }

    return { user: existingByGoogleId, wallet: existingByGoogleId.wallet };
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    include: { wallet: true }
  });

  if (existingByEmail) {
    const user = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        googleId: input.googleId,
        displayName: existingByEmail.displayName ?? displayName,
        authProvider:
          existingByEmail.authProvider === "password" ? "password_google" : "google"
      }
    });

    if (!existingByEmail.wallet) {
      const wallet = await createStartingWallet(existingByEmail.id);
      return { user, wallet };
    }

    return { user, wallet: existingByEmail.wallet };
  }

  const user = await prisma.user.create({
    data: {
      username: await uniqueUsernameFromEmail(email),
      email,
      displayName,
      googleId: input.googleId,
      authProvider: "google"
    }
  });
  const wallet = await createStartingWallet(user.id);
  return { user, wallet };
}

async function createStartingWallet(userId: string) {
  return prisma.wallet.create({
    data: {
      userId,
      balance: STARTING_BALANCE,
      ledgerEntries: {
        create: {
          userId,
          amount: STARTING_BALANCE,
          type: "STARTING_BONUS",
          description: "Starting balance"
        }
      }
    }
  });
}

async function uniqueUsernameFromEmail(email: string) {
  const base = normalizeUsername(email.split("@")[0] || "user").replace(
    /[^a-z0-9_]/g,
    ""
  ) || "user";
  let username = base;
  let suffix = 1;

  while (await prisma.user.findUnique({ where: { username } })) {
    suffix += 1;
    username = `${base}${suffix}`;
  }

  return username;
}
