import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS cube`.execute(db);
  await sql`CREATE EXTENSION IF NOT EXISTS earthdistance`.execute(db);

  await db.schema
    .alterTable("commerce")
    .addColumn("latitude", "decimal(10, 8)")
    .addColumn("longitude", "decimal(11, 8)")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("commerce")
    .dropColumn("latitude")
    .dropColumn("longitude")
    .execute();
}
