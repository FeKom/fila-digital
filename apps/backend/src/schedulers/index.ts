import { startBullMQSchedulers } from "../workers/schedulerWorker";
import { startQueueCleanupScheduler } from "./queueCleanup";
import { startQueueAutoCloseScheduler } from "./queueAutoClose";
import { startQueueAutoOpenScheduler } from "./queueAutoOpen";
import { logger } from "../utils/logger";

export const startAllSchedulers = async () => {
  // Caminho normal: BullMQ com repeatable jobs. O Redis deduplica por
  // name+pattern, então N réplicas registram os mesmos jobs e apenas um
  // worker os executa. Seguro com qualquer número de pods.
  const usingBullMQ = await startBullMQSchedulers();
  if (usingBullMQ) return;

  // Fallback in-process: node-cron roda dentro de CADA réplica. Com 2 pods,
  // auto-close, auto-open e cleanup disparariam duas vezes por hora sobre
  // filas reais — e o fallback ativa justamente quando o Redis caiu, ou seja,
  // é um caminho onde a falha pioraria a situação em vez de degradá-la.
  //
  // Por isso só liga onde o pod for explicitamente eleito líder. No k8s,
  // SCHEDULER_LEADER=true em exatamente um Deployment de 1 réplica.
  if (process.env.SCHEDULER_LEADER !== "true") {
    logger.warn(
      "[Schedulers] Redis indisponível e este pod não é líder — schedulers inativos"
    );
    return;
  }

  logger.warn(
    "[Schedulers] Redis indisponível — fallback para node-cron in-process (líder)"
  );
  startQueueCleanupScheduler();
  startQueueAutoCloseScheduler();
  startQueueAutoOpenScheduler();
};
