import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("queue")
    .alterColumn("active", (col) => col.setDefault(sql`true`))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("queue")
    .alterColumn("active", (col) => col.dropDefault())
    .execute();
}
