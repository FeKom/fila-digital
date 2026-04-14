import { startQueueCleanupScheduler } from "./queueCleanup";

export const startAllSchedulers = () => {
  startQueueCleanupScheduler();
};
