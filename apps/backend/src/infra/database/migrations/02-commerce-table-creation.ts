import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("commerce")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("description", "varchar")
    .addColumn("owner_id", "uuid", (col) =>
      col.references("person.id").onDelete("cascade")
    )
    .addColumn("phone", "varchar", (col) => col.notNull())
    .addColumn("document_id", "varchar", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("open_at", "time", (col) => col.notNull())
    .addColumn("closed_at", "time", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("commerce").execute();
}
