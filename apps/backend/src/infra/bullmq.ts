import { Queue, Worker, type Processor } from "bullmq";
import { getRedisClient } from "./redis";
import { logger } from "../utils/logger";

export type SchedulerJobName = "auto-close" | "auto-open" | "cleanup";

let _schedulerQueue: Queue | null = null;

export function getSchedulerQueue(): Queue | null {
  const conn = getRedisClient();
  if (!conn) return null;

  if (!_schedulerQueue) {
    _schedulerQueue = new Queue("fila-schedulers", { connection: conn });
  }
  return _schedulerQueue;
}

export function createSchedulerWorker(processor: Processor): Worker | null {
  const conn = getRedisClient();
  if (!conn) return null;

  const worker = new Worker("fila-schedulers", processor, {
    connection: conn,
    concurrency: 1,
  });

  worker.on("completed", (job) =>
    logger.info(`[BullMQ] Job "${job.name}" completed`)
  );
  worker.on("failed", (job, err) =>
    logger.error(`[BullMQ] Job "${job?.name}" failed: ${err.message}`)
  );

  return worker;
}
