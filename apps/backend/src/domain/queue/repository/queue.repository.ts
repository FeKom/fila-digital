import { uuidv7 } from "uuidv7";
import { NewQueue } from "../../../infra/database/types";
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
    .executeTakeFirst();
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
