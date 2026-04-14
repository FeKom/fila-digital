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
