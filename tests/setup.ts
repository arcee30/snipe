import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const testDbPath = resolve(process.cwd(), "prisma/test.db");
const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/0001_init/migration.sql"
);

process.env.DATABASE_URL = "file:./test.db";

if (existsSync(testDbPath)) {
  rmSync(testDbPath);
}

execFileSync("sqlite3", [testDbPath, `.read ${migrationPath}`]);
