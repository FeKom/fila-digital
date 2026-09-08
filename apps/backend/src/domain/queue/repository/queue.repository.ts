import { uuidv7 } from "uuidv7";
import { Kysely, sql } from "kysely";
import { Database, NewQueue } from "../../../infra/database/types";
import { Queue } from "../type";
import { db } from "../../../infra/database/connect";
import { addHours } from "date-fns";

type QueueSnapshot = {
  id: string;
  status: "open" | "closed";
  [key: string]: unknown;
};

export const createQueue = async (queue: Queue) => {
  const queueToDb: NewQueue = {
    ...queue,
    id: uuidv7(),
    qrcode_token: uuidv7(),
  };
  return db
    .insertInto("queue")
    .values(queueToDb)
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const findQueueByCommerceId = async (commerce_id: string) => {
  return db
    .selectFrom("queue")
    .selectAll()
    .where("commerce_id", "=", commerce_id)
    .where("active", "=", true)
    .executeTakeFirst();
};

/**
 * Conta filas ATIVAS de um comercio. Existe porque o limite deixou de ser
 * booleano ("ja tem fila?") e passou a ser numerico, vindo do plano.
 */
export const countActiveQueuesByCommerceId = async (
  commerce_id: string
): Promise<number> => {
  const r = await db
    .selectFrom("queue")
    .select((eb) => eb.fn.countAll<string>().as("total"))
    .where("commerce_id", "=", commerce_id)
    .where("active", "=", true)
    .executeTakeFirst();
  return Number(r?.total ?? 0);
};

export const deleteExpiredQueues = async () => {
  const twelveHoursAgo = addHours(new Date(), -12);

  return db
    .deleteFrom("queue")
    .where("created_at", "<", twelveHoursAgo)
    .execute();
};

export const updateQueueById = async (
  id: string,
  data: Record<string, unknown>
) => {
  return db
    .updateTable("queue")
    .set(data)
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
};

export const findQueueById = async (commerce_id: string, id: string) => {
  return db
    .selectFrom("queue")
    .selectAll()
    .where("commerce_id", "=", commerce_id)
    .where("id", "=", id)
    .executeTakeFirst();
};

export const findQueueByIdOnly = async (id: string) => {
  return db
    .selectFrom("queue")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
};

export const closeExpiredQueues = async (
  dbOverride?: Kysely<Database>
): Promise<number> => {
  const target = dbOverride ?? db;
  const result = await sql`
    UPDATE queue
    SET status = 'closed', updated_at = NOW()
    FROM commerce
    WHERE queue.commerce_id = commerce.id
      AND queue.status = 'open'
      AND queue.active = true
      AND commerce.closed_at IS NOT NULL
      AND (NOW() AT TIME ZONE 'America/Sao_Paulo')::time > commerce.closed_at::time
  `.execute(target);
  return Number(result.numAffectedRows ?? 0);
};

export const openScheduledQueues = async (
  dbOverride?: Kysely<Database>
): Promise<number> => {
  const target = dbOverride ?? db;
  const result = await sql`
    UPDATE queue
    SET status = 'open', updated_at = NOW()
    FROM queue_schedules qs
    JOIN commerce c ON c.id = qs.commerce_id
    WHERE queue.id = qs.queue_id
      AND queue.status = 'closed'
      AND queue.active = true
      AND qs.status = 'active'
      AND (
        (qs.type = 'once' AND qs.scheduled_at <= NOW())
        OR (
          qs.type = 'daily'
          AND c.open_at IS NOT NULL
          AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Sao_Paulo'))::int
              = EXTRACT(HOUR FROM c.open_at::time)::int
        )
      )
  `.execute(target);
  return Number(result.numAffectedRows ?? 0);
};

export const deactivateFiredOnceSchedules = async (
  dbOverride?: Kysely<Database>
): Promise<void> => {
  const target = dbOverride ?? db;
  await sql`
    UPDATE queue_schedules
    SET status = 'inactive', updated_at = NOW()
    WHERE type = 'once'
      AND status = 'active'
      AND scheduled_at <= NOW()
  `.execute(target);
};

/**
 * Checks if the current time is past the commerce's closing time.
 * If so, marks the queue as closed and returns the updated queue.
 * `closed_at` is a TIME column returned as "HH:MM:SS" string by pg.
 */
export const autoCloseQueueIfExpired = async <T extends QueueSnapshot>(
  queue: T,
  closedAt: Date | null
): Promise<T> => {
  if (queue.status !== "open" || !closedAt) return queue;

  const now = new Date();
  const parts = String(closedAt).split(":");
  const closeTime = new Date(now);
  closeTime.setHours(Number(parts[0]), Number(parts[1]), 0, 0);

  if (now >= closeTime) {
    await updateQueueById(queue.id, { status: "closed" });
    return { ...queue, status: "closed" as const };
  }

  return queue;
};
