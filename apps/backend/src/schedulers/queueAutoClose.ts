import cron from "node-cron";
import { closeExpiredQueues } from "../domain/queue/repository/queue.repository";
import { logger } from "../utils/logger";

export const startQueueAutoCloseScheduler = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const count = await closeExpiredQueues();
      logger.info({
        message: "[Queue AutoClose] Closed expired queues",
        queuesClosd: count,
        timeStamp: new Date(),
      });
    } catch (error) {
      logger.error(`[Queue AutoClose] Failed: ${error}`);
    }
  });
};
