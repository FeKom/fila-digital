import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("participants_queue")
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true).notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("person").dropColumn("is_active").execute();
}
