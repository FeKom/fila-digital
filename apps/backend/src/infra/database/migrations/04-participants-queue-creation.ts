import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("participants_queue")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("person_id", "uuid", (col) =>
      col.references("person.id").onDelete("cascade").notNull()
    )
    .addColumn("queue_id", "uuid", (col) =>
      col.references("queue.id").onDelete("cascade").notNull()
    )
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("participants_queue").execute();
}
