import { uuidv7 } from "uuidv7";
import {
  NewParticipantQueue,
  ParticipantsQueue,
} from "../../../infra/database/types";
import { db } from "../../../infra/database/connect";
import { sql } from "kysely";
import {
  buildPage,
  DEFAULT_PAGE_LIMIT,
  PageResult,
  PaginationParams,
} from "../../../utils/pagination";

export const enterQueue = async (data: Omit<NewParticipantQueue, "id">) => {
  const newParticipant = {
    ...data,
    id: uuidv7(),
  };

  return db
    .insertInto("participants_queue")
    .values(newParticipant)
    .returningAll()
    .execute();
};

export const findFirstParticipantsByQueueId = async (queue_id: string) => {
  return db
    .selectFrom("participants_queue")
    .selectAll()
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .orderBy("created_at", "asc")
    .limit(1)
    .executeTakeFirst();
};

export const findParticipantsByQueueId = async (
  queue_id: string,
  { cursor, limit = DEFAULT_PAGE_LIMIT }: PaginationParams = {}
): Promise<PageResult<ParticipantsQueue>> => {
  let query = db
    .selectFrom("participants_queue")
    .selectAll()
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .orderBy("created_at", "asc")
    .limit(limit + 1); // fetch one extra to detect hasMore

  if (cursor) {
    query = query.where("created_at", ">", new Date(cursor));
  }

  const rows = await query.execute();
  return buildPage(rows, "created_at", limit);
};

export const deleteParticipantsByQueueId = async (
  queue_id: string,
  person_id: string
) => {
  return db
    .deleteFrom("participants_queue")
    .where("queue_id", "=", queue_id)
    .where("person_id", "=", person_id)
    .executeTakeFirst();
};

export const softDeleteParticipantsByQueueId = async (
  queue_id: string,
  person_id: string,
  data: Record<string, boolean>
) => {
  return db
    .updateTable("participants_queue")
    .where("queue_id", "=", queue_id)
    .where("person_id", "=", person_id)
    .set(data)
    .executeTakeFirst();
};

export const findUserQueuesByUserID = async (person_id: string) => {
  return db
    .selectFrom("participants_queue")
    .select("queue_id")
    .where("person_id", "=", person_id)
    .execute();
};

export const isUserInQueue = async (person_id: string, queue_id: string) => {
  return db
    .selectFrom("participants_queue")
    .select("id")
    .where("person_id", "=", person_id)
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .limit(1)
    .executeTakeFirst();
};

export const isAnonymousInQueue = async (
  anonymous_id: string,
  queue_id: string
) => {
  return db
    .selectFrom("participants_queue")
    .select("id")
    .where("anonymous_id", "=", anonymous_id)
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .limit(1)
    .executeTakeFirst();
};

export const enterQueueByQrCode = async (data: {
  queue_id: string;
  person_id?: string;
  anonymous_id?: string;
}) => {
  const newParticipant = {
    id: uuidv7(),
    queue_id: data.queue_id,
    person_id: data.person_id ?? null,
    anonymous_id: data.anonymous_id ?? null,
    is_active: true,
  };

  return db
    .insertInto("participants_queue")
    .values(newParticipant)
    .returningAll()
    .executeTakeFirstOrThrow();
};

/**
 * Atomically dequeues the next `count` active participants from a queue.
 *
 * Uses a single database transaction so that concurrent calls never serve
 * the same participant twice:
 *   1. SELECT the first N active rows ordered by created_at (FIFO)
 *   2. UPDATE those exact rows to is_active = false in the same transaction
 *
 * Returns the participants that were removed (id + person_id only).
 * Returns an empty array when the queue has no active participants.
 */
export const softDeleteNextNParticipants = async (
  queue_id: string,
  count: number
): Promise<Pick<ParticipantsQueue, "id" | "person_id">[]> => {
  return db.transaction().execute(async (trx) => {
    // Lock the selected rows with FOR UPDATE SKIP LOCKED so that if two
    // requests race, each gets a distinct set of participants.
    const participants = await trx
      .selectFrom("participants_queue")
      .select(["id", "person_id"])
      .where("queue_id", "=", queue_id)
      .where("is_active", "=", true)
      .orderBy("created_at", "asc")
      .limit(count)
      .modifyEnd(sql`FOR UPDATE SKIP LOCKED`)
      .execute();

    if (participants.length === 0) return [];

    const ids = participants.map((p) => p.id);

    await trx
      .updateTable("participants_queue")
      .set({ is_active: false })
      .where("id", "in", ids)
      .execute();

    return participants;
  });
};
