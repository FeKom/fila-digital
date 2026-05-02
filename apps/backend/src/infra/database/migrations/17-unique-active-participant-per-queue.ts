import { Kysely, sql } from "kysely";

/**
 * Adds a partial unique index on (queue_id, person_id) WHERE is_active = true.
 *
 * WHY: without this, two concurrent POST /enter-queue requests that both pass
 * the isUserInQueue check (TOCTOU race) can both insert, creating duplicate
 * active entries. The DB becomes the final enforcement point regardless of
 * application-level checks.
 *
 * A PARTIAL index (WHERE is_active = true) is used instead of a full unique
 * constraint so that a person can re-enter a queue after being removed
 * (is_active = false rows are excluded from uniqueness).
 *
 * Also adds a partial unique index for anonymous_id to prevent duplicate
 * anonymous entries via the QR code flow.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE UNIQUE INDEX idx_participants_queue_unique_active_person
    ON participants_queue (queue_id, person_id)
    WHERE is_active = true AND person_id IS NOT NULL
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX idx_participants_queue_unique_active_anonymous
    ON participants_queue (queue_id, anonymous_id)
    WHERE is_active = true AND anonymous_id IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_participants_queue_unique_active_person`.execute(
    db
  );
  await sql`DROP INDEX IF EXISTS idx_participants_queue_unique_active_anonymous`.execute(
    db
  );
}
