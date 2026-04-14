import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("participants_queue")
    .addColumn("anonymous_id", "uuid")
    .addColumn("position", "integer")
    .execute();

  await sql`ALTER TABLE participants_queue ALTER COLUMN person_id DROP NOT NULL`.execute(
    db
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("participants_queue")
    .dropColumn("anonymous_id")
    .dropColumn("position")
    .execute();

  await sql`ALTER TABLE participants_queue ALTER COLUMN person_id SET NOT NULL`.execute(
    db
  );
}
