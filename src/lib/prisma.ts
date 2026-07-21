import { PrismaClient } from "@prisma/client";
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function prepareVercelSqliteDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!process.env.VERCEL || !databaseUrl.startsWith("file:/tmp/")) {
    return;
  }

  const runtimeDatabasePath = databaseUrl.replace("file:", "");
  const seedDatabasePath = join(process.cwd(), "prisma", "vercel-seed.db");

  if (existsSync(runtimeDatabasePath) || !existsSync(seedDatabasePath)) {
    return;
  }

  mkdirSync(dirname(runtimeDatabasePath), { recursive: true });
  copyFileSync(seedDatabasePath, runtimeDatabasePath);
}

prepareVercelSqliteDatabase();

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
