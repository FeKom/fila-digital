import { Kysely, sql } from "kysely";
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("person")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("email", "varchar", (col) => col.notNull())
    .addColumn("password", "varchar", (col) => col.notNull())
    .addColumn("phone", "varchar", (col) => col.notNull())
    .addColumn("commerce_id", "varchar")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("person").execute();
}
