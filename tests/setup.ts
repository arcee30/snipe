import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const testDbPath = resolve(process.cwd(), "prisma/test.db");
const migrationsPath = resolve(process.cwd(), "prisma/migrations");

process.env.DATABASE_URL = "file:./test.db";

if (existsSync(testDbPath)) {
  rmSync(testDbPath);
}

for (const migration of readdirSync(migrationsPath).sort()) {
  const migrationPath = resolve(migrationsPath, migration, "migration.sql");
  execFileSync("sqlite3", [testDbPath, `.read ${migrationPath}`]);
}
