import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>) {
  await sql`
    CREATE TABLE queue_schedules (
      id TEXT PRIMARY KEY,
      queue_id TEXT NOT NULL REFERENCES queue(id) ON DELETE CASCADE,
      commerce_id TEXT NOT NULL REFERENCES commerce(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('once', 'daily')),
      scheduled_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`CREATE INDEX idx_queue_schedules_queue_id ON queue_schedules(queue_id)`.execute(
    db
  );
  await sql`CREATE INDEX idx_queue_schedules_status ON queue_schedules(status)`.execute(
    db
  );
}

export async function down(db: Kysely<unknown>) {
  await sql`DROP TABLE IF EXISTS queue_schedules`.execute(db);
}
