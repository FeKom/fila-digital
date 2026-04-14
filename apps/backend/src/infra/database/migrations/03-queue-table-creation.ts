import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("queue")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("commerce_id", "uuid", (col) =>
      col.references("commerce.id").onDelete("cascade").notNull()
    )
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("description", "varchar")
    .addColumn("type", "varchar(50)", (col) => col.notNull())
    .addColumn("status", "varchar(10)", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("active", "boolean", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("queue").execute();
}
