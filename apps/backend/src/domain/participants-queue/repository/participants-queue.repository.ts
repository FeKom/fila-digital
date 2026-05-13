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
): Promise<
  PageResult<
    ParticipantsQueue & { user_id: string | null; person_name: string | null }
  >
> => {
  let query = db
    .selectFrom("participants_queue as pq")
    .leftJoin("person as p", "p.id", "pq.person_id")
    .select([
      "pq.id",
      "pq.queue_id",
      "pq.person_id as user_id",
      "pq.anonymous_id",
      "pq.is_active",
      "pq.created_at",
      "p.name as person_name",
    ])
    .where("pq.queue_id", "=", queue_id)
    .where("pq.is_active", "=", true)
    .orderBy("pq.created_at", "asc")
    .limit(limit + 1);

  if (cursor) {
    query = query.where("pq.created_at", ">", new Date(cursor));
  }

  const rows = await query.execute();
  const page = buildPage(
    rows as unknown as ParticipantsQueue[],
    "created_at",
    limit
  );
  return page as unknown as PageResult<
    ParticipantsQueue & { user_id: string | null; person_name: string | null }
  >;
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

export const deleteAnonymousFromQueue = async (
  queue_id: string,
  anonymous_id: string
) => {
  return db
    .updateTable("participants_queue")
    .set({ is_active: false })
    .where("queue_id", "=", queue_id)
    .where("anonymous_id", "=", anonymous_id)
    .where("is_active", "=", true)
    .executeTakeFirst();
};

export const findAnonymousParticipantPosition = async (
  anonymous_id: string,
  queue_id: string
): Promise<number | null> => {
  const entry = await db
    .selectFrom("participants_queue")
    .select("created_at")
    .where("anonymous_id", "=", anonymous_id)
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!entry) return null;

  // Count participants who entered strictly before this one, then add 1.
  // Using strict < avoids the JS Date millisecond-truncation issue where
  // `<=` with a μs-precision DB timestamp would exclude the participant's own row.
  const result = await db
    .selectFrom("participants_queue")
    .select(db.fn.countAll<number>().as("ahead"))
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .where("created_at", "<", entry.created_at)
    .executeTakeFirstOrThrow();

  return Number(result.ahead) + 1;
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

export const dequeueParticipantById = async (id: string) => {
  return db
    .updateTable("participants_queue")
    .set({
      is_active: false,
      leave_reason: "served",
      called_at: sql<Date>`now()`,
    })
    .where("id", "=", id)
    .executeTakeFirst();
};

export const reactivateLastDequeued = async (
  queue_id: string,
  count: number
): Promise<Pick<ParticipantsQueue, "id" | "person_id">[]> => {
  return db.transaction().execute(async (trx) => {
    const participants = await trx
      .selectFrom("participants_queue")
      .select(["id", "person_id"])
      .where("queue_id", "=", queue_id)
      .where("is_active", "=", false)
      .where("leave_reason", "=", "served")
      .orderBy("called_at", "desc")
      .limit(count)
      .modifyEnd(sql`FOR UPDATE SKIP LOCKED`)
      .execute();

    if (participants.length === 0) return [];

    const ids = participants.map((p) => p.id);
    await trx
      .updateTable("participants_queue")
      .set({ is_active: true, leave_reason: null, called_at: null })
      .where("id", "in", ids)
      .execute();

    return participants;
  });
};

export const findUserQueuesByUserID = async (person_id: string) => {
  const rows = await db
    .selectFrom("participants_queue as pq")
    .innerJoin("queue as q", "q.id", "pq.queue_id")
    .innerJoin("commerce as c", "c.id", "q.commerce_id")
    .select([
      "pq.queue_id",
      "q.commerce_id",
      "q.name as queue_name",
      "c.name as commerce_name",
    ])
    .where("pq.person_id", "=", person_id)
    .where("pq.is_active", "=", true)
    .orderBy("pq.created_at", "asc")
    .execute();

  // Compute position for each row (queue_id is non-null here due to the join filter above)
  const withPosition = await Promise.all(
    rows.map(async (row) => {
      const pos = row.queue_id
        ? await findParticipantPosition(person_id, row.queue_id)
        : null;
      return { ...row, position: pos ?? 0 };
    })
  );

  return withPosition;
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
 * Returns the 1-indexed position of a participant in the queue.
 * Counts active entries created strictly before them, then adds 1.
 * Returns null if the participant is not currently in the queue.
 */
export const findParticipantPosition = async (
  person_id: string,
  queue_id: string
): Promise<number | null> => {
  const entry = await db
    .selectFrom("participants_queue")
    .select("created_at")
    .where("person_id", "=", person_id)
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!entry) return null;

  // Count participants who entered strictly before this one, then add 1.
  // Using strict < avoids the JS Date millisecond-truncation issue where
  // `<=` with a μs-precision DB timestamp would exclude the participant's own row.
  const result = await db
    .selectFrom("participants_queue")
    .select(db.fn.countAll<number>().as("ahead"))
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .where("created_at", "<", entry.created_at)
    .executeTakeFirstOrThrow();

  return Number(result.ahead) + 1;
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
export const claimAnonymousParticipations = async (
  anonymous_id: string,
  person_id: string
) => {
  return db
    .updateTable("participants_queue")
    .set({ person_id, anonymous_id: null })
    .where("anonymous_id", "=", anonymous_id)
    .where("is_active", "=", true)
    .execute();
};

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
      .set({
        is_active: false,
        leave_reason: "served",
        called_at: sql<Date>`now()`,
      })
      .where("id", "in", ids)
      .execute();

    return participants;
  });
};
