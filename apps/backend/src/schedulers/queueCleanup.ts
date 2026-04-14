import cron from "node-cron";
import { deleteExpiredQueues } from "../domain/queue/repository/queue.repository";
import { logger } from "../utils/logger";

export const startQueueCleanupScheduler = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const result = await deleteExpiredQueues();
      logger.info({
        message:
          "[Queue Cleanup] - Expired queues cleanup executed successfully",
        QueuesDeleted: result,
        timeStamp: new Date(),
      });
    } catch (error) {
      logger.error(
        `[Queue Cleanup] - Failed to load scheduler, error: ${error}`
      );
    }
  });
};
