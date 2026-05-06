/* eslint-disable no-console */

import * as path from "path";
import { promises as fs } from "fs";
import { Kysely, Migrator, FileMigrationProvider } from "kysely";
import { Database } from "../types";
import { dialect } from "../connect";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateToLatest() {
  const db = new Kysely<Database>({
    dialect,
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(__dirname, "../migrations"),
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
