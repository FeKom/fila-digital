import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>) {
  await sql`
    CREATE TABLE push_subscriptions (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      person_id   UUID        REFERENCES person(id) ON DELETE CASCADE,
      anonymous_id TEXT,
      endpoint    TEXT        NOT NULL UNIQUE,
      auth        TEXT        NOT NULL,
      p256dh      TEXT        NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_push_subscriptions_person
      ON push_subscriptions(person_id)
      WHERE person_id IS NOT NULL
  `.execute(db);

  await sql`
    CREATE INDEX idx_push_subscriptions_anon
      ON push_subscriptions(anonymous_id)
      WHERE anonymous_id IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>) {
  await sql`DROP TABLE IF EXISTS push_subscriptions`.execute(db);
}
