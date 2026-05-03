import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("person")
    .addColumn("google_id", "varchar", (col) => col.defaultTo(null))
    .execute();

  await sql`
    CREATE INDEX person_google_id_idx ON person (google_id)
    WHERE google_id IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS person_google_id_idx`.execute(db);
  await db.schema.alterTable("person").dropColumn("google_id").execute();
}
