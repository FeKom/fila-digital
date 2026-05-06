/* eslint-disable no-console */

import * as path from "path";
import { promises as fs } from "fs";
import { Kysely, Migrator, FileMigrationProvider } from "kysely";
import { Database } from "../types";
import { dialect } from "../connect";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

async function migrateToLatest() {
  const db = new Kysely<Database>({
    dialect,
  });

  // When bundled by tsup, this file may end up in a shared chunk at dist/,
  // making __dirname-relative paths unreliable. Instead, resolve from cwd
  // (always the apps/backend/ root) and pick the right subfolder based on
  // whether we're running compiled JS (dist/) or source via tsx (src/).
  const isDevMode = __filename.endsWith(".ts");
  const migrationFolder = path.join(
    process.cwd(),
    isDevMode
      ? "src/infra/database/migrations"
      : "dist/infra/database/migrations"
  );

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });

  const { error, results } = await migrator.migrateToLatest();
  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

export { migrateToLatest };

// Allow running directly: tsx src/infra/database/setup/runner-up.ts
// Detect if this file is the entry point (not imported as a module)
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("runner-up.ts") ||
    process.argv[1].endsWith("runner-up.js"));

if (isMain) {
  migrateToLatest();
}
