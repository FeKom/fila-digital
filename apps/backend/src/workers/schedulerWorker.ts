import { Job, Worker } from "bullmq";
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

// Escopo de módulo para que o graceful shutdown consiga fechá-lo.
let schedulerWorker: Worker | null = null;

export async function startBullMQSchedulers() {
  schedulerWorker = createSchedulerWorker(processSchedulerJob);
  if (!schedulerWorker) return false;

  await registerRepeatableJobs();
  logger.info("[BullMQ] Scheduler worker started");
  return true;
}

/**
 * Encerra o worker drenando os jobs em execução.
 *
 * `close()` espera o job corrente terminar antes de resolver — sem isso um
 * rolling update abandonaria um auto-close no meio, e a fila ficaria num
 * estado que só o próximo ciclo de uma hora corrigiria.
 */
export async function closeSchedulers(): Promise<void> {
  if (!schedulerWorker) return;

  await schedulerWorker.close();
  schedulerWorker = null;
  logger.info("[BullMQ] Scheduler worker closed");
}
