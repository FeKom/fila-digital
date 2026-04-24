import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("refresh_tokens")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("person_id", "uuid", (col) =>
      col.notNull().references("person.id").onDelete("cascade")
    )
    .addColumn("token_hash", "varchar(64)", (col) => col.notNull().unique())
    .addColumn("expires_at", "timestamp", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  await db.schema
    .createIndex("idx_refresh_tokens_person_id")
    .on("refresh_tokens")
    .column("person_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("refresh_tokens").execute();
}
