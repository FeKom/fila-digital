import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("person")
    .addColumn("active", "boolean", (col) => col.notNull().defaultTo(true))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("person").dropColumn("active").execute();
}
