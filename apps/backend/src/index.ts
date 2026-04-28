// ── OpenTelemetry — must be first ─────────────────────────────────────────────
// This patches Node.js modules at load-time. Any import above this line
// will NOT be instrumented. Keep it as the very first line.
import "./infra/telemetry/tracer.js";

import { startAllSchedulers } from "./schedulers";
import { initServer } from "./server";
import cluster from "node:cluster";
import { availableParallelism } from "node:os";

if (cluster.isPrimary) {
  const numWorkers = availableParallelism();
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  cluster.on("exit", () => {
    cluster.fork(); // restart worker
  });
} else {
  initServer(); // cada worker roda o server
}
startAllSchedulers();
