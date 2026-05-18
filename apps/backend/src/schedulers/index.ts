import { startBullMQSchedulers } from "../workers/schedulerWorker";
import { startQueueCleanupScheduler } from "./queueCleanup";
import { startQueueAutoCloseScheduler } from "./queueAutoClose";
import { startQueueAutoOpenScheduler } from "./queueAutoOpen";
import { logger } from "../utils/logger";

export const startAllSchedulers = async () => {
  const usingBullMQ = await startBullMQSchedulers();

  if (!usingBullMQ) {
    logger.warn(
      "[Schedulers] Redis not available — falling back to in-process node-cron"
    );
    startQueueCleanupScheduler();
    startQueueAutoCloseScheduler();
    startQueueAutoOpenScheduler();
  }
};
