import { Job } from "bullmq";
import {
  closeExpiredQueues,
  openScheduledQueues,
  deactivateFiredOnceSchedules,
  deleteExpiredQueues,
} from "../domain/queue/repository/queue.repository";
import { logger } from "../utils/logger";
import { createSchedulerWorker, getSchedulerQueue } from "../infra/bullmq";

const HOURLY = "0 * * * *";

/** Register repeatable jobs once on startup — BullMQ deduplicates by name+pattern. */
async function registerRepeatableJobs() {
  const queue = getSchedulerQueue();
  if (!queue) return;

  const jobs: { name: string; pattern: string }[] = [
    { name: "auto-close", pattern: HOURLY },
    { name: "auto-open", pattern: HOURLY },
    { name: "cleanup", pattern: HOURLY },
  ];

  for (const { name, pattern } of jobs) {
    await queue.add(
      name,
      {},
      { repeat: { pattern }, jobId: `repeatable:${name}` }
    );
  }

  logger.info("[BullMQ] Repeatable scheduler jobs registered");
}

async function processSchedulerJob(job: Job) {
  switch (job.name) {
    case "auto-close": {
      const count = await closeExpiredQueues();
      logger.info({
        message: "[Queue AutoClose] Closed expired queues",
        count,
      });
      break;
    }
    case "auto-open": {
      const count = await openScheduledQueues();
      await deactivateFiredOnceSchedules();
      logger.info({
        message: "[Queue AutoOpen] Opened scheduled queues",
        count,
      });
      break;
    }
    case "cleanup": {
      const count = await deleteExpiredQueues();
      logger.info({ message: "[Queue Cleanup] Deleted expired queues", count });
      break;
    }
  }
}

export async function startBullMQSchedulers() {
  const worker = createSchedulerWorker(processSchedulerJob);
  if (!worker) return false;

  await registerRepeatableJobs();
  logger.info("[BullMQ] Scheduler worker started");
  return true;
}
