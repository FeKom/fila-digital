// ── OpenTelemetry — must be first ─────────────────────────────────────────────
// This patches Node.js modules at load-time. Any import above this line
// will NOT be instrumented. Keep it as the very first line.
import "./infra/telemetry/tracer";

import { startAllSchedulers } from "./schedulers";
import { initServer } from "./server";
import { migrateToLatest } from "./infra/database/setup/runner-up";

async function main() {
  await migrateToLatest();
  await initServer();
  await startAllSchedulers();
}

main().catch((err) => {
  process.stderr.write(`Failed to start server: ${err}\n`);
  process.exit(1);
});
