import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("commerce")
    .alterColumn("phone", (col) => col.dropNotNull())
    .execute();

  await db.schema
    .alterTable("commerce")
    .alterColumn("open_at", (col) => col.dropNotNull())
    .execute();

  await db.schema
    .alterTable("commerce")
    .alterColumn("closed_at", (col) => col.dropNotNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("commerce")
    .alterColumn("phone", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("commerce")
    .alterColumn("open_at", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("commerce")
    .alterColumn("closed_at", (col) => col.setNotNull())
    .execute();
}
