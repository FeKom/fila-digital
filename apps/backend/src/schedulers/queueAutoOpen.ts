import cron from "node-cron";
import {
  openScheduledQueues,
  deactivateFiredOnceSchedules,
} from "../domain/queue/repository/queue.repository";
import { logger } from "../utils/logger";

export const startQueueAutoOpenScheduler = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const count = await openScheduledQueues();
      await deactivateFiredOnceSchedules();
      logger.info({
        message: "[Queue AutoOpen] Opened scheduled queues",
        queuesOpened: count,
        timeStamp: new Date(),
      });
    } catch (error) {
      logger.error(`[Queue AutoOpen] Failed: ${error}`);
    }
  });
};
