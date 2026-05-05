import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("participants_queue")
    .addColumn("called_at", "timestamp")
    .addColumn("leave_at", "timestamp")
    .addColumn("leave_reason", sql`varchar(20)`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("participants_queue")
    .dropColumn("called_at")
    .dropColumn("leave_at")
    .dropColumn("leave_reason")
    .execute();
}
