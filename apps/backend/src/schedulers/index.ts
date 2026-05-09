import { startQueueCleanupScheduler } from "./queueCleanup";
import { startQueueAutoCloseScheduler } from "./queueAutoClose";
import { startQueueAutoOpenScheduler } from "./queueAutoOpen";

export const startAllSchedulers = () => {
  startQueueCleanupScheduler();
  startQueueAutoCloseScheduler();
  startQueueAutoOpenScheduler();
};
